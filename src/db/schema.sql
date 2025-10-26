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
  reviewed BOOLEAN NOT NULL DEFAULT 0,
  INDEX idx_policy_id (policy_id),
  INDEX idx_hash (hash),
  INDEX idx_merchant (merchant_id)
);

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
  revoked_at TEXT,
  INDEX idx_trace (trace_id),
  INDEX idx_merchant (merchant_id),
  INDEX idx_order (order_id)
);

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
  FOREIGN KEY (return_token_jti) REFERENCES return_tokens(jti),
  INDEX idx_trace (trace_id),
  INDEX idx_merchant (merchant_id),
  INDEX idx_jti (return_token_jti)
);

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
  FOREIGN KEY (decision_id) REFERENCES decisions(decision_id),
  INDEX idx_decision (decision_id)
);

-- Idempotency keys
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response TEXT NOT NULL, -- JSON response
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  INDEX idx_merchant (merchant_id),
  INDEX idx_expires (expires_at)
);

-- Merchant API keys
CREATE TABLE IF NOT EXISTS api_keys (
  key_id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  revoked BOOLEAN NOT NULL DEFAULT 0,
  revoked_at TEXT,
  last_used_at TEXT,
  INDEX idx_merchant (merchant_id)
);

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
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  INDEX idx_merchant (merchant_id),
  INDEX idx_resource (resource_type, resource_id),
  INDEX idx_created (created_at)
);

-- Evidence uploads
CREATE TABLE IF NOT EXISTS evidence (
  evidence_id TEXT PRIMARY KEY,
  trace_id TEXT NOT NULL,
  type TEXT NOT NULL,
  url TEXT NOT NULL,
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (trace_id) REFERENCES return_tokens(trace_id),
  INDEX idx_trace (trace_id)
);

-- Shopify webhook events
CREATE TABLE IF NOT EXISTS shopify_events (
  event_id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  payload TEXT NOT NULL, -- JSON
  trace_id TEXT,
  processed BOOLEAN NOT NULL DEFAULT 0,
  processed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  INDEX idx_merchant (merchant_id),
  INDEX idx_processed (processed),
  INDEX idx_trace (trace_id)
);

-- Stripe webhook events
CREATE TABLE IF NOT EXISTS stripe_events (
  event_id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL,
  type TEXT NOT NULL,
  payload TEXT NOT NULL, -- JSON
  trace_id TEXT,
  processed BOOLEAN NOT NULL DEFAULT 0,
  processed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  INDEX idx_merchant (merchant_id),
  INDEX idx_processed (processed),
  INDEX idx_trace (trace_id)
);
