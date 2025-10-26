import { z } from 'zod';

/**
 * Policy Graph Schema - versioned, hashed policy snapshots
 */

export const ItemClassSchema = z.object({
  class: z.string(),
  window_days: z.number().int().positive(),
});

export const GeoRuleSchema = z.object({
  country: z.string().length(2), // ISO 3166-1 alpha-2
  window_days: z.number().int().positive(),
});

export const PolicyGraphSchema = z.object({
  policy_id: z.string(),
  snapshot_id: z.string(),
  hash: z.string(), // sha256:...
  effective_at: z.string().datetime(),
  return_window_days: z.number().int().positive(),
  restock_fee_pct: z.number().min(0).max(100),
  allowed_channels: z.array(z.enum(['mail_in', 'drop_off', 'in_store'])),
  evidence: z.array(z.string()),
  exclusions: z.array(z.string()),
  item_classes: z.array(ItemClassSchema),
  geo_rules: z.array(GeoRuleSchema),
  raw_source: z.string().optional(), // Original PDF/HTML content
  source_url: z.string().url().optional(),
  source_checksum: z.string().optional(),
});

export type PolicyGraph = z.infer<typeof PolicyGraphSchema>;
export type ItemClass = z.infer<typeof ItemClassSchema>;
export type GeoRule = z.infer<typeof GeoRuleSchema>;

export const PolicyImportRequestSchema = z.object({
  source_type: z.enum(['pdf', 'url', 'text']),
  source_content: z.string().optional(), // Base64 for PDF, text for others
  source_url: z.string().url().optional(),
  merchant_id: z.string(),
  effective_at: z.string().datetime().optional(),
});

export type PolicyImportRequest = z.infer<typeof PolicyImportRequestSchema>;

export const PolicyImportResponseSchema = z.object({
  policy_id: z.string(),
  snapshot_id: z.string(),
  policy_snapshot_hash: z.string(),
  requires_review: z.boolean(),
  extracted_fields: PolicyGraphSchema.partial(),
});

export type PolicyImportResponse = z.infer<typeof PolicyImportResponseSchema>;

export const PolicyDiffSchema = z.object({
  from_snapshot_id: z.string(),
  to_snapshot_id: z.string(),
  changes: z.array(z.object({
    field: z.string(),
    old_value: z.any(),
    new_value: z.any(),
    change_type: z.enum(['added', 'removed', 'modified']),
  })),
  summary: z.string(),
});

export type PolicyDiff = z.infer<typeof PolicyDiffSchema>;
