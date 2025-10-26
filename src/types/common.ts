import { z } from 'zod';

/**
 * Common types and error schemas
 */

export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.any()).optional(),
    trace_id: z.string().optional(),
  }),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

export class ArcanaError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ArcanaError';
  }
}

// Standard error codes
export const ErrorCodes = {
  // Token errors (RT-xxx)
  RT_001: 'RT-001', // Malformed payload
  RT_004: 'RT-004', // Expired token
  RT_007: 'RT-007', // Invalid signature
  RT_010: 'RT-010', // Policy hash mismatch
  RT_021: 'RT-021', // Idempotency conflict
  
  // Policy errors (POL-xxx)
  POL_001: 'POL-001', // Policy not found
  POL_002: 'POL-002', // Invalid policy format
  POL_003: 'POL-003', // Policy parse error
  
  // AEL errors (AEL-xxx)
  AEL_001: 'AEL-001', // Decision not found
  AEL_002: 'AEL-002', // Replay failed
  
  // Auth errors (AUTH-xxx)
  AUTH_001: 'AUTH-001', // Invalid API key
  AUTH_002: 'AUTH-002', // Unauthorized
  
  // Rate limit
  RATE_001: 'RATE-001', // Rate limit exceeded
} as const;

export interface TraceContext {
  trace_id: string;
  merchant_id: string;
  timestamp: string;
}

export function generateTraceId(): string {
  return `trc_${randomString(12)}`;
}

export function generateId(prefix: string): string {
  return `${prefix}_${randomString(12)}`;
}

function randomString(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function canonicalHash(data: any): Promise<string> {
  const crypto = await import('crypto');
  const canonical = JSON.stringify(data, Object.keys(data).sort());
  return 'sha256:' + crypto.createHash('sha256').update(canonical).digest('hex');
}
