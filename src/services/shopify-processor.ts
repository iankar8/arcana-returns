import { getDb } from '../db/index.js';
import { ReturnsService } from './returns.js';
import { TokenRequest } from '../types/returns.js';
import { generateId } from '../types/common.js';
import { webhookRetryService } from './webhook-retry.js';

/**
 * Shopify Event Processor
 * Processes stored Shopify webhook events and maps them to Returns API calls
 */

export class ShopifyProcessor {
  private returnsService: ReturnsService;
  
  constructor() {
    this.returnsService = new ReturnsService();
  }
  
  /**
   * Process all pending Shopify events
   */
  async processPendingEvents(): Promise<number> {
    const db = getDb();
    
    const events = db.prepare(`
      SELECT * FROM shopify_events 
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
          'shopify',
          async () => {
            await this.processEvent(event);
          }
        );
        
        processed++;
      } catch (error: any) {
        console.error(`Failed to process event ${event.event_id} after all retries:`, error.message);
        // Event moved to DLQ by retry service
      }
    }
    
    return processed;
  }
  
  /**
   * Process a single Shopify event
   */
  private async processEvent(event: any): Promise<void> {
    const payload = JSON.parse(event.payload);
    const topic = event.topic;
    
    switch (topic) {
      case 'orders/updated':
        await this.handleOrderUpdated(payload, event.merchant_id);
        break;
        
      case 'orders/cancelled':
        await this.handleOrderCancelled(payload, event.merchant_id);
        break;
        
      case 'refunds/create':
        await this.handleRefundCreated(payload, event.merchant_id);
        break;
        
      case 'fulfillments/create':
      case 'fulfillments/update':
        await this.handleFulfillmentEvent(payload, event.merchant_id);
        break;
        
      default:
        console.log(`Unhandled Shopify topic: ${topic}`);
    }
  }
  
  /**
   * Handle order updated event
   * Check if customer requested a return
   */
  private async handleOrderUpdated(order: any, merchantId: string): Promise<void> {
    // Check if order has return-related tags or notes
    const tags = (order.tags || '').toLowerCase();
    const note = (order.note || '').toLowerCase();
    
    if (tags.includes('return-requested') || note.includes('return')) {
      console.log(`Return detected for order ${order.id}`);
      
      // Auto-issue return token for first line item (simplified)
      if (order.line_items && order.line_items.length > 0) {
        const item = order.line_items[0];
        
        const tokenRequest: TokenRequest = {
          order_id: `shopify_${order.id}`,
          customer_ref: `shopify_customer_${order.customer?.id || 'unknown'}`,
          items: [{
            sku: item.sku || item.variant_id?.toString() || 'unknown',
            qty: item.quantity,
            price_cents: Math.round(parseFloat(item.price) * 100),
            name: item.name,
          }],
          reason_code: this.extractReasonCode(tags, note),
          policy_id: await this.getMerchantPolicyId(merchantId),
        };
        
        const result = await this.returnsService.issueToken(tokenRequest, merchantId);
        
        // Store trace_id in database for later reference
        const db = getDb();
        db.prepare(`
          UPDATE shopify_events 
          SET trace_id = ? 
          WHERE event_id IN (
            SELECT event_id FROM shopify_events 
            WHERE merchant_id = ? AND payload LIKE ?
            LIMIT 1
          )
        `).run(result.trace_id, merchantId, `%"id":${order.id}%`);
        
        console.log(`Issued return token for order ${order.id}, trace: ${result.trace_id}`);
      }
    }
  }
  
  /**
   * Handle order cancelled event
   */
  private async handleOrderCancelled(order: any, merchantId: string): Promise<void> {
    console.log(`Order ${order.id} cancelled - checking for active returns`);
    
    // Find any active return tokens for this order
    const db = getDb();
    const tokens = db.prepare(`
      SELECT jti, trace_id FROM return_tokens 
      WHERE order_id = ? AND merchant_id = ? AND revoked = 0
    `).all(`shopify_${order.id}`, merchantId) as any[];
    
    // Revoke tokens since order is cancelled
    for (const token of tokens) {
      db.prepare(`
        UPDATE return_tokens 
        SET revoked = 1, revoked_at = ? 
        WHERE jti = ?
      `).run(new Date().toISOString(), token.jti);
      
      console.log(`Revoked return token ${token.jti} for cancelled order`);
    }
  }
  
  /**
   * Handle refund created event
   */
  private async handleRefundCreated(refund: any, merchantId: string): Promise<void> {
    console.log(`Refund created for order ${refund.order_id}`);
    
    // Find the return token for this order
    const db = getDb();
    const token = db.prepare(`
      SELECT jti, trace_id FROM return_tokens 
      WHERE order_id = ? AND merchant_id = ? 
      ORDER BY issued_at DESC 
      LIMIT 1
    `).get(`shopify_${refund.order_id}`, merchantId) as any;
    
    if (token && !token.revoked) {
      // Log the refund event (could trigger commit if not already done)
      console.log(`Refund reconciled to trace ${token.trace_id}`);
    }
  }
  
  /**
   * Handle fulfillment events
   * Could trigger commit when package is shipped
   */
  private async handleFulfillmentEvent(fulfillment: any, merchantId: string): Promise<void> {
    console.log(`Fulfillment event for order ${fulfillment.order_id}`);
    
    // Check if this is a return shipment (tracking number present)
    if (fulfillment.tracking_number) {
      const db = getDb();
      const token = db.prepare(`
        SELECT jti, trace_id FROM return_tokens 
        WHERE order_id = ? AND merchant_id = ? AND revoked = 0
        ORDER BY issued_at DESC 
        LIMIT 1
      `).get(`shopify_${fulfillment.order_id}`, merchantId) as any;
      
      if (token) {
        console.log(`Return shipment detected: ${fulfillment.tracking_number}`);
        // Could auto-commit here when tracking shows delivery
      }
    }
  }
  
  /**
   * Extract reason code from tags/notes
   */
  private extractReasonCode(tags: string, note: string): string {
    const text = `${tags} ${note}`.toLowerCase();
    
    if (text.includes('doesnt fit') || text.includes('size')) return 'doesnt_fit';
    if (text.includes('defective') || text.includes('broken')) return 'defective';
    if (text.includes('wrong item')) return 'wrong_item';
    if (text.includes('not as described')) return 'not_as_described';
    if (text.includes('changed mind')) return 'changed_mind';
    
    return 'other';
  }
  
  /**
   * Get merchant's default policy ID
   */
  private async getMerchantPolicyId(merchantId: string): Promise<string> {
    const db = getDb();
    const policy = db.prepare(`
      SELECT policy_id FROM policy_snapshots 
      WHERE merchant_id = ? 
      ORDER BY created_at DESC 
      LIMIT 1
    `).get(merchantId) as any;
    
    return policy?.policy_id || 'plc_default';
  }
}
