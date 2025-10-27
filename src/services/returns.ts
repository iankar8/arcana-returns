import { createHash } from 'crypto';
import { getDb } from '../db/index.js';
import { 
  TokenRequest, 
  TokenResponse,
  AuthorizeRequest,
  AuthorizeResponse,
  CommitRequest,
  CommitResponse,
  ReturnTokenClaims 
} from '../types/returns.js';
import { ArcanaError, ErrorCodes, generateId, generateTraceId } from '../types/common.js';
import { signReturnToken, verifyReturnToken } from './jwt.js';
import { PolicyService } from './policy.js';
import { evidenceValidator } from './evidence-validator.js';

/**
 * Returns API Service
 * Handles token issuance, authorization, and commit
 */

export class ReturnsService {
  private policyService: PolicyService;
  
  constructor() {
    this.policyService = new PolicyService();
  }
  
  /**
   * Issue a signed Return Token
   */
  async issueToken(request: TokenRequest, merchantId: string): Promise<TokenResponse> {
    const db = getDb();
    const traceId = generateTraceId();
    const jti = generateId('rt');
    
    // Get policy snapshot
    const policy = this.policyService.getPolicy(request.policy_id);
    if (!policy) {
      throw new ArcanaError(ErrorCodes.POL_001, 'Policy not found', 404);
    }
    
    // Compute items hash
    const itemsHash = this.computeItemsHash(request.items);
    
    // Calculate risk score (simplified - in production, use ML model)
    const riskScore = this.calculateRiskScore(request);
    
    // Determine required evidence based on risk
    const requiredEvidence = this.determineEvidence(riskScore, policy);
    
    // Determine risk factors
    const riskFactors: string[] = [];
    if (request.device_fingerprint && this.isNewDevice(request.device_fingerprint, merchantId)) {
      riskFactors.push('new_device');
    }
    if (request.reason_code === 'instant_refund_request') {
      riskFactors.push('instant_refund_request');
    }
    
    // Create token claims
    const expirySeconds = parseInt(process.env.JWT_EXPIRY_SECONDS || '900');
    const exp = Math.floor(Date.now() / 1000) + expirySeconds;
    
    const claims: ReturnTokenClaims = {
      iss: process.env.JWT_ISSUER || 'arcana',
      exp,
      jti,
      trace_id: traceId,
      order_id: request.order_id,
      items_hash: itemsHash,
      user_ref: request.customer_ref,
      policy_snapshot_hash: policy.hash,
      device_hash: request.device_fingerprint,
      agent_id: request.agent_headers?.agent_id,
      risk_factors: riskFactors,
      merchant_id: merchantId,
    };
    
    // Sign token
    const token = await signReturnToken(claims);
    
    // Store token record
    db.prepare(`
      INSERT INTO return_tokens (
        jti, trace_id, merchant_id, order_id, customer_ref,
        items_hash, policy_snapshot_hash, device_hash, agent_id,
        risk_factors, risk_score, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      jti,
      traceId,
      merchantId,
      request.order_id,
      request.customer_ref,
      itemsHash,
      policy.hash,
      request.device_fingerprint || null,
      request.agent_headers?.agent_id || null,
      JSON.stringify(riskFactors),
      riskScore,
      new Date(exp * 1000).toISOString()
    );
    
    return {
      return_token: token,
      risk_score: riskScore,
      required_evidence: requiredEvidence,
      policy_snapshot_hash: policy.hash,
      trace_id: traceId,
      expires_at: new Date(exp * 1000).toISOString(),
    };
  }
  
  /**
   * Authorize a return with evidence
   */
  async authorize(request: AuthorizeRequest, merchantId: string): Promise<AuthorizeResponse> {
    const db = getDb();
    
    // Verify token
    const claims = await verifyReturnToken(request.return_token);
    
    // Check merchant matches
    if (claims.merchant_id !== merchantId) {
      throw new ArcanaError(ErrorCodes.AUTH_002, 'Unauthorized', 403);
    }
    
    // Check if token is revoked
    const tokenRecord = db.prepare('SELECT revoked FROM return_tokens WHERE jti = ?').get(claims.jti);
    if (!tokenRecord || (tokenRecord as any).revoked) {
      throw new ArcanaError(ErrorCodes.RT_007, 'Token has been revoked', 401);
    }
    
    // Get policy
    const policy = this.policyService.getPolicyByHash(claims.policy_snapshot_hash);
    if (!policy) {
      throw new ArcanaError(ErrorCodes.RT_010, 'Policy hash mismatch', 400);
    }
    
    // Validate evidence if provided
    if (request.evidence && request.evidence.length > 0) {
      const validationResult = await evidenceValidator.validateEvidence(request.evidence as any);
      
      if (!validationResult.valid) {
        // Return detailed validation errors
        const errorMessages = validationResult.errors.map(e => `${e.field}: ${e.message}`).join('; ');
        throw new ArcanaError(
          validationResult.errors[0].code,
          `Evidence validation failed: ${errorMessages}`,
          400,
          {
            errors: validationResult.errors,
          }
        );
      }
    }
    
    // Store evidence
    for (const evidence of request.evidence) {
      db.prepare(`
        INSERT INTO evidence (evidence_id, trace_id, type, url)
        VALUES (?, ?, ?, ?)
      `).run(generateId('evd'), claims.trace_id, evidence.type, evidence.url);
    }
    
    // Make decision
    const decision = this.makeDecision(claims, request, policy);
    const auditRef = generateId('aud');
    
    // Log decision to AEL
    const decisionId = generateId('dec');
    const inputHash = createHash('sha256')
      .update(JSON.stringify({ claims, evidence: request.evidence }))
      .digest('hex');
    
    db.prepare(`
      INSERT INTO decisions (
        decision_id, trace_id, merchant_id, return_token_jti,
        input_summary_hash, decision, risk_score, explanations
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      decisionId,
      claims.trace_id,
      merchantId,
      claims.jti,
      'sha256:' + inputHash,
      decision.decision,
      decision.risk_score,
      JSON.stringify(decision.explanations)
    );
    
    // Log decision BOM
    db.prepare(`
      INSERT INTO decision_bom (
        decision_id, policy_snapshot_hash, code_version, tool_refs
      ) VALUES (?, ?, ?, ?)
    `).run(
      decisionId,
      policy.hash,
      process.env.CODE_VERSION || 'v0.1.0',
      JSON.stringify(['policy_engine_v1'])
    );
    
    return {
      decision: decision.decision,
      conditions: {
        restock_pct: policy.restock_fee_pct,
        window: policy.return_window_days,
      },
      label_credential: decision.decision === 'approve' ? generateId('lbl') : null,
      explanations: decision.explanations,
      audit_ref: auditRef,
      step_up_requirements: decision.decision === 'step_up' ? decision.step_up_requirements : undefined,
    };
  }
  
  /**
   * Commit a return and issue refund instruction
   */
  async commit(request: CommitRequest, merchantId: string): Promise<CommitResponse> {
    const db = getDb();
    
    // Verify token
    const claims = await verifyReturnToken(request.return_token);
    
    if (claims.merchant_id !== merchantId) {
      throw new ArcanaError(ErrorCodes.AUTH_002, 'Unauthorized', 403);
    }
    
    // Get latest decision for this token
    const decisionRow = db.prepare(`
      SELECT decision FROM decisions 
      WHERE return_token_jti = ? 
      ORDER BY created_at DESC 
      LIMIT 1
    `).get(claims.jti);
    
    if (!decisionRow) {
      throw new ArcanaError(ErrorCodes.AEL_001, 'No authorization decision found', 400);
    }
    
    const lastDecision = (decisionRow as any).decision;
    
    // Determine refund instruction
    let refundInstruction: 'hold' | 'instant' | 'partial' | 'deny';
    
    if (lastDecision === 'approve') {
      refundInstruction = 'instant';
    } else if (lastDecision === 'step_up') {
      refundInstruction = 'hold';
    } else {
      refundInstruction = 'deny';
    }
    
    // Revoke token (one-time use)
    db.prepare('UPDATE return_tokens SET revoked = 1, revoked_at = ? WHERE jti = ?')
      .run(new Date().toISOString(), claims.jti);
    
    const auditRef = generateId('aud');
    const receiptId = generateId('rcp');
    
    return {
      refund_instruction: refundInstruction,
      final_receipt: {
        id: receiptId,
      },
      audit_ref: auditRef,
    };
  }
  
  /**
   * Calculate risk score (simplified)
   */
  private calculateRiskScore(request: TokenRequest): number {
    let score = 0.1; // Base score
    
    // High-value items increase risk
    const totalValue = request.items.reduce((sum, item) => sum + item.price_cents * item.qty, 0);
    if (totalValue > 50000) score += 0.3; // > $500
    
    // Certain reason codes
    if (request.reason_code === 'not_as_described') score += 0.2;
    
    // New device
    if (request.device_fingerprint && !request.agent_headers?.agent_id) {
      score += 0.15;
    }
    
    return Math.min(score, 1.0);
  }
  
  /**
   * Determine required evidence based on risk
   */
  private determineEvidence(riskScore: number, policy: any): string[] {
    const evidence: string[] = [];
    
    if (riskScore > 0.3) {
      evidence.push('photo_packaging');
    }
    if (riskScore > 0.6) {
      evidence.push('photo_item');
    }
    
    return evidence.length > 0 ? evidence : policy.evidence || [];
  }
  
  /**
   * Make authorization decision
   */
  private makeDecision(claims: ReturnTokenClaims, request: AuthorizeRequest, policy: any) {
    const explanations: string[] = [];
    let decision: 'approve' | 'step_up' | 'deny' = 'approve';
    const stepUpRequirements: string[] = [];
    
    // Check if within return window (simplified - should check order date)
    explanations.push('within return window');
    
    // Check evidence requirements
    const requiredEvidence = this.determineEvidence(
      parseFloat(claims.risk_factors.length.toString()) * 0.2,
      policy
    );
    
    const providedTypes = request.evidence.map(e => e.type);
    const missingEvidence = requiredEvidence.filter(req => !providedTypes.includes(req));
    
    if (missingEvidence.length > 0) {
      decision = 'step_up';
      stepUpRequirements.push(...missingEvidence);
      explanations.push(`missing evidence: ${missingEvidence.join(', ')}`);
    }
    
    // High risk factors
    if (claims.risk_factors.length > 2) {
      decision = 'step_up';
      explanations.push('high risk factors detected');
    }
    
    return {
      decision,
      risk_score: claims.risk_factors.length * 0.2,
      explanations,
      step_up_requirements: stepUpRequirements,
    };
  }
  
  /**
   * Compute canonical hash of items
   */
  private computeItemsHash(items: any[]): string {
    const canonical = JSON.stringify(items.map(i => ({
      sku: i.sku,
      qty: i.qty,
      price_cents: i.price_cents,
    })).sort((a, b) => a.sku.localeCompare(b.sku)));
    
    return 'sha256:' + createHash('sha256').update(canonical).digest('hex');
  }
  
  /**
   * Check if device is new (simplified)
   */
  private isNewDevice(deviceHash: string, merchantId: string): boolean {
    const db = getDb();
    const existing = db.prepare(`
      SELECT COUNT(*) as count FROM return_tokens 
      WHERE device_hash = ? AND merchant_id = ?
    `).get(deviceHash, merchantId);
    
    return (existing as any).count === 0;
  }
}
