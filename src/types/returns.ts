import { z } from 'zod';

/**
 * Returns API schemas - token issuance, authorization, commit
 */

export const ReturnItemSchema = z.object({
  sku: z.string()
    .describe('Product SKU matching your catalog. Used for policy rule matching (e.g., electronics have different windows).'),
  qty: z.number().int().positive()
    .describe('Quantity to return. Must be ≤ original order quantity.'),
  price_cents: z.number().int().nonnegative()
    .describe('Unit price in cents (USD). Used for restocking fee calculation. Example: 2999 = $29.99'),
  name: z.string().optional()
    .describe('Optional human-readable product name for display purposes.'),
});

export type ReturnItem = z.infer<typeof ReturnItemSchema>;

export const TokenRequestSchema = z.object({
  order_id: z.string()
    .describe('Your internal order identifier. Must be unique per merchant. Example: ord_20251026_001'),
  customer_ref: z.string()
    .describe('Pseudonymous customer ID for fraud correlation. Do NOT use email/PII. Format: cust_[alphanumeric]'),
  items: z.array(ReturnItemSchema).min(1)
    .describe('Items being returned. Must contain at least 1 item. Each item validated against original order.'),
  reason_code: z.string()
    .describe('Return reason code. Valid: doesnt_fit, not_as_described, damaged, wrong_item, changed_mind, quality_issue, other'),
  device_fingerprint: z.string().optional()
    .describe('Optional device fingerprint for risk scoring. Use browser fingerprinting library (e.g., FingerprintJS).'),
  agent_headers: z.object({
    agent_id: z.string().optional()
      .describe('Optional agent identifier for agentic returns (e.g., shop-agent-v1).'),
    attestation: z.string().optional()
      .describe('Optional attestation string for agent verification. Format: urn:tap:claims:v1:...'),
    version: z.string().optional()
      .describe('Agent version string for compatibility tracking.'),
  }).optional()
    .describe('Optional agent headers for agentic/AI-driven return flows.'),
  policy_id: z.string()
    .describe('Target policy ID. Get via /policy/import or use existing policy. Format: plc_[alphanumeric]'),
});

export type TokenRequest = z.infer<typeof TokenRequestSchema>;

export const TokenResponseSchema = z.object({
  return_token: z.string()
    .describe('Signed JWT token (Ed25519). Pass to /returns/authorize and /returns/commit. TTL: 15 minutes, one-time use.'),
  risk_score: z.number().min(0).max(1)
    .describe('Risk score 0.0-1.0. Higher scores require more evidence. >0.7 may require video/enhanced verification.'),
  required_evidence: z.array(z.string())
    .describe('Evidence types required for authorization. Examples: photo_packaging, photo_product, receipt, video.'),
  policy_snapshot_hash: z.string()
    .describe('SHA-256 hash of policy snapshot. Immutable binding ensures policy consistency throughout return flow.'),
  trace_id: z.string()
    .describe('Request trace ID for debugging. Format: trc_[base62]. Include in support requests.'),
  expires_at: z.string().datetime()
    .describe('ISO 8601 timestamp when token expires. Typically 15 minutes from issuance.'),
});

export type TokenResponse = z.infer<typeof TokenResponseSchema>;

export const EvidenceSchema = z.object({
  type: z.string()
    .describe('Evidence type: photo_packaging, photo_product, photo_defect, receipt, or video.'),
  url: z.string().url()
    .describe('HTTPS URL to evidence file. Should use signed/temporary URLs for security. Max file size: 10MB.'),
  uploaded_at: z.string().datetime().optional()
    .describe('Optional ISO 8601 timestamp of evidence upload.'),
});

export type Evidence = z.infer<typeof EvidenceSchema>;

export const AuthorizeRequestSchema = z.object({
  return_token: z.string()
    .describe('Return token from /returns/token. Must be valid and not expired.'),
  evidence: z.array(EvidenceSchema)
    .describe('Array of evidence objects. Must include all types from required_evidence in token response.'),
  dropoff_choice: z.enum(['mail_in', 'drop_off', 'in_store']).optional()
    .describe('Optional customer preference for return method. Must be in policy allowed_channels.'),
});

export type AuthorizeRequest = z.infer<typeof AuthorizeRequestSchema>;

export const AuthorizeResponseSchema = z.object({
  decision: z.enum(['approve', 'step_up', 'deny'])
    .describe('Decision: approve (proceed to commit), step_up (more evidence needed), deny (rejected per policy).'),
  conditions: z.object({
    restock_pct: z.number().min(0).max(100)
      .describe('Restocking fee percentage (0-100). 0 = full refund, 20 = 80% refund.'),
    window: z.number().int().positive()
      .describe('Days remaining in return window at time of authorization.'),
  }).describe('Return conditions including fees and timing.'),
  label_credential: z.string().nullable()
    .describe('Shipping label credential/token. Null if customer ships independently. Use to generate prepaid label.'),
  explanations: z.array(z.string())
    .describe('Human-readable explanations for the decision. Useful for customer communication.'),
  audit_ref: z.string()
    .describe('AEL decision ID for audit trail. Format: dec_[alphanumeric]. Use for replay/debugging.'),
  step_up_requirements: z.array(z.string()).optional()
    .describe('Additional evidence required if decision is step_up. Examples: video, receipt, photo_defect.'),
});

export type AuthorizeResponse = z.infer<typeof AuthorizeResponseSchema>;

export const CommitRequestSchema = z.object({
  return_token: z.string()
    .describe('Return token from /returns/token. Must have been successfully authorized.'),
  receipt_event: z.object({
    type: z.enum(['scan', 'dropoff', 'received'])
      .describe('Event type: scan (carrier scanned), dropoff (customer dropped off), received (merchant received).'),
    carrier: z.string().optional()
      .describe('Carrier name if applicable. Examples: UPS, FedEx, USPS, DHL.'),
    ts: z.string().datetime()
      .describe('ISO 8601 timestamp of receipt event. Used for refund timing decisions.'),
    tracking_number: z.string().optional()
      .describe('Carrier tracking number if available. Used for verification and customer communication.'),
  }).describe('Receipt event indicating customer has shipped/returned the item.'),
});

export type CommitRequest = z.infer<typeof CommitRequestSchema>;

export const CommitResponseSchema = z.object({
  refund_instruction: z.enum(['hold', 'instant', 'partial', 'deny'])
    .describe('Refund instruction: instant (refund now), hold (wait for inspection), partial (apply restocking fee), deny (no refund).'),
  final_receipt: z.object({
    id: z.string()
      .describe('Final receipt ID. Format: rcp_[alphanumeric]. Store for reconciliation.'),
    refund_amount_cents: z.number().int().nonnegative().optional()
      .describe('Refund amount in cents if applicable. Accounts for restocking fees.'),
    refund_method: z.string().optional()
      .describe('Refund method: original_payment, store_credit, etc.'),
  }).describe('Final receipt details for the committed return.'),
  audit_ref: z.string()
    .describe('Final AEL audit reference. Use for compliance and debugging.'),
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
