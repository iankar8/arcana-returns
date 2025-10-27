import { getDb } from '../db/index.js';
import { ReturnsService } from '../services/returns.js';
import { CommitRequest } from '../types/returns.js';
import { webhookRetryService } from './webhook-retry.js';

/**
 * Stripe Event Processor
 * Reconciles Stripe refund events to Return Tokens
 */

export class StripeProcessor {
  private returnsService: ReturnsService;
  
  constructor() {
    this.returnsService = new ReturnsService();
  }
  
  /**
   * Process all pending Stripe events
   */
  async processPendingEvents(): Promise<number> {
    const db = getDb();
    
    const events = db.prepare(`
      SELECT * FROM stripe_events 
      WHERE processed = 0 
      ORDER BY created_at ASC 
      LIMIT 50
    `).all() as any[];
    
    let processed = 0;
    
    for (const event of events) {
      try {
        // Wrap in retry logic
        await webhookRetryService.processWithRetry(
          event.event_id,
          'stripe',
          async () => {
            await this.processEvent(event);
          }
        );
        
        processed++;
      } catch (error: any) {
        console.error(`Failed to process Stripe event ${event.event_id} after all retries:`, error.message);
        // Event moved to DLQ by retry service
      }
    }
    
    return processed;
  }
  
  /**
   * Process a single Stripe event
   */
  private async processEvent(event: any): Promise<void> {
    const payload = JSON.parse(event.payload);
    const eventType = event.type;
    
    switch (eventType) {
      case 'charge.refunded':
        await this.handleChargeRefunded(payload, event.merchant_id);
        break;
        
      case 'refund.created':
        await this.handleRefundCreated(payload, event.merchant_id);
        break;
        
      case 'refund.updated':
        await this.handleRefundUpdated(payload, event.merchant_id);
        break;
        
      default:
        console.log(`Unhandled Stripe event type: ${eventType}`);
    }
  }
  
  /**
   * Handle charge.refunded event
   * Look for return_token_jti in metadata
   */
  private async handleChargeRefunded(stripeEvent: any, merchantId: string): Promise<void> {
    const charge = stripeEvent.data.object;
    const metadata = charge.metadata || {};
    
    console.log(`Charge refunded: ${charge.id}, amount: ${charge.amount_refunded}`);
    
    // Check if metadata contains return_token_jti
    const returnTokenJti = metadata.return_token_jti || metadata.arcana_token_jti;
    
    if (returnTokenJti) {
      await this.reconcileToReturnToken(returnTokenJti, charge, merchantId);
    } else {
      // Try to find token by charge ID or order ID
      await this.findAndReconcileToken(charge, merchantId);
    }
  }
  
  /**
   * Handle refund.created event
   */
  private async handleRefundCreated(stripeEvent: any, merchantId: string): Promise<void> {
    const refund = stripeEvent.data.object;
    const metadata = refund.metadata || {};
    
    console.log(`Refund created: ${refund.id}, amount: ${refund.amount}`);
    
    const returnTokenJti = metadata.return_token_jti || metadata.arcana_token_jti;
    
    if (returnTokenJti) {
      await this.reconcileToReturnToken(returnTokenJti, refund, merchantId);
    } else {
      // Try to get charge and reconcile
      const db = getDb();
      const chargeId = refund.charge;
      
      console.log(`Looking for return token via charge: ${chargeId}`);
      // Could query Stripe API for charge metadata here
    }
  }
  
  /**
   * Handle refund.updated event
   */
  private async handleRefundUpdated(stripeEvent: any, merchantId: string): Promise<void> {
    const refund = stripeEvent.data.object;
    
    console.log(`Refund updated: ${refund.id}, status: ${refund.status}`);
    
    // Log status changes (succeeded, failed, cancelled)
    if (refund.status === 'succeeded') {
      console.log(`Refund ${refund.id} succeeded`);
    } else if (refund.status === 'failed') {
      console.log(`Refund ${refund.id} failed: ${refund.failure_reason}`);
    }
  }
  
  /**
   * Reconcile Stripe event to a Return Token
   */
  private async reconcileToReturnToken(
    jti: string, 
    stripeObject: any, 
    merchantId: string
  ): Promise<void> {
    const db = getDb();
    
    // Find the return token
    const token = db.prepare(`
      SELECT jti, trace_id, order_id, revoked FROM return_tokens 
      WHERE jti = ? AND merchant_id = ?
    `).get(jti, merchantId) as any;
    
    if (!token) {
      console.log(`Return token ${jti} not found for reconciliation`);
      return;
    }
    
    console.log(`Reconciling Stripe event to return token ${jti}, trace: ${token.trace_id}`);
    
    // Check if token is already revoked (committed)
    if (token.revoked) {
      console.log(`Token ${jti} already committed`);
      return;
    }
    
    // Check if we have an authorization decision
    const decision = db.prepare(`
      SELECT decision_id, decision FROM decisions 
      WHERE return_token_jti = ? 
      ORDER BY created_at DESC 
      LIMIT 1
    `).get(jti) as any;
    
    if (!decision) {
      console.log(`No authorization decision found for token ${jti}`);
      return;
    }
    
    if (decision.decision !== 'approve') {
      console.log(`Token ${jti} was not approved (decision: ${decision.decision})`);
      return;
    }
    
    // Auto-commit the return since refund was processed
    console.log(`Auto-committing return for token ${jti} due to Stripe refund`);
    
    // Mark token as revoked (simulating commit)
    db.prepare(`
      UPDATE return_tokens 
      SET revoked = 1, revoked_at = ? 
      WHERE jti = ?
    `).run(new Date().toISOString(), jti);
    
    // Log the reconciliation
    db.prepare(`
      UPDATE stripe_events 
      SET trace_id = ? 
      WHERE event_id IN (
        SELECT event_id FROM stripe_events 
        WHERE merchant_id = ? AND payload LIKE ?
        LIMIT 1
      )
    `).run(token.trace_id, merchantId, `%${stripeObject.id}%`);
    
    console.log(`✓ Reconciled and committed return for trace ${token.trace_id}`);
  }
  
  /**
   * Find and reconcile token by charge/order metadata
   */
  private async findAndReconcileToken(charge: any, merchantId: string): Promise<void> {
    const db = getDb();
    
    // Try to find by order_id in metadata
    const orderId = charge.metadata?.order_id;
    
    if (!orderId) {
      console.log(`No order_id in charge metadata, cannot reconcile`);
      return;
    }
    
    // Find most recent token for this order
    const token = db.prepare(`
      SELECT jti, trace_id FROM return_tokens 
      WHERE order_id = ? AND merchant_id = ? AND revoked = 0
      ORDER BY issued_at DESC 
      LIMIT 1
    `).get(orderId, merchantId) as any;
    
    if (token) {
      console.log(`Found token ${token.jti} for order ${orderId}`);
      await this.reconcileToReturnToken(token.jti, charge, merchantId);
    } else {
      console.log(`No active return token found for order ${orderId}`);
    }
  }
}
