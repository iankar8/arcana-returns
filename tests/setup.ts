import { beforeAll, afterAll, afterEach } from 'vitest';
import { getDb, initDb } from '../src/db/index.js';
import { generateApiKey } from '../src/services/auth.js';
import fs from 'fs';
import path from 'path';

/**
 * Test Setup & Utilities
 * Provides test database, fixtures, and helpers
 */

// Test database path
const TEST_DB_PATH = './data/test.db';

// Test API key
export let TEST_API_KEY: string;
export let TEST_MERCHANT_ID = 'merchant_test';

beforeAll(async () => {
  // Remove existing test database
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
  
  // Set test database path
  process.env.DATABASE_PATH = TEST_DB_PATH;
  
  // Initialize test database
  initDb();
  
  // Create test API key
  const result = await generateApiKey(TEST_MERCHANT_ID, 'Test Key');
  TEST_API_KEY = result.apiKey;
  
  console.log('✓ Test database initialized');
});

afterAll(() => {
  // Clean up test database
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
});

afterEach(() => {
  // Clean up test data after each test
  const db = getDb();
  
  // Clear all tables except api_keys
  db.prepare('DELETE FROM decisions').run();
  db.prepare('DELETE FROM return_tokens').run();
  db.prepare('DELETE FROM policy_snapshots').run();
  db.prepare('DELETE FROM shopify_events').run();
  db.prepare('DELETE FROM stripe_events').run();
  db.prepare('DELETE FROM evidence').run();
  db.prepare('DELETE FROM idempotency_keys').run();
});

/**
 * Test Fixtures
 */

export const fixtures = {
  policy: {
    merchant_id: TEST_MERCHANT_ID,
    return_window_days: 30,
    restock_fee_pct: 0,
    allowed_channels: ['mail_in', 'in_store'],
    evidence: [
      { type: 'photo_packaging', required: false },
      { type: 'receipt', required: true },
    ],
    exclusions: ['final_sale', 'intimate_apparel'],
    item_classes: ['apparel', 'accessories'],
    geo_rules: [],
  },
  
  tokenRequest: {
    order_id: 'ord_test_001',
    customer_ref: 'cust_test_123',
    items: [
      {
        sku: 'SHIRT-M-BLUE',
        qty: 1,
        price_cents: 2999,
        name: 'Blue Shirt Medium',
      },
    ],
    reason_code: 'doesnt_fit',
  },
  
  authorizeRequest: {
    evidence: [
      {
        type: 'photo_packaging',
        url: 'https://example.com/photo.jpg',
      },
    ],
    dropoff_choice: 'mail_in',
  },
  
  commitRequest: {
    receipt_event: {
      type: 'scan',
      carrier: 'UPS',
      ts: new Date().toISOString(),
    },
  },
  
  shopifyOrder: {
    id: 123456789,
    order_number: 1001,
    email: 'customer@example.com',
    created_at: new Date().toISOString(),
    tags: 'return-requested',
    customer: {
      id: 987654321,
      email: 'customer@example.com',
    },
    line_items: [
      {
        id: 111111,
        variant_id: 222222,
        title: 'Blue Shirt',
        quantity: 1,
        price: '29.99',
        sku: 'SHIRT-M-BLUE',
        name: 'Blue Shirt - Medium',
      },
    ],
  },
  
  stripeRefund: {
    id: 're_test123',
    object: 'refund',
    amount: 2999,
    charge: 'ch_test456',
    created: Math.floor(Date.now() / 1000),
    currency: 'usd',
    status: 'succeeded',
    metadata: {
      order_id: 'ord_test_001',
      return_token_jti: 'jti_test',
    },
  },
};

/**
 * Helper to wait for async operations
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Helper to create a test policy
 */
export async function createTestPolicy(overrides = {}) {
  const db = getDb();
  const { createHash } = await import('crypto');
  
  const policy = { ...fixtures.policy, ...overrides };
  const policyId = `plc_test_${Date.now()}`;
  const snapshotId = `snap_${Date.now()}`;
  
  const content = JSON.stringify(policy);
  const hash = createHash('sha256').update(content).digest('hex');
  
  db.prepare(`
    INSERT INTO policy_snapshots (
      snapshot_id, policy_id, hash, effective_at,
      return_window_days, restock_fee_pct, allowed_channels,
      evidence, exclusions, item_classes, geo_rules,
      merchant_id, reviewed
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    snapshotId,
    policyId,
    hash,
    new Date().toISOString(),
    policy.return_window_days,
    policy.restock_fee_pct,
    JSON.stringify(policy.allowed_channels),
    JSON.stringify(policy.evidence),
    JSON.stringify(policy.exclusions),
    JSON.stringify(policy.item_classes),
    JSON.stringify(policy.geo_rules),
    policy.merchant_id,
    1
  );
  
  return { policyId, snapshotId, hash };
}
