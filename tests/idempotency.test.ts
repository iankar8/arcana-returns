import { describe, it, expect, beforeEach } from 'vitest';
import { initTestDb } from './setup.js';
import { getDb } from '../src/db/index.js';

describe('Idempotency Middleware', () => {
  beforeEach(() => {
    initTestDb();
  });

  it('should store idempotent responses', () => {
    const db = getDb();
    
    // Insert a test idempotency record
    db.prepare(`
      INSERT INTO idempotency_keys (
        id, key, merchant_id, endpoint, request_hash,
        response, status_code, headers, expires_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+24 hours'), datetime('now'))
    `).run(
      'idem_test123',
      'test-key-abc',
      'merchant_test',
      '/returns/token',
      'hash123',
      JSON.stringify({ return_token: 'tok_123', trace_id: 'trc_123' }),
      200,
      JSON.stringify({ 'content-type': 'application/json' })
    );
    
    // Retrieve the record
    const record = db.prepare(`
      SELECT * FROM idempotency_keys WHERE key = ?
    `).get('test-key-abc');
    
    expect(record).toBeDefined();
    expect(record.merchant_id).toBe('merchant_test');
    expect(record.status_code).toBe(200);
    
    const response = JSON.parse(record.response);
    expect(response.return_token).toBe('tok_123');
  });

  it('should not return expired idempotency records', () => {
    const db = getDb();
    
    // Insert an expired record
    db.prepare(`
      INSERT INTO idempotency_keys (
        id, key, merchant_id, endpoint, request_hash,
        response, status_code, headers, expires_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-1 hour'), datetime('now', '-2 hours'))
    `).run(
      'idem_expired',
      'expired-key',
      'merchant_test',
      '/returns/token',
      'hash456',
      JSON.stringify({ return_token: 'tok_old' }),
      200,
      '{}'
    );
    
    // Try to retrieve with expiry check
    const record = db.prepare(`
      SELECT * FROM idempotency_keys 
      WHERE key = ? AND expires_at > datetime('now')
    `).get('expired-key');
    
    expect(record).toBeUndefined();
  });

  it('should isolate idempotency keys by merchant', () => {
    const db = getDb();
    
    // Insert same key for two different merchants
    const key = 'shared-key';
    
    db.prepare(`
      INSERT INTO idempotency_keys (
        id, key, merchant_id, endpoint, request_hash,
        response, status_code, headers, expires_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+24 hours'), datetime('now'))
    `).run(
      'idem_m1',
      key,
      'merchant_1',
      '/returns/token',
      'hash1',
      JSON.stringify({ token: 'tok_m1' }),
      200,
      '{}'
    );
    
    db.prepare(`
      INSERT INTO idempotency_keys (
        id, key, merchant_id, endpoint, request_hash,
        response, status_code, headers, expires_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+24 hours'), datetime('now'))
    `).run(
      'idem_m2',
      key,
      'merchant_2',
      '/returns/token',
      'hash2',
      JSON.stringify({ token: 'tok_m2' }),
      200,
      '{}'
    );
    
    // Retrieve for merchant_1
    const record1 = db.prepare(`
      SELECT * FROM idempotency_keys 
      WHERE key = ? AND merchant_id = ?
    `).get(key, 'merchant_1');
    
    const response1 = JSON.parse(record1.response);
    expect(response1.token).toBe('tok_m1');
    
    // Retrieve for merchant_2
    const record2 = db.prepare(`
      SELECT * FROM idempotency_keys 
      WHERE key = ? AND merchant_id = ?
    `).get(key, 'merchant_2');
    
    const response2 = JSON.parse(record2.response);
    expect(response2.token).toBe('tok_m2');
  });

  it('should cleanup expired keys', () => {
    const db = getDb();
    
    // Insert expired and non-expired keys
    db.prepare(`
      INSERT INTO idempotency_keys (
        id, key, merchant_id, endpoint, request_hash,
        response, status_code, headers, expires_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-1 hour'), datetime('now'))
    `).run(
      'idem_expired1',
      'exp1',
      'merchant_test',
      '/returns/token',
      'hash1',
      '{}',
      200,
      '{}'
    );
    
    db.prepare(`
      INSERT INTO idempotency_keys (
        id, key, merchant_id, endpoint, request_hash,
        response, status_code, headers, expires_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+24 hours'), datetime('now'))
    `).run(
      'idem_valid',
      'valid1',
      'merchant_test',
      '/returns/token',
      'hash2',
      '{}',
      200,
      '{}'
    );
    
    // Count before cleanup
    const countBefore = db.prepare(`SELECT COUNT(*) as count FROM idempotency_keys`).get();
    expect(countBefore.count).toBe(2);
    
    // Cleanup expired
    const result = db.prepare(`
      DELETE FROM idempotency_keys WHERE expires_at < datetime('now')
    `).run();
    
    expect(result.changes).toBe(1);
    
    // Count after cleanup
    const countAfter = db.prepare(`SELECT COUNT(*) as count FROM idempotency_keys`).get();
    expect(countAfter.count).toBe(1);
    
    // Verify the valid one remains
    const remaining = db.prepare(`SELECT key FROM idempotency_keys`).get();
    expect(remaining.key).toBe('valid1');
  });
});
