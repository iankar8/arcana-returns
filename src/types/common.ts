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
  AUTH_003: 'AUTH-003', // Public key not found
  
  // Config errors (CONFIG-xxx)
  CONFIG_001: 'CONFIG-001', // Configuration missing
  
  // External service errors (EXT-xxx)
  EXT_001: 'EXT-001', // External service error
  
  // Attestation errors (ATT-xxx)
  ATT_001: 'ATT-001', // Invalid attestation format
  ATT_002: 'ATT-002', // Attestation verification failed
  
  // Evidence errors (EV-xxx)
  EV_001: 'EV-001', // Invalid URL protocol
  EV_002: 'EV-002', // Missing hostname
  EV_003: 'EV-003', // Invalid URL format
  EV_004: 'EV-004', // URL not accessible
  EV_005: 'EV-005', // Request timeout
  EV_006: 'EV-006', // Network error
  EV_007: 'EV-007', // Missing Content-Type
  EV_008: 'EV-008', // Unknown evidence type
  EV_009: 'EV-009', // Invalid content type
  EV_010: 'EV-010', // Could not verify content type
  EV_011: 'EV-011', // File too large
  EV_012: 'EV-012', // Image quality warning
  
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
