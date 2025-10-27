import { z } from 'zod';

/**
 * Policy Graph Schema - versioned, hashed policy snapshots
 */

export const ItemClassSchema = z.object({
  class: z.string()
    .describe('Item category/class for differential policies. Examples: electronics, clothing, perishables, final_sale.'),
  window_days: z.number().int().positive()
    .describe('Return window in days for this item class. Overrides default return_window_days.'),
});

export const GeoRuleSchema = z.object({
  country: z.string().length(2)
    .describe('Country code (ISO 3166-1 alpha-2). Examples: US, CA, GB, DE. Used for region-specific return windows.'),
  window_days: z.number().int().positive()
    .describe('Return window in days for this country. Overrides default return_window_days.'),
});

export const PolicyGraphSchema = z.object({
  policy_id: z.string()
    .describe('Policy identifier. Format: plc_[alphanumeric]. Stable across snapshots.'),
  snapshot_id: z.string()
    .describe('Snapshot version ID. Format: plc_[id]_v[N]. Increments with each policy change.'),
  hash: z.string()
    .describe('SHA-256 content hash of policy. Format: sha256:[hex]. Used for immutable binding in return tokens.'),
  effective_at: z.string().datetime()
    .describe('ISO 8601 timestamp when this policy version becomes effective. Future-dated policies supported.'),
  return_window_days: z.number().int().positive()
    .describe('Default return window in days. Can be overridden by item_classes or geo_rules.'),
  restock_fee_pct: z.number().min(0).max(100)
    .describe('Restocking fee percentage (0-100). 0 = free returns, 20 = 20% fee applied to refund.'),
  allowed_channels: z.array(z.enum(['mail_in', 'drop_off', 'in_store']))
    .describe('Allowed return methods. mail_in = ship to merchant, drop_off = carrier drop, in_store = physical location.'),
  evidence: z.array(z.string())
    .describe('Default evidence requirements. Examples: photo_packaging, receipt, video. Can be risk-adjusted at runtime.'),
  exclusions: z.array(z.string())
    .describe('Excluded categories/SKUs. Returns denied for these items. Examples: gift_cards, personalized, final_sale.'),
  item_classes: z.array(ItemClassSchema)
    .describe('Per-category policy overrides. Electronics may have shorter windows, clothing longer, etc.'),
  geo_rules: z.array(GeoRuleSchema)
    .describe('Country-specific policy overrides. International orders may have different windows.'),
  raw_source: z.string().optional()
    .describe('Original policy source text (PDF/HTML content). Stored for human review and audit.'),
  source_url: z.string().url().optional()
    .describe('Source URL if policy imported from web. Tracked for change detection.'),
  source_checksum: z.string().optional()
    .describe('Checksum of source document. Used to detect policy changes at origin.'),
});

export type PolicyGraph = z.infer<typeof PolicyGraphSchema>;
export type ItemClass = z.infer<typeof ItemClassSchema>;
export type GeoRule = z.infer<typeof GeoRuleSchema>;

export const PolicyImportRequestSchema = z.object({
  source_type: z.enum(['pdf', 'url', 'text'])
    .describe('Source type: pdf (base64-encoded), url (fetch from web), text (plain text policy).'),
  source_content: z.string().optional()
    .describe('Policy content. Base64-encoded for PDF, plain text otherwise. Required if source_type is pdf or text.'),
  source_url: z.string().url().optional()
    .describe('Policy URL. Required if source_type is url. Must be publicly accessible HTTPS URL.'),
  merchant_id: z.string()
    .describe('Merchant identifier. Policies are scoped per merchant. Format: merchant_[alphanumeric].'),
  effective_at: z.string().datetime().optional()
    .describe('When policy becomes effective. ISO 8601 timestamp. Defaults to now if omitted.'),
});

export type PolicyImportRequest = z.infer<typeof PolicyImportRequestSchema>;

export const PolicyImportResponseSchema = z.object({
  policy_id: z.string()
    .describe('Generated or existing policy ID. Use this for /returns/token requests.'),
  snapshot_id: z.string()
    .describe('Snapshot version ID for this import. Increments on each import.'),
  policy_snapshot_hash: z.string()
    .describe('SHA-256 hash of the imported policy. Used for immutable binding.'),
  requires_review: z.boolean()
    .describe('Whether human review is recommended. True if extraction confidence is low or ambiguous rules detected.'),
  extracted_fields: PolicyGraphSchema.partial()
    .describe('Extracted policy fields from source. Partial object; review before using in production.'),
});

export type PolicyImportResponse = z.infer<typeof PolicyImportResponseSchema>;

export const PolicyDiffSchema = z.object({
  from_snapshot_id: z.string()
    .describe('Source snapshot ID (baseline for comparison).'),
  to_snapshot_id: z.string()
    .describe('Target snapshot ID (candidate for comparison).'),
  changes: z.array(z.object({
    field: z.string()
      .describe('Field path that changed. Examples: return_window_days, item_classes[0].window_days.'),
    old_value: z.any()
      .describe('Value in from_snapshot.'),
    new_value: z.any()
      .describe('Value in to_snapshot.'),
    change_type: z.enum(['added', 'removed', 'modified'])
      .describe('Type of change: added (new field), removed (deleted field), modified (value changed).'),
  })).describe('Array of changes between snapshots. Empty if policies are identical.'),
  summary: z.string()
    .describe('Human-readable summary of changes. Example: "Extended return window from 30 to 45 days for electronics".'),
});

export type PolicyDiff = z.infer<typeof PolicyDiffSchema>;
