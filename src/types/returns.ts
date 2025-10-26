import { z } from 'zod';

/**
 * Returns API schemas - token issuance, authorization, commit
 */

export const ReturnItemSchema = z.object({
  sku: z.string(),
  qty: z.number().int().positive(),
  price_cents: z.number().int().nonnegative(),
  name: z.string().optional(),
});

export type ReturnItem = z.infer<typeof ReturnItemSchema>;

export const TokenRequestSchema = z.object({
  order_id: z.string(),
  customer_ref: z.string(),
  items: z.array(ReturnItemSchema).min(1),
  reason_code: z.string(),
  device_fingerprint: z.string().optional(),
  agent_headers: z.object({
    agent_id: z.string().optional(),
    attestation: z.string().optional(),
    version: z.string().optional(),
  }).optional(),
  policy_id: z.string(),
});

export type TokenRequest = z.infer<typeof TokenRequestSchema>;

export const TokenResponseSchema = z.object({
  return_token: z.string(),
  risk_score: z.number().min(0).max(1),
  required_evidence: z.array(z.string()),
  policy_snapshot_hash: z.string(),
  trace_id: z.string(),
  expires_at: z.string().datetime(),
});

export type TokenResponse = z.infer<typeof TokenResponseSchema>;

export const EvidenceSchema = z.object({
  type: z.string(),
  url: z.string().url(),
  uploaded_at: z.string().datetime().optional(),
});

export type Evidence = z.infer<typeof EvidenceSchema>;

export const AuthorizeRequestSchema = z.object({
  return_token: z.string(),
  evidence: z.array(EvidenceSchema),
  dropoff_choice: z.enum(['mail_in', 'drop_off', 'in_store']).optional(),
});

export type AuthorizeRequest = z.infer<typeof AuthorizeRequestSchema>;

export const AuthorizeResponseSchema = z.object({
  decision: z.enum(['approve', 'step_up', 'deny']),
  conditions: z.object({
    restock_pct: z.number().min(0).max(100),
    window: z.number().int().positive(),
  }),
  label_credential: z.string().nullable(),
  explanations: z.array(z.string()),
  audit_ref: z.string(),
  step_up_requirements: z.array(z.string()).optional(),
});

export type AuthorizeResponse = z.infer<typeof AuthorizeResponseSchema>;

export const CommitRequestSchema = z.object({
  return_token: z.string(),
  receipt_event: z.object({
    type: z.enum(['scan', 'dropoff', 'received']),
    carrier: z.string().optional(),
    ts: z.string().datetime(),
    tracking_number: z.string().optional(),
  }),
});

export type CommitRequest = z.infer<typeof CommitRequestSchema>;

export const CommitResponseSchema = z.object({
  refund_instruction: z.enum(['hold', 'instant', 'partial', 'deny']),
  final_receipt: z.object({
    id: z.string(),
    refund_amount_cents: z.number().int().nonnegative().optional(),
    refund_method: z.string().optional(),
  }),
  audit_ref: z.string(),
});

export type CommitResponse = z.infer<typeof CommitResponseSchema>;

/**
 * Return Token Claims (JWT payload)
 */
export interface ReturnTokenClaims {
  iss: string; // issuer
  exp: number; // expiry (unix timestamp)
  jti: string; // unique token ID
  trace_id: string;
  order_id: string;
  items_hash: string; // SHA-256 of canonicalized items
  user_ref: string;
  policy_snapshot_hash: string;
  device_hash?: string;
  agent_id?: string;
  risk_factors: string[];
  merchant_id: string;
}
