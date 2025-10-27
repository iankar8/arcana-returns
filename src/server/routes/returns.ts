import { FastifyInstance } from 'fastify';
import { ReturnsService } from '../../services/returns.js';
import { 
  TokenRequestSchema,
  AuthorizeRequestSchema,
  CommitRequestSchema 
} from '../../types/returns.js';
import { generateTraceId } from '../../types/common.js';
import { agentAuthMiddleware } from '../middleware/agent-auth.js';

const returnsService = new ReturnsService();

export async function returnsRoutes(server: FastifyInstance) {
  // Add trace ID and agent auth to all requests
  server.addHook('onRequest', async (request, reply) => {
    (request as any).trace_id = generateTraceId();
    // Verify agent attestation (if provided)
    await agentAuthMiddleware(request, reply);
  });
  
  /**
   * POST /returns/token - Issue Return Token (Step 1 of 3)
   * 
   * Generates a cryptographically signed JWT (Ed25519) containing:
   * - Policy snapshot hash (immutable binding)
   * - Items hash (tamper detection)
   * - Risk score (0-1, affects evidence requirements)
   * - Trace ID (for debugging/support)
   * 
   * The token:
   * - Expires in 15 minutes (TTL)
   * - Is one-time use (revoked after commit)
   * - Binds to specific policy version via hash
   * - Contains no PII (customer_ref is pseudonymous)
   * 
   * Risk Scoring:
   * - 0.0-0.3 (Low): Minimal evidence required
   * - 0.3-0.7 (Medium): Photo evidence required
   * - 0.7-1.0 (High): Enhanced verification (video, etc.)
   * 
   * @route POST /returns/token
   * @auth Required - Bearer token (API key)
   * @returns {TokenResponse} return_token, risk_score, required_evidence
   * 
   * @example Request
   * ```json
   * {
   *   "order_id": "ord_123",
   *   "customer_ref": "cust_456",
   *   "items": [{"sku": "SHIRT-M", "qty": 1, "price_cents": 2999}],
   *   "reason_code": "doesnt_fit",
   *   "policy_id": "plc_abc"
   * }
   * ```
   * 
   * @errors
   * - RT-001 (400): Malformed request payload
   * - POL-001 (404): Policy not found
   * - RT-003 (422): Items outside return window per policy
   * - AUTH-001 (401): Invalid/revoked API key
   * - RATE-001 (429): Rate limit exceeded
   */
  server.post('/token', async (request, reply) => {
    const body = TokenRequestSchema.parse(request.body);
    const result = await returnsService.issueToken(body, request.merchantId);
    return reply.send(result);
  });
  
  /**
   * POST /returns/authorize - Authorize Return (Step 2 of 3)
   * 
   * Authorizes a return after evidence collection. Makes final decision:
   * - approve: Return accepted, proceed to commit
   * - step_up: Additional evidence needed (see step_up_requirements)
   * - deny: Return rejected per policy rules
   * 
   * Decision Factors:
   * 1. Policy rules (window, exclusions, item classes)
   * 2. Evidence completeness (matches required_evidence)
   * 3. Risk score (higher = stricter requirements)
   * 4. Agent attestation (if agentic flow)
   * 
   * The decision is logged to AEL (Audit & Eval Ledger) with:
   * - Full BOM (Bill of Materials) for replay
   * - Explanations for transparency
   * - Immutable audit trail
   * 
   * @route POST /returns/authorize
   * @auth Required - Bearer token (API key)
   * @returns {AuthorizeResponse} decision, conditions, label_credential, audit_ref
   * 
   * @example Request
   * ```json
   * {
   *   "return_token": "rt.eyJ...",
   *   "evidence": [
   *     {"type": "photo_packaging", "url": "https://cdn.example.com/evidence.jpg"}
   *   ],
   *   "dropoff_choice": "mail_in"
   * }
   * ```
   * 
   * @errors
   * - RT-001 (400): Malformed request
   * - RT-007 (401): Invalid token signature
   * - RT-004 (410): Token expired (>15 min)
   * - RT-008 (422): Evidence incomplete
   * - RT-010 (409): Policy hash mismatch (policy changed)
   */
  server.post('/authorize', async (request, reply) => {
    const body = AuthorizeRequestSchema.parse(request.body);
    const result = await returnsService.authorize(body, request.merchantId);
    return reply.send(result);
  });
  
  /**
   * POST /returns/commit - Commit Return (Step 3 of 3)
   * 
   * Finalizes the return and issues refund instruction. This endpoint:
   * 1. Revokes the return token (prevents reuse)
   * 2. Generates final receipt
   * 3. Issues refund instruction to merchant
   * 4. Logs completion to AEL
   * 
   * Refund Instructions:
   * - instant: Issue refund immediately
   * - hold: Wait for physical inspection
   * - partial: Apply restocking fee (see conditions.restock_pct)
   * - deny: Do not issue refund (fraud detected, etc.)
   * 
   * Idempotency:
   * - Use Idempotency-Key header to prevent duplicate commits
   * - Same token committed twice returns RT-021 error
   * - Cached responses valid for 24 hours
   * 
   * Receipt Event:
   * - type: scan (carrier scanned), dropoff (customer dropped), received (merchant got it)
   * - ts: Used for refund timing decisions
   * - tracking_number: Optional verification
   * 
   * @route POST /returns/commit
   * @auth Required - Bearer token (API key)
   * @returns {CommitResponse} refund_instruction, final_receipt, audit_ref
   * 
   * @example Request
   * ```json
   * {
   *   "return_token": "rt.eyJ...",
   *   "receipt_event": {
   *     "type": "scan",
   *     "carrier": "UPS",
   *     "ts": "2025-10-26T10:00:00Z",
   *     "tracking_number": "1Z999AA10123456784"
   *   }
   * }
   * ```
   * 
   * @errors
   * - RT-001 (400): Malformed request
   * - RT-006 (404): Token not found
   * - RT-021 (409): Already committed (check idempotency)
   * - RT-004 (410): Token expired
   * - RT-011 (422): Not yet authorized (must call /authorize first)
   */
  server.post('/commit', async (request, reply) => {
    const body = CommitRequestSchema.parse(request.body);
    const result = await returnsService.commit(body, request.merchantId);
    return reply.send(result);
  });
}
