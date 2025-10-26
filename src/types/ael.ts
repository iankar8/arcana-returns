import { z } from 'zod';

/**
 * AEL-lite (Arcana Eval & Version Ledger) schemas
 * Append-only decision ledger with replay capability
 */

export const DecisionSchema = z.object({
  decision_id: z.string(),
  trace_id: z.string(),
  ts: z.string().datetime(),
  merchant_id: z.string(),
  return_token_jti: z.string(),
  input_summary_hash: z.string(),
  output: z.object({
    decision: z.enum(['approve', 'step_up', 'deny']),
    risk_score: z.number(),
  }),
  explanations: z.array(z.string()),
  created_at: z.string().datetime(),
});

export type Decision = z.infer<typeof DecisionSchema>;

export const DecisionBOMSchema = z.object({
  decision_id: z.string(),
  model_ref: z.string().optional(), // e.g., "gpt-4-0125-preview"
  prompt_ref: z.string().optional(), // Hash or version of prompt template
  tool_refs: z.array(z.string()),
  corpus_snapshot_ref: z.string().optional(),
  policy_snapshot_hash: z.string(),
  code_version: z.string(), // Git SHA or version tag
  env_snapshot: z.record(z.string()).optional(), // Relevant env vars
});

export type DecisionBOM = z.infer<typeof DecisionBOMSchema>;

export const ReplayArtifactSchema = z.object({
  replay_id: z.string(),
  decision_id: z.string(),
  env_lock: z.object({
    model_hash: z.string().optional(),
    tools_versions: z.record(z.string()),
    policy_snapshot_hash: z.string(),
  }),
  inputs: z.record(z.any()),
  outputs: z.record(z.any()),
  created_at: z.string().datetime(),
  bundle_url: z.string().url().optional(),
});

export type ReplayArtifact = z.infer<typeof ReplayArtifactSchema>;

export const DiffReportSchema = z.object({
  baseline_decision_id: z.string(),
  candidate_decision_id: z.string(),
  baseline_env: z.object({
    policy_hash: z.string(),
    model_ref: z.string().optional(),
    code_version: z.string(),
  }),
  candidate_env: z.object({
    policy_hash: z.string(),
    model_ref: z.string().optional(),
    code_version: z.string(),
  }),
  changes: z.object({
    decision_delta: z.object({
      baseline: z.string(),
      candidate: z.string(),
      changed: z.boolean(),
    }),
    rationale_delta: z.array(z.object({
      field: z.string(),
      baseline_value: z.any(),
      candidate_value: z.any(),
    })),
  }),
  summary: z.string(),
});

export type DiffReport = z.infer<typeof DiffReportSchema>;

export const AELDecisionResponseSchema = z.object({
  decision: DecisionSchema,
  bom: DecisionBOMSchema,
});

export type AELDecisionResponse = z.infer<typeof AELDecisionResponseSchema>;
