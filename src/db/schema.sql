-- Arcana Returns Database Schema
-- SQLite with append-only patterns for AEL

-- Policy snapshots (versioned, content-addressed)
CREATE TABLE IF NOT EXISTS policy_snapshots (
  snapshot_id TEXT PRIMARY KEY,
  policy_id TEXT NOT NULL,
  hash TEXT NOT NULL UNIQUE,
  effective_at TEXT NOT NULL,
  return_window_days INTEGER NOT NULL,
  restock_fee_pct REAL NOT NULL,
  allowed_channels TEXT NOT NULL, -- JSON array
  evidence TEXT NOT NULL, -- JSON array
  exclusions TEXT NOT NULL, -- JSON array
  item_classes TEXT NOT NULL, -- JSON array
  geo_rules TEXT NOT NULL, -- JSON array
  raw_source TEXT,
  source_url TEXT,
  source_checksum TEXT,
  merchant_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed BOOLEAN NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_policy_id ON policy_snapshots(policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_hash ON policy_snapshots(hash);
CREATE INDEX IF NOT EXISTS idx_policy_merchant ON policy_snapshots(merchant_id);

-- Return tokens (issued, not revoked)
CREATE TABLE IF NOT EXISTS return_tokens (
  jti TEXT PRIMARY KEY,
  trace_id TEXT NOT NULL UNIQUE,
  merchant_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  customer_ref TEXT NOT NULL,
  items_hash TEXT NOT NULL,
  policy_snapshot_hash TEXT NOT NULL,
  device_hash TEXT,
  agent_id TEXT,
  risk_factors TEXT NOT NULL, -- JSON array
  risk_score REAL NOT NULL,
  issued_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT 0,
  revoked_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_token_trace ON return_tokens(trace_id);
CREATE INDEX IF NOT EXISTS idx_token_merchant ON return_tokens(merchant_id);
CREATE INDEX IF NOT EXISTS idx_token_order ON return_tokens(order_id);

-- Decisions (append-only AEL core)
CREATE TABLE IF NOT EXISTS decisions (
  decision_id TEXT PRIMARY KEY,
  trace_id TEXT NOT NULL,
  merchant_id TEXT NOT NULL,
  return_token_jti TEXT NOT NULL,
  input_summary_hash TEXT NOT NULL,
  decision TEXT NOT NULL CHECK(decision IN ('approve', 'step_up', 'deny')),
  risk_score REAL NOT NULL,
  explanations TEXT NOT NULL, -- JSON array
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (return_token_jti) REFERENCES return_tokens(jti)
);

CREATE INDEX IF NOT EXISTS idx_decision_trace ON decisions(trace_id);
CREATE INDEX IF NOT EXISTS idx_decision_merchant ON decisions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_decision_jti ON decisions(return_token_jti);

-- Decision BOM (Bill of Materials for replay)
CREATE TABLE IF NOT EXISTS decision_bom (
  decision_id TEXT PRIMARY KEY,
  model_ref TEXT,
  prompt_ref TEXT,
  tool_refs TEXT NOT NULL, -- JSON array
  corpus_snapshot_ref TEXT,
  policy_snapshot_hash TEXT NOT NULL,
  code_version TEXT NOT NULL,
  env_snapshot TEXT, -- JSON object
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (decision_id) REFERENCES decisions(decision_id)
);

-- Replay artifacts
CREATE TABLE IF NOT EXISTS replay_artifacts (
  replay_id TEXT PRIMARY KEY,
  decision_id TEXT NOT NULL,
  env_lock TEXT NOT NULL, -- JSON object
  inputs TEXT NOT NULL, -- JSON object
  outputs TEXT NOT NULL, -- JSON object
  bundle_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (decision_id) REFERENCES decisions(decision_id)
);

CREATE INDEX IF NOT EXISTS idx_replay_decision ON replay_artifacts(decision_id);

-- Idempotency keys
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response TEXT NOT NULL, -- JSON response
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_idempotency_merchant ON idempotency_keys(merchant_id);
CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON idempotency_keys(expires_at);

-- Merchant API keys
CREATE TABLE IF NOT EXISTS api_keys (
  key_id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  revoked BOOLEAN NOT NULL DEFAULT 0,
  revoked_at TEXT,
  last_used_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_apikey_merchant ON api_keys(merchant_id);

-- Audit log (access to decisions/replays)
CREATE TABLE IF NOT EXISTS audit_log (
  log_id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL,
  user_id TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_merchant ON audit_log(merchant_id);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);

-- Evidence uploads
CREATE TABLE IF NOT EXISTS evidence (
  evidence_id TEXT PRIMARY KEY,
  trace_id TEXT NOT NULL,
  type TEXT NOT NULL,
  url TEXT NOT NULL,
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (trace_id) REFERENCES return_tokens(trace_id)
);

CREATE INDEX IF NOT EXISTS idx_evidence_trace ON evidence(trace_id);

-- Shopify webhook events
CREATE TABLE IF NOT EXISTS shopify_events (
  event_id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  payload TEXT NOT NULL, -- JSON
  trace_id TEXT,
  processed BOOLEAN NOT NULL DEFAULT 0,
  processed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_shopify_merchant ON shopify_events(merchant_id);
CREATE INDEX IF NOT EXISTS idx_shopify_processed ON shopify_events(processed);
CREATE INDEX IF NOT EXISTS idx_shopify_trace ON shopify_events(trace_id);

-- Stripe webhook events
CREATE TABLE IF NOT EXISTS stripe_events (
  event_id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL,
  type TEXT NOT NULL,
  payload TEXT NOT NULL, -- JSON
  trace_id TEXT,
  processed BOOLEAN NOT NULL DEFAULT 0,
  processed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_stripe_merchant ON stripe_events(merchant_id);
CREATE INDEX IF NOT EXISTS idx_stripe_processed ON stripe_events(processed);
CREATE INDEX IF NOT EXISTS idx_stripe_trace ON stripe_events(trace_id);

-- Agent attestations (agentic commerce)
CREATE TABLE IF NOT EXISTS agent_attestations (
  id TEXT PRIMARY KEY,
  trace_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  attestation_format TEXT NOT NULL,
  verified BOOLEAN NOT NULL,
  raw_attestation TEXT,
  claims TEXT, -- JSON
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_agent_attestations_agent_id ON agent_attestations(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_attestations_platform ON agent_attestations(platform);
CREATE INDEX IF NOT EXISTS idx_agent_attestations_trace ON agent_attestations(trace_id);

-- Webhook failures (Dead Letter Queue)
CREATE TABLE IF NOT EXISTS webhook_failures (
  failure_id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data TEXT NOT NULL,
  error TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt TEXT NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT 0,
  resolved_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_webhook_failures_event_id ON webhook_failures(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_failures_resolved ON webhook_failures(resolved);
CREATE INDEX IF NOT EXISTS idx_webhook_failures_event_type ON webhook_failures(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_failures_last_attempt ON webhook_failures(last_attempt);

-- Add retry tracking columns to event tables (if not exists)
-- Note: SQLite doesn't support ALTER TABLE ADD COLUMN IF NOT EXISTS
-- These will fail gracefully if columns exist
