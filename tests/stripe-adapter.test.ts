import { describe, it, expect, beforeEach } from 'vitest';
import { StripeProcessor } from '../src/services/stripe-processor.js';
import { getDb } from '../src/db/index.js';
import { TEST_MERCHANT_ID, fixtures, createTestPolicy } from './setup.js';

/**
 * Stripe Adapter Contract Tests
 * Tests refund reconciliation and metadata handling
 */

describe('Stripe Adapter', () => {
  let processor: StripeProcessor;
  let policyId: string;
  
  beforeEach(async () => {
    processor = new StripeProcessor();
    const policy = await createTestPolicy();
    policyId = policy.policyId;
  });
  
  describe('Webhook Event Storage', () => {
    it('should store refund created event', () => {
      const db = getDb();
      const eventId = `evt_${Date.now()}`;
      
      db.prepare(`
        INSERT INTO stripe_events (event_id, merchant_id, type, payload, processed)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        eventId,
        TEST_MERCHANT_ID,
        'refund.created',
        JSON.stringify({ data: { object: fixtures.stripeRefund } }),
        0
      );
      
      const event = db.prepare(`
        SELECT * FROM stripe_events WHERE event_id = ?
      `).get(eventId);
      
      expect(event).toBeTruthy();
      expect((event as any).type).toBe('refund.created');
    });
  });
  
  describe('Refund Reconciliation', () => {
    it('should reconcile refund to return token via metadata', async () => {
      const db = getDb();
      
      // Create return token and decision
      const tokenJti = `jti_${Date.now()}`;
      const traceId = `trace_${Date.now()}`;
      const decisionId = `dec_${Date.now()}`;
      
      db.prepare(`
        INSERT INTO return_tokens (
          jti, trace_id, merchant_id, order_id, customer_ref,
          items_hash, policy_snapshot_hash, risk_factors, risk_score,
          expires_at, revoked
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        tokenJti,
        traceId,
        TEST_MERCHANT_ID,
        'ord_test_001',
        'cust_test',
        'hash123',
        'policy_hash',
        '[]',
        0.3,
        new Date(Date.now() + 900000).toISOString(),
        0
      );
      
      db.prepare(`
        INSERT INTO decisions (
          decision_id, trace_id, merchant_id, return_token_jti,
          input_summary_hash, decision, risk_score, explanations
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        decisionId,
        traceId,
        TEST_MERCHANT_ID,
        tokenJti,
        'input_hash',
        'approve',
        0.3,
        '[]'
      );
      
      // Create Stripe refund event with metadata
      const eventId = `evt_${Date.now()}`;
      const refund = {
        ...fixtures.stripeRefund,
        metadata: {
          return_token_jti: tokenJti,
          order_id: 'ord_test_001',
        },
      };
      
      db.prepare(`
        INSERT INTO stripe_events (event_id, merchant_id, type, payload, processed)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        eventId,
        TEST_MERCHANT_ID,
        'refund.created',
        JSON.stringify({ data: { object: refund } }),
        0
      );
      
      // Process events
      await processor.processPendingEvents();
      
      // Token should be revoked (committed)
      const token = db.prepare(`
        SELECT * FROM return_tokens WHERE jti = ?
      `).get(tokenJti);
      
      expect((token as any).revoked).toBe(1);
      expect((token as any).revoked_at).toBeTruthy();
    });
    
    it('should find token by order_id when metadata missing', async () => {
      const db = getDb();
      
      // Create return token
      const tokenJti = `jti_${Date.now()}`;
      const orderId = 'ord_test_001';
      
      db.prepare(`
        INSERT INTO return_tokens (
          jti, trace_id, merchant_id, order_id, customer_ref,
          items_hash, policy_snapshot_hash, risk_factors, risk_score,
          expires_at, revoked
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        tokenJti,
        `trace_${Date.now()}`,
        TEST_MERCHANT_ID,
        orderId,
        'cust_test',
        'hash123',
        'policy_hash',
        '[]',
        0.3,
        new Date(Date.now() + 900000).toISOString(),
        0
      );
      
      // Create approved decision
      db.prepare(`
        INSERT INTO decisions (
          decision_id, trace_id, merchant_id, return_token_jti,
          input_summary_hash, decision, risk_score, explanations
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `dec_${Date.now()}`,
        `trace_${Date.now()}`,
        TEST_MERCHANT_ID,
        tokenJti,
        'input_hash',
        'approve',
        0.3,
        '[]'
      );
      
      // Refund without return_token_jti but with order_id
      const eventId = `evt_${Date.now()}`;
      const refund = {
        ...fixtures.stripeRefund,
        metadata: {
          order_id: orderId,
        },
      };
      
      db.prepare(`
        INSERT INTO stripe_events (event_id, merchant_id, type, payload, processed)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        eventId,
        TEST_MERCHANT_ID,
        'charge.refunded',
        JSON.stringify({ data: { object: refund } }),
        0
      );
      
      await processor.processPendingEvents();
      
      // Should still reconcile
      const event = db.prepare(`
        SELECT * FROM stripe_events WHERE event_id = ?
      `).get(eventId);
      
      expect((event as any).processed).toBe(1);
    });
    
    it('should not commit unapproved return', async () => {
      const db = getDb();
      
      // Create return token with denied decision
      const tokenJti = `jti_${Date.now()}`;
      
      db.prepare(`
        INSERT INTO return_tokens (
          jti, trace_id, merchant_id, order_id, customer_ref,
          items_hash, policy_snapshot_hash, risk_factors, risk_score,
          expires_at, revoked
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        tokenJti,
        `trace_${Date.now()}`,
        TEST_MERCHANT_ID,
        'ord_test_001',
        'cust_test',
        'hash123',
        'policy_hash',
        '[]',
        0.8,
        new Date(Date.now() + 900000).toISOString(),
        0
      );
      
      db.prepare(`
        INSERT INTO decisions (
          decision_id, trace_id, merchant_id, return_token_jti,
          input_summary_hash, decision, risk_score, explanations
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `dec_${Date.now()}`,
        `trace_${Date.now()}`,
        TEST_MERCHANT_ID,
        tokenJti,
        'input_hash',
        'deny',
        0.8,
        '[]'
      );
      
      // Refund event
      const eventId = `evt_${Date.now()}`;
      const refund = {
        ...fixtures.stripeRefund,
        metadata: { return_token_jti: tokenJti },
      };
      
      db.prepare(`
        INSERT INTO stripe_events (event_id, merchant_id, type, payload, processed)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        eventId,
        TEST_MERCHANT_ID,
        'refund.created',
        JSON.stringify({ data: { object: refund } }),
        0
      );
      
      await processor.processPendingEvents();
      
      // Token should NOT be revoked
      const token = db.prepare(`
        SELECT * FROM return_tokens WHERE jti = ?
      `).get(tokenJti);
      
      expect((token as any).revoked).toBe(0);
    });
  });
});
