import { FastifyRequest, FastifyReply } from 'fastify';
import { createHash } from 'crypto';
import { getDb } from '../../db/index.js';
import { ArcanaError, ErrorCodes } from '../../types/common.js';

declare module 'fastify' {
  interface FastifyRequest {
    merchantId: string;
  }
}

/**
 * API Key authentication middleware
 */
export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ArcanaError(ErrorCodes.AUTH_001, 'Missing or invalid API key', 401);
  }
  
  const apiKey = authHeader.substring(7);
  const keyHash = 'sha256:' + createHash('sha256').update(apiKey).digest('hex');
  
  const db = getDb();
  const keyRecord = db.prepare(`
    SELECT merchant_id, revoked FROM api_keys WHERE key_hash = ?
  `).get(keyHash);
  
  if (!keyRecord || (keyRecord as any).revoked) {
    throw new ArcanaError(ErrorCodes.AUTH_001, 'Invalid or revoked API key', 401);
  }
  
  // Update last used timestamp
  db.prepare('UPDATE api_keys SET last_used_at = ? WHERE key_hash = ?')
    .run(new Date().toISOString(), keyHash);
  
  // Attach merchant ID to request
  request.merchantId = (keyRecord as any).merchant_id;
}
