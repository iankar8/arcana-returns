# Arcana Returns - Architecture Overview

## System Design

```
┌─────────────────────────────────────────────────────────────┐
│                     Merchant Systems                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │ Shopify  │  │  Stripe  │  │  Custom  │                  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                  │
└───────┼─────────────┼─────────────┼────────────────────────┘
        │             │             │
        │ Webhooks    │ Webhooks    │ Direct API
        │             │             │
┌───────▼─────────────▼─────────────▼────────────────────────┐
│                   Arcana Returns API                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Returns Flow (3 endpoints)              │  │
│  │  POST /returns/token → POST /returns/authorize       │  │
│  │                     → POST /returns/commit           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Policy     │  │     JWT      │  │     AEL      │    │
│  │  Extractor   │  │   Signing    │  │   Ledger     │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            SQLite (WAL mode, append-only)            │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
        │
        │ CLI / Analyst Tools
        ▼
┌─────────────────────────────────────────────────────────────┐
│  Replay Exports │ Decision Diffs │ Evidence Ladder Config  │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Policy Snapshot Extractor

**Purpose:** Convert merchant return policies into versioned, content-addressed graphs

**Key Features:**
- PDF/URL/text ingestion
- Content hashing (SHA-256)
- Version tree maintenance
- Human-in-loop review flag
- Structured diff generation

**Data Model:**
```typescript
{
  policy_id: "plc_123",
  snapshot_id: "plc_123_v4",
  hash: "sha256:...",
  return_window_days: 30,
  restock_fee_pct: 0,
  allowed_channels: ["mail_in", "drop_off"],
  evidence: ["photo_packaging"],
  // ... more fields
}
```

### 2. Returns API

**Purpose:** Tiny API surface for return decisions with signed tokens

**Endpoints:**
1. **POST /returns/token** - Issue signed Return Token (RT)
2. **POST /returns/authorize** - Authorize with evidence
3. **POST /returns/commit** - Commit and issue refund instruction

**Return Token (RT):**
- JWS with Ed25519 signature
- 15-minute TTL
- Contains: policy hash, items hash, risk factors, trace ID
- One-time use (revoked on commit)

**Decision Flow:**
```
Token Request → Risk Scoring → Evidence Requirements
                                        ↓
                              Return Token (signed)
                                        ↓
Evidence Upload → Policy Check → Decision (approve/step_up/deny)
                                        ↓
                              Authorization Response
                                        ↓
Receipt Event → Refund Instruction → Final Receipt
```

### 3. AEL-lite (Arcana Eval & Version Ledger)

**Purpose:** Append-only decision ledger with replay capability

**Components:**
- **Decision Record:** Input hash, output, explanations, timestamp
- **Decision BOM:** Model ref, prompt ref, tools, policy hash, code version
- **Replay Artifact:** Env lock, inputs, outputs, bundle URL
- **Diff Report:** Baseline vs candidate comparison

**Replay Process:**
1. Fetch decision + BOM
2. Lock environment (model, tools, policy)
3. Reconstruct inputs
4. Re-run decision logic
5. Compare outputs
6. Generate diff report

### 4. Authentication & Security

**API Keys:**
- SHA-256 hashed storage
- Per-merchant scoping
- Rotation support
- Last-used tracking

**JWT Signing:**
- Ed25519 (EdDSA)
- Key rotation via JWKS endpoint
- Short TTL + jti revocation

**Rate Limiting:**
- 100 req/min per key (default)
- Burst protection
- Per-endpoint limits

### 5. Adapters

**Shopify:**
- Webhook handlers for order/fulfillment events
- Map Shopify events → Arcana API calls
- Store events for async processing

**Stripe:**
- Refund event reconciliation
- Attach return_token_jti to metadata
- Optional enrichment (not a gate)

## Data Flow

### Happy Path Return

```
1. Merchant backend calls POST /returns/token
   ├─ Validate policy exists
   ├─ Calculate risk score
   ├─ Determine evidence requirements
   ├─ Generate signed RT
   └─ Store token record

2. Customer uploads evidence
   └─ Merchant calls POST /returns/authorize
      ├─ Verify RT signature & expiry
      ├─ Check evidence completeness
      ├─ Make decision (approve/step_up/deny)
      ├─ Log to AEL
      └─ Return authorization

3. Package scanned by carrier
   └─ Merchant calls POST /returns/commit
      ├─ Verify RT
      ├─ Revoke token
      ├─ Issue refund instruction
      └─ Generate final receipt
```

### Replay Flow

```
1. Analyst requests replay
   └─ CLI: arcana replay export --decision dec_123

2. System generates replay artifact
   ├─ Fetch decision + BOM
   ├─ Fetch policy snapshot (by hash)
   ├─ Fetch token + evidence
   ├─ Lock environment versions
   └─ Bundle inputs + outputs

3. Replay execution (future)
   ├─ Restore environment
   ├─ Re-run decision logic
   ├─ Compare outputs
   └─ Generate diff
```

## Database Schema

**Key Tables:**
- `policy_snapshots` - Versioned policies
- `return_tokens` - Issued tokens
- `decisions` - Append-only decision log
- `decision_bom` - Decision bill of materials
- `replay_artifacts` - Replay bundles
- `evidence` - Uploaded evidence
- `api_keys` - Merchant API keys
- `audit_log` - Access audit trail

**Append-Only Pattern:**
- No UPDATE/DELETE on decisions
- Soft deletes via flags
- Immutable audit trail

## Observability

**Structured Logging:**
- Trace ID on every request
- Decision path logging
- Error context capture

**Metrics:**
- p50/p95 latency
- Approve/step_up/deny ratios
- Evidence request rates
- Replay success rates

**Tracing:**
- Request → Token → Authorize → Commit
- Cross-service correlation

## Security Considerations

**Threat Model:**
- Token theft → Short TTL + jti revocation
- Replay attacks → exp + jti validation
- Policy tampering → Content hashing
- Evidence bypass → Risk-based ladder

**Data Protection:**
- PII minimization (pseudonymous IDs)
- Redaction in exports
- RBAC per merchant
- Audit logging

## Scalability

**v0 Constraints:**
- Single SQLite database
- Synchronous processing
- No horizontal scaling

**Future Improvements:**
- Postgres with read replicas
- Async webhook processing
- Redis for token cache
- S3 for replay bundles
- Multi-region deployment

## Testing Strategy

**Unit Tests:**
- Policy parsing
- Risk scoring
- Token signing/verification
- Decision logic

**Integration Tests:**
- Full return flow
- Replay generation
- Webhook handling

**Contract Tests:**
- Shopify adapter
- Stripe adapter

**Golden Set:**
- 50 synthetic decisions
- Known outcomes
- Replay parity validation
