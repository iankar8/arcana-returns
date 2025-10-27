import { getDb } from '../db/index.js';
import { 
  Decision,
  DecisionBOM,
  ReplayArtifact,
  DiffReport,
  AELDecisionResponse 
} from '../types/ael.js';
import { ArcanaError, ErrorCodes, generateId } from '../types/common.js';

/**
 * AEL-lite (Arcana Eval & Version Ledger)
 * Append-only decision ledger with replay capability
 */

export class AELService {
  /**
   * Get decision with BOM
   */
  getDecision(decisionId: string): AELDecisionResponse | null {
    const db = getDb();
    
    const decisionRow = db.prepare('SELECT * FROM decisions WHERE decision_id = ?').get(decisionId);
    if (!decisionRow) return null;
    
    const bomRow = db.prepare('SELECT * FROM decision_bom WHERE decision_id = ?').get(decisionId);
    if (!bomRow) return null;
    
    const decision = this.rowToDecision(decisionRow as any);
    const bom = this.rowToBOM(bomRow as any);
    
    return { decision, bom };
  }
  
  /**
   * Generate replay pack for a decision
   */
  async generateReplay(decisionId: string): Promise<string> {
    const db = getDb();
    
    const decisionData = this.getDecision(decisionId);
    if (!decisionData) {
      throw new ArcanaError(ErrorCodes.AEL_001, 'Decision not found', 404);
    }
    
    const replayId = generateId('rpl');
    
    // Get token data for inputs
    const tokenRow = db.prepare(`
      SELECT * FROM return_tokens WHERE jti = ?
    `).get(decisionData.decision.return_token_jti);
    
    // Get evidence
    const evidenceRows = db.prepare(`
      SELECT * FROM evidence WHERE trace_id = ?
    `).all(decisionData.decision.trace_id);
    
    const inputs = {
      token_claims: tokenRow,
      evidence: evidenceRows,
    };
    
    const outputs = {
      decision: decisionData.decision.output.decision,
      risk_score: decisionData.decision.output.risk_score,
      explanations: decisionData.decision.explanations,
    };
    
    const envLock = {
      model_hash: decisionData.bom.model_ref || 'n/a',
      tools_versions: this.parseToolRefs(decisionData.bom.tool_refs),
      policy_snapshot_hash: decisionData.bom.policy_snapshot_hash,
    };
    
    // Store replay artifact
    db.prepare(`
      INSERT INTO replay_artifacts (
        replay_id, decision_id, env_lock, inputs, outputs
      ) VALUES (?, ?, ?, ?, ?)
    `).run(
      replayId,
      decisionId,
      JSON.stringify(envLock),
      JSON.stringify(inputs),
      JSON.stringify(outputs)
    );
    
    return replayId;
  }
  
  /**
   * Get replay artifact
   */
  getReplay(replayId: string): ReplayArtifact | null {
    const db = getDb();
    
    const row = db.prepare('SELECT * FROM replay_artifacts WHERE replay_id = ?').get(replayId);
    if (!row) return null;
    
    const r = row as any;
    return {
      replay_id: r.replay_id,
      decision_id: r.decision_id,
      env_lock: JSON.parse(r.env_lock),
      inputs: JSON.parse(r.inputs),
      outputs: JSON.parse(r.outputs),
      created_at: r.created_at,
      bundle_url: r.bundle_url,
    };
  }
  
  /**
   * Compare two decisions (diff)
   */
  diffDecisions(baselineId: string, candidateId: string): DiffReport {
    const baseline = this.getDecision(baselineId);
    const candidate = this.getDecision(candidateId);
    
    if (!baseline || !candidate) {
      throw new ArcanaError(ErrorCodes.AEL_001, 'Decision not found', 404);
    }
    
    const changes = {
      decision_delta: {
        baseline: baseline.decision.output.decision,
        candidate: candidate.decision.output.decision,
        changed: baseline.decision.output.decision !== candidate.decision.output.decision,
      },
      rationale_delta: this.compareExplanations(
        baseline.decision.explanations,
        candidate.decision.explanations
      ),
    };
    
    return {
      baseline_decision_id: baselineId,
      candidate_decision_id: candidateId,
      baseline_env: {
        policy_hash: baseline.bom.policy_snapshot_hash,
        model_ref: baseline.bom.model_ref,
        code_version: baseline.bom.code_version,
      },
      candidate_env: {
        policy_hash: candidate.bom.policy_snapshot_hash,
        model_ref: candidate.bom.model_ref,
        code_version: candidate.bom.code_version,
      },
      changes,
      summary: changes.decision_delta.changed 
        ? `Decision changed: ${changes.decision_delta.baseline} → ${changes.decision_delta.candidate}`
        : 'No decision change',
    };
  }
  
  /**
   * List decisions for a merchant
   */
  listDecisions(merchantId: string, limit: number = 50): Decision[] {
    const db = getDb();
    
    const rows = db.prepare(`
      SELECT * FROM decisions 
      WHERE merchant_id = ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `).all(merchantId, limit);
    
    return rows.map(r => this.rowToDecision(r as any));
  }
  
  private rowToDecision(row: any): Decision {
    return {
      decision_id: row.decision_id,
      trace_id: row.trace_id,
      ts: row.created_at,
      merchant_id: row.merchant_id,
      return_token_jti: row.return_token_jti,
      input_summary_hash: row.input_summary_hash,
      output: {
        decision: row.decision,
        risk_score: row.risk_score,
      },
      explanations: JSON.parse(row.explanations),
      created_at: row.created_at,
    };
  }
  
  private rowToBOM(row: any): DecisionBOM {
    return {
      decision_id: row.decision_id,
      model_ref: row.model_ref,
      prompt_ref: row.prompt_ref,
      tool_refs: JSON.parse(row.tool_refs),
      corpus_snapshot_ref: row.corpus_snapshot_ref,
      policy_snapshot_hash: row.policy_snapshot_hash,
      code_version: row.code_version,
      env_snapshot: row.env_snapshot ? JSON.parse(row.env_snapshot) : undefined,
    };
  }
  
  private parseToolRefs(toolRefs: string[]): Record<string, string> {
    const versions: Record<string, string> = {};
    for (const ref of toolRefs) {
      versions[ref] = 'v1'; // Simplified
    }
    return versions;
  }
  
  private compareExplanations(baseline: string[], candidate: string[]): any[] {
    const deltas: any[] = [];
    
    const baselineSet = new Set(baseline);
    const candidateSet = new Set(candidate);
    
    for (const exp of baseline) {
      if (!candidateSet.has(exp)) {
        deltas.push({
          field: 'explanation',
          baseline_value: exp,
          candidate_value: null,
        });
      }
    }
    
    for (const exp of candidate) {
      if (!baselineSet.has(exp)) {
        deltas.push({
          field: 'explanation',
          baseline_value: null,
          candidate_value: exp,
        });
      }
    }
    
    return deltas;
  }
}
