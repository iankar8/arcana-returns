import { FastifyRequest, FastifyReply } from 'fastify';
import { createHash } from 'crypto';
import { getDb } from '../../db/index.js';
import { generateId } from '../../types/common.js';

/**
 * Idempotency middleware
 * 
 * Prevents duplicate requests from causing duplicate operations.
 * Uses Idempotency-Key header to cache responses for 24 hours.
 * 
 * Usage:
 * - Client sends: Idempotency-Key: uuid-or-unique-string
 * - First request: Processed normally, response cached
 * - Duplicate request: Cached response returned immediately
 * 
 * Per RFC: https://datatracker.ietf.org/doc/html/draft-ietf-httpapi-idempotency-key-header
 */

export interface IdempotencyRequest extends FastifyRequest {
  idempotencyKey?: string;
  idempotencyId?: string;
  merchantId: string;
}

export interface IdempotencyResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: any;
}

interface IdempotencyRecord {
  response: string;
  status_code: number;
  headers: string;
  created_at: string;
}

/**
 * Check for existing idempotent response
 */
export async function checkIdempotency(
  request: IdempotencyRequest,
  reply: FastifyReply
): Promise<boolean> {
  const idempotencyKey = request.headers['idempotency-key'] as string;
  
  // Idempotency is optional
  if (!idempotencyKey) {
    return false;
  }
  
  // Only for POST/PUT/PATCH
  if (!['POST', 'PUT', 'PATCH'].includes(request.method)) {
    return false;
  }
  
  const db = getDb();
  const merchantId = request.merchantId;
  const endpoint = request.url;
  
  // Look for existing response
  const existing = db.prepare(`
    SELECT response, status_code, headers, created_at
    FROM idempotency_keys
    WHERE key = ?
      AND merchant_id = ?
      AND endpoint = ?
      AND expires_at > datetime('now')
  `).get(idempotencyKey, merchantId, endpoint) as IdempotencyRecord | undefined;
  
  if (existing) {
    // Return cached response
    request.log.info({
      idempotency_key: idempotencyKey,
      merchant_id: merchantId,
      endpoint: endpoint,
      created_at: existing.created_at
    }, 'Returning cached idempotent response');
    
    // Parse stored headers
    const storedHeaders = existing.headers ? JSON.parse(existing.headers) : {};
    
    // Add idempotency replay header
    reply.header('X-Idempotency-Replay', 'true');
    reply.header('X-Idempotency-Created-At', existing.created_at);
    
    // Add original headers
    Object.entries(storedHeaders).forEach(([key, value]) => {
      if (!['content-length', 'transfer-encoding'].includes(key.toLowerCase())) {
        reply.header(key, value as string);
      }
    });
    
    reply.code(existing.status_code);
    reply.send(JSON.parse(existing.response));
    
    return true; // Indicates response was sent
  }
  
  // No existing response, attach key for storage after processing
  request.idempotencyKey = idempotencyKey;
  request.idempotencyId = generateId('idem');
  
  return false; // Continue processing
}

/**
 * Store idempotent response
 */
export async function storeIdempotentResponse(
  request: IdempotencyRequest,
  reply: FastifyReply,
  responseBody: any
): Promise<void> {
  if (!request.idempotencyKey) {
    return;
  }
  
  const db = getDb();
  const merchantId = request.merchantId;
  const endpoint = request.url;
  
  // Compute request hash for deduplication
  const requestBody = JSON.stringify((request as any).body || {});
  const requestHash = createHash('sha256')
    .update(requestBody)
    .digest('hex');
  
  // Store response with 24 hour expiry
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  
  // Get response headers to store
  const headers: Record<string, string> = {};
  const replyHeaders = reply.getHeaders();
  Object.entries(replyHeaders).forEach(([key, value]) => {
    if (typeof value === 'string') {
      headers[key] = value;
    } else if (Array.isArray(value)) {
      headers[key] = value[0];
    }
  });
  
  try {
    db.prepare(`
      INSERT INTO idempotency_keys (
        id, key, merchant_id, endpoint, request_hash,
        response, status_code, headers, expires_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      request.idempotencyId,
      request.idempotencyKey,
      merchantId,
      endpoint,
      requestHash,
      JSON.stringify(responseBody),
      reply.statusCode,
      JSON.stringify(headers),
      expiresAt
    );
    
    request.log.info({
      idempotency_key: request.idempotencyKey,
      idempotency_id: request.idempotencyId,
      merchant_id: merchantId,
      endpoint: endpoint,
      expires_at: expiresAt
    }, 'Stored idempotent response');
  } catch (error) {
    // Log but don't fail the request
    request.log.error({
      error,
      idempotency_key: request.idempotencyKey
    }, 'Failed to store idempotent response');
  }
}

/**
 * Cleanup expired idempotency keys
 * Run this periodically (e.g., daily)
 */
export function cleanupExpiredKeys(): number {
  const db = getDb();
  
  const result = db.prepare(`
    DELETE FROM idempotency_keys
    WHERE expires_at < datetime('now')
  `).run();
  
  return result.changes;
}

/**
 * Fastify plugin for idempotency
 */
export async function idempotencyPlugin(fastify: any) {
  // Add preHandler hook to check for cached responses
  fastify.addHook('preHandler', async (request: IdempotencyRequest, reply: FastifyReply) => {
    const cached = await checkIdempotency(request, reply);
    if (cached) {
      // Response already sent, stop processing
      return reply;
    }
  });
  
  // Add onSend hook to automatically store idempotent responses
  fastify.addHook('onSend', async (request: IdempotencyRequest, reply: FastifyReply, payload: any) => {
    // Only store successful responses (2xx status codes)
    if (reply.statusCode >= 200 && reply.statusCode < 300) {
      await storeIdempotentResponse(request, reply, payload);
    }
    return payload;
  });
}
