import { z } from 'zod';

/**
 * AEL-lite (Arcana Eval & Version Ledger) schemas
 * Append-only decision ledger with replay capability
 */

export const DecisionSchema = z.object({
  decision_id: z.string()
    .describe('Unique decision identifier. Format: dec_[alphanumeric]. Used for replay and audit trail.'),
  trace_id: z.string()
    .describe('Request trace ID linking to original /returns/authorize call. Format: trc_[base62].'),
  ts: z.string().datetime()
    .describe('ISO 8601 timestamp when decision was made. Immutable, append-only.'),
  merchant_id: z.string()
    .describe('Merchant identifier for scoping. Ensures merchants only see their own decisions.'),
  return_token_jti: z.string()
    .describe('JWT ID (jti) from return token. Links decision to specific return request.'),
  input_summary_hash: z.string()
    .describe('SHA-256 hash of canonicalized inputs. Used for replay validation and deduplication.'),
  output: z.object({
    decision: z.enum(['approve', 'step_up', 'deny'])
      .describe('Final decision: approve, step_up (more evidence needed), or deny.'),
    risk_score: z.number()
      .describe('Risk score at time of decision (0.0-1.0). Stored for A/B testing and analysis.'),
  }).describe('Decision output containing final verdict and risk assessment.'),
  explanations: z.array(z.string())
    .describe('Human-readable explanations for decision. Examples: "Within window", "Evidence complete", "High risk".'),
  created_at: z.string().datetime()
    .describe('ISO 8601 timestamp when decision was persisted to AEL. May differ slightly from ts.'),
});

export type Decision = z.infer<typeof DecisionSchema>;

export const DecisionBOMSchema = z.object({
  decision_id: z.string()
    .describe('Decision ID this BOM applies to. One-to-one with Decision.'),
  model_ref: z.string().optional()
    .describe('AI model reference if used. Examples: gpt-4-0125-preview, claude-3-opus. Null for rule-based decisions.'),
  prompt_ref: z.string().optional()
    .describe('Prompt template hash/version if AI was used. Enables prompt tracking and A/B testing.'),
  tool_refs: z.array(z.string())
    .describe('External tools/services used. Examples: risk-scoring-v2, evidence-validator-v1.'),
  corpus_snapshot_ref: z.string().optional()
    .describe('RAG corpus version if retrieval was used. Tracks which knowledge base influenced decision.'),
  policy_snapshot_hash: z.string()
    .describe('SHA-256 hash of policy used. Immutable binding ensures replay uses same policy version.'),
  code_version: z.string()
    .describe('Git SHA or semantic version of decision logic. Example: a3f2c1b or v1.2.3.'),
  env_snapshot: z.record(z.string()).optional()
    .describe('Relevant environment variables at decision time. Excludes secrets. Example: {NODE_ENV: production}.'),
});

export type DecisionBOM = z.infer<typeof DecisionBOMSchema>;

export const ReplayArtifactSchema = z.object({
  replay_id: z.string()
    .describe('Unique replay artifact ID. Format: rpl_[alphanumeric]. References decision to replay.'),
  decision_id: z.string()
    .describe('Original decision ID being replayed. Links to Decision in AEL.'),
  env_lock: z.object({
    model_hash: z.string().optional()
      .describe('Hash of model weights if applicable. Ensures exact model version for replay.'),
    tools_versions: z.record(z.string())
      .describe('Exact versions of all tools used. Key: tool name, Value: version hash.'),
    policy_snapshot_hash: z.string()
      .describe('Policy hash from original decision. Replay uses this exact policy version.'),
  }).describe('Environment lock ensuring replay uses identical versions of all components.'),
  inputs: z.record(z.any())
    .describe('Canonicalized inputs to decision logic. Everything needed to reproduce decision.'),
  outputs: z.record(z.any())
    .describe('Outputs from original decision. Used for comparison after replay.'),
  created_at: z.string().datetime()
    .describe('ISO 8601 timestamp when replay artifact was generated.'),
  bundle_url: z.string().url().optional()
    .describe('Optional signed URL to downloadable replay bundle (ZIP/tar). Useful for offline analysis.'),
});

export type ReplayArtifact = z.infer<typeof ReplayArtifactSchema>;

export const DiffReportSchema = z.object({
  baseline_decision_id: z.string()
    .describe('Baseline decision ID (typically production/current behavior).'),
  candidate_decision_id: z.string()
    .describe('Candidate decision ID (typically new model/policy being tested).'),
  baseline_env: z.object({
    policy_hash: z.string()
      .describe('Policy hash used in baseline decision.'),
    model_ref: z.string().optional()
      .describe('Model version used in baseline. Null if rule-based.'),
    code_version: z.string()
      .describe('Code version (Git SHA) for baseline.'),
  }).describe('Environment snapshot for baseline decision.'),
  candidate_env: z.object({
    policy_hash: z.string()
      .describe('Policy hash used in candidate decision.'),
    model_ref: z.string().optional()
      .describe('Model version used in candidate. Null if rule-based.'),
    code_version: z.string()
      .describe('Code version (Git SHA) for candidate.'),
  }).describe('Environment snapshot for candidate decision.'),
  changes: z.object({
    decision_delta: z.object({
      baseline: z.string()
        .describe('Baseline decision: approve, step_up, or deny.'),
      candidate: z.string()
        .describe('Candidate decision: approve, step_up, or deny.'),
      changed: z.boolean()
        .describe('Whether decisions differ. True = regression or improvement detected.'),
    }).describe('High-level decision comparison.'),
    rationale_delta: z.array(z.object({
      field: z.string()
        .describe('Field that differs in rationale. Examples: risk_score, explanations, conditions.'),
      baseline_value: z.any()
        .describe('Value in baseline decision.'),
      candidate_value: z.any()
        .describe('Value in candidate decision.'),
    })).describe('Detailed field-by-field comparison of decision rationale.'),
  }).describe('Comprehensive comparison of decisions and their reasoning.'),
  summary: z.string()
    .describe('Human-readable summary of diff. Example: "Candidate approved while baseline denied due to lower risk threshold".'),
});

export type DiffReport = z.infer<typeof DiffReportSchema>;

export const AELDecisionResponseSchema = z.object({
  decision: DecisionSchema,
  bom: DecisionBOMSchema,
});

export type AELDecisionResponse = z.infer<typeof AELDecisionResponseSchema>;
