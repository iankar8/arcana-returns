import { describe, it, expect, beforeEach } from 'vitest';
import { ShopifyProcessor } from '../src/services/shopify-processor.js';
import { getDb } from '../src/db/index.js';
import { TEST_MERCHANT_ID, fixtures, createTestPolicy, wait } from './setup.js';

/**
 * Shopify Adapter Contract Tests
 * Tests webhook processing and event mapping
 */

describe('Shopify Adapter', () => {
  let processor: ShopifyProcessor;
  let policyId: string;
  
  beforeEach(async () => {
    processor = new ShopifyProcessor();
    const policy = await createTestPolicy();
    policyId = policy.policyId;
  });
  
  describe('Webhook Event Storage', () => {
    it('should store order updated event', () => {
      const db = getDb();
      const eventId = `evt_${Date.now()}`;
      
      db.prepare(`
        INSERT INTO shopify_events (event_id, merchant_id, topic, payload, processed)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        eventId,
        TEST_MERCHANT_ID,
        'orders/updated',
        JSON.stringify(fixtures.shopifyOrder),
        0
      );
      
      const event = db.prepare(`
        SELECT * FROM shopify_events WHERE event_id = ?
      `).get(eventId);
      
      expect(event).toBeTruthy();
      expect((event as any).topic).toBe('orders/updated');
      expect((event as any).processed).toBe(0);
    });
  });
  
  describe('Event Processing', () => {
    it('should process order with return-requested tag', async () => {
      const db = getDb();
      const eventId = `evt_${Date.now()}`;
      
      // Store event
      db.prepare(`
        INSERT INTO shopify_events (event_id, merchant_id, topic, payload, processed)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        eventId,
        TEST_MERCHANT_ID,
        'orders/updated',
        JSON.stringify(fixtures.shopifyOrder),
        0
      );
      
      // Process events
      const count = await processor.processPendingEvents();
      
      expect(count).toBeGreaterThan(0);
      
      // Verify event marked as processed
      const event = db.prepare(`
        SELECT * FROM shopify_events WHERE event_id = ?
      `).get(eventId);
      
      expect((event as any).processed).toBe(1);
      expect((event as any).processed_at).toBeTruthy();
    });
    
    it('should create return token for return-requested order', async () => {
      const db = getDb();
      const eventId = `evt_${Date.now()}`;
      
      // Store event with return tag
      const order = {
        ...fixtures.shopifyOrder,
        tags: 'return-requested',
      };
      
      db.prepare(`
        INSERT INTO shopify_events (event_id, merchant_id, topic, payload, processed)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        eventId,
        TEST_MERCHANT_ID,
        'orders/updated',
        JSON.stringify(order),
        0
      );
      
      // Process
      await processor.processPendingEvents();
      
      // Check if return token was created
      const tokens = db.prepare(`
        SELECT * FROM return_tokens 
        WHERE order_id = ? AND merchant_id = ?
      `).all(`shopify_${order.id}`, TEST_MERCHANT_ID);
      
      expect(tokens.length).toBeGreaterThan(0);
    });
    
    it('should handle order cancelled event', async () => {
      const db = getDb();
      
      // First create a return token
      const tokenJti = `jti_${Date.now()}`;
      const orderId = `shopify_${fixtures.shopifyOrder.id}`;
      
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
      
      // Now process cancellation
      const eventId = `evt_${Date.now()}`;
      const cancelledOrder = {
        ...fixtures.shopifyOrder,
        cancelled_at: new Date().toISOString(),
      };
      
      db.prepare(`
        INSERT INTO shopify_events (event_id, merchant_id, topic, payload, processed)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        eventId,
        TEST_MERCHANT_ID,
        'orders/cancelled',
        JSON.stringify(cancelledOrder),
        0
      );
      
      await processor.processPendingEvents();
      
      // Token should be revoked
      const token = db.prepare(`
        SELECT * FROM return_tokens WHERE jti = ?
      `).get(tokenJti);
      
      expect((token as any).revoked).toBe(1);
    });
  });
  
  describe('Error Handling', () => {
    it('should handle malformed event payload', async () => {
      const db = getDb();
      const eventId = `evt_${Date.now()}`;
      
      // Store event with invalid JSON
      db.prepare(`
        INSERT INTO shopify_events (event_id, merchant_id, topic, payload, processed)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        eventId,
        TEST_MERCHANT_ID,
        'orders/updated',
        'invalid json',
        0
      );
      
      // Should not throw, just skip
      const count = await processor.processPendingEvents();
      
      // Event should remain unprocessed
      const event = db.prepare(`
        SELECT * FROM shopify_events WHERE event_id = ?
      `).get(eventId);
      
      expect((event as any).processed).toBe(0);
    });
  });
});
