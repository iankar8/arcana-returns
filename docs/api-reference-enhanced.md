# Arcana Returns API Reference v0.1

> **Complete Developer Guide** - Production-ready API documentation with examples, schemas, and best practices

## Table of Contents

- [Getting Started](#getting-started)
- [Authentication](#authentication)
- [Returns Flow](#returns-flow)
  - [Step 1: Issue Token](#step-1-issue-return-token)
  - [Step 2: Authorize](#step-2-authorize-return)
  - [Step 3: Commit](#step-3-commit-return)
- [Policy Management](#policy-management)
- [Audit Ledger (AEL)](#audit-ledger-ael)
- [Webhooks](#webhooks)
- [Error Handling](#error-handling)
- [Rate Limits](#rate-limits)
- [SDK Examples](#sdk-examples)

---

## Getting Started

### Base URL
```
Production: https://api.arcana.returns
Sandbox: https://sandbox-api.arcana.returns
Development: http://localhost:3000
```

### Quick Start Flow
```mermaid
sequenceDiagram
    participant M as Merchant
    participant A as Arcana API
    participant C as Customer
    
    M->>A: POST /returns/token
    A->>M: return_token (JWT)
    C->>M: Upload evidence
    M->>A: POST /returns/authorize
    A->>M: decision + label_credential
    C->>M: Ship package
    M->>A: POST /returns/commit
    A->>M: refund_instruction
```

---

## Authentication

All API requests require an API key in the `Authorization` header with Bearer scheme.

### Request Header
```http
Authorization: Bearer sk_live_your_api_key_here
```

### API Key Types

| Prefix | Type | Usage |
|--------|------|-------|
| `sk_live_` | Live | Production environment |
| `sk_test_` | Test | Sandbox environment |

### Creating API Keys

```bash
npm run cli -- keys create --merchant merchant_id --name "Production Key"
```

**Security Best Practices:**
- Store keys in environment variables, never in code
- Rotate keys every 90 days
- Use different keys for different services
- Revoke compromised keys immediately

### Error Responses

| Error Code | Description | Resolution |
|------------|-------------|------------|
| `AUTH-001` | Invalid API key | Check key format and validity |
| `AUTH-002` | Unauthorized | Key doesn't have permission for this resource |
| `RATE-001` | Rate limit exceeded | Implement exponential backoff |

---

## Returns Flow

The returns process follows a 3-step flow with cryptographically signed tokens.

### Core Concepts

**Return Token (RT)**
- Short-lived JWT (15 minutes default)
- Ed25519 signature
- Contains policy snapshot hash, items hash, and risk factors
- One-time use - revoked after commit

**Trace ID**
- Unique identifier for request tracing
- Format: `trc_[base62]`
- Included in all responses
- Use for debugging and support

---

### Step 1: Issue Return Token

Issue a signed Return Token to initiate the returns process.

#### `POST /returns/token`

**Request Body:**

```typescript
{
  order_id: string;           // Your order identifier
  customer_ref: string;       // Customer identifier (pseudonymous)
  items: Array<{
    sku: string;              // Product SKU
    qty: number;              // Quantity to return (positive integer)
    price_cents: number;      // Unit price in cents
    name?: string;            // Optional product name
  }>;
  reason_code: string;        // Return reason (see reason codes)
  device_fingerprint?: string; // Optional device ID for risk scoring
  agent_headers?: {           // Optional agent attestation
    agent_id?: string;
    attestation?: string;     // urn:tap:claims:v1:...
    version?: string;
  };
  policy_id: string;          // Target policy ID
}
```

**Reason Codes:**
- `doesnt_fit` - Size/fit issues
- `not_as_described` - Product mismatch
- `damaged` - Damaged on arrival
- `wrong_item` - Wrong product shipped
- `changed_mind` - Customer regret
- `quality_issue` - Poor quality
- `other` - Other reasons

**Response (200 OK):**

```typescript
{
  return_token: string;           // Signed JWT token (RT)
  risk_score: number;             // 0.0 - 1.0 (higher = riskier)
  required_evidence: string[];    // Evidence types needed
  policy_snapshot_hash: string;   // SHA-256 hash of policy
  trace_id: string;               // Request trace ID
  expires_at: string;             // ISO 8601 timestamp
}
```

**Example:**

```bash
curl -X POST https://api.arcana.returns/returns/token \
  -H "Authorization: Bearer sk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "ord_123456",
    "customer_ref": "cust_abc789",
    "items": [
      {
        "sku": "SHIRT-M-BLUE",
        "qty": 1,
        "price_cents": 2999,
        "name": "Cotton Shirt - Blue - M"
      }
    ],
    "reason_code": "doesnt_fit",
    "policy_id": "plc_xyz123"
  }'
```

**Response:**
```json
{
  "return_token": "rt.eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...",
  "risk_score": 0.12,
  "required_evidence": ["photo_packaging"],
  "policy_snapshot_hash": "sha256:a4b8c9d...",
  "trace_id": "trc_9Nf2kL5p",
  "expires_at": "2025-10-26T19:20:00Z"
}
```

**Error Responses:**

| Status | Error Code | Description |
|--------|------------|-------------|
| 400 | `RT-001` | Malformed payload |
| 404 | `POL-001` | Policy not found |
| 422 | `RT-003` | Items out of return window |

**Token Structure:**

The Return Token is a JWT with the following claims:

```typescript
{
  iss: "arcana-returns",       // Issuer
  exp: 1729972800,             // Expiry (Unix timestamp)
  jti: "rt_abc123",            // Unique token ID
  trace_id: "trc_9Nf2kL5p",   // Trace identifier
  order_id: "ord_123456",      // Order reference
  items_hash: "sha256:...",    // Canonical hash of items
  user_ref: "cust_abc789",     // Customer reference
  policy_snapshot_hash: "sha256:...",
  risk_factors: ["high_value"],
  merchant_id: "merchant_test"
}
```

**Risk Scoring:**

Risk scores influence evidence requirements:
- `0.0 - 0.3`: Low risk → Minimal evidence
- `0.3 - 0.7`: Medium risk → Photo evidence required
- `0.7 - 1.0`: High risk → Enhanced verification

---

### Step 2: Authorize Return

Authorize a return after evidence collection.

#### `POST /returns/authorize`

**Request Body:**

```typescript
{
  return_token: string;           // RT from /returns/token
  evidence: Array<{
    type: string;                 // Evidence type
    url: string;                  // HTTPS URL to evidence
    uploaded_at?: string;         // Optional ISO 8601 timestamp
  }>;
  dropoff_choice?: "mail_in" | "drop_off" | "in_store";
}
```

**Evidence Types:**
- `photo_packaging` - Package condition photo
- `photo_product` - Product photo
- `photo_defect` - Defect/damage photo
- `receipt` - Purchase receipt
- `video` - Video evidence

**Response (200 OK):**

```typescript
{
  decision: "approve" | "step_up" | "deny";
  conditions: {
    restock_pct: number;        // 0-100
    window: number;             // Days remaining
  };
  label_credential: string | null;  // Shipping label token
  explanations: string[];           // Human-readable reasons
  audit_ref: string;                // AEL decision ID
  step_up_requirements?: string[];  // If decision is "step_up"
}
```

**Decisions:**
- `approve` - Return accepted, proceed to commit
- `step_up` - Additional verification needed
- `deny` - Return rejected per policy

**Example:**

```bash
curl -X POST https://api.arcana.returns/returns/authorize \
  -H "Authorization: Bearer sk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "return_token": "rt.eyJhbGc...",
    "evidence": [
      {
        "type": "photo_packaging",
        "url": "https://cdn.example.com/evidence/pkg_123.jpg"
      }
    ],
    "dropoff_choice": "mail_in"
  }'
```

**Response:**
```json
{
  "decision": "approve",
  "conditions": {
    "restock_pct": 0,
    "window": 28
  },
  "label_credential": "lbl_xyz789",
  "explanations": [
    "Within 30-day return window",
    "Evidence meets policy requirements",
    "Low risk profile"
  ],
  "audit_ref": "dec_9xKl2p"
}
```

**Error Responses:**

| Status | Error Code | Description |
|--------|------------|-------------|
| 400 | `RT-001` | Invalid request format |
| 401 | `RT-007` | Invalid token signature |
| 410 | `RT-004` | Token expired |
| 422 | `RT-008` | Evidence incomplete |

---

### Step 3: Commit Return

Finalize the return and issue refund instruction.

#### `POST /returns/commit`

**Request Body:**

```typescript
{
  return_token: string;
  receipt_event: {
    type: "scan" | "dropoff" | "received";
    carrier?: string;           // e.g., "UPS", "FedEx"
    ts: string;                 // ISO 8601 timestamp
    tracking_number?: string;
  };
}
```

**Response (200 OK):**

```typescript
{
  refund_instruction: "hold" | "instant" | "partial" | "deny";
  final_receipt: {
    id: string;
    refund_amount_cents?: number;
    refund_method?: string;
  };
  audit_ref: string;
}
```

**Refund Instructions:**
- `instant` - Issue refund immediately
- `hold` - Wait for inspection
- `partial` - Issue partial refund (with restocking fee)
- `deny` - Do not refund

**Example:**

```bash
curl -X POST https://api.arcana.returns/returns/commit \
  -H "Authorization: Bearer sk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "return_token": "rt.eyJhbGc...",
    "receipt_event": {
      "type": "scan",
      "carrier": "UPS",
      "ts": "2025-10-26T10:30:00Z",
      "tracking_number": "1Z999AA10123456784"
    }
  }'
```

**Response:**
```json
{
  "refund_instruction": "instant",
  "final_receipt": {
    "id": "rcp_9xKl2p",
    "refund_amount_cents": 2999,
    "refund_method": "original_payment"
  },
  "audit_ref": "dec_9xKl2p_final"
}
```

**Error Responses:**

| Status | Error Code | Description |
|--------|------------|-------------|
| 400 | `RT-001` | Malformed request |
| 404 | `RT-006` | Token not found |
| 409 | `RT-021` | Already committed (idempotency) |
| 410 | `RT-004` | Token expired |

---

## Policy Management

Manage versioned return policies with content hashing.

### Import Policy

#### `POST /policy/import`

Import a return policy from PDF, URL, or plain text.

**Request Body:**

```typescript
{
  source_type: "pdf" | "url" | "text";
  source_content?: string;      // Base64 PDF or plain text
  source_url?: string;          // HTTPS URL
  merchant_id: string;
  effective_at?: string;        // ISO 8601 (defaults to now)
}
```

**Response (200 OK):**

```typescript
{
  policy_id: string;
  snapshot_id: string;
  policy_snapshot_hash: string;
  requires_review: boolean;     // Human review needed?
  extracted_fields: {           // Parsed policy fields
    return_window_days?: number;
    restock_fee_pct?: number;
    allowed_channels?: string[];
    evidence?: string[];
    // ... more fields
  };
}
```

**Example:**

```bash
curl -X POST https://api.arcana.returns/policy/import \
  -H "Authorization: Bearer sk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "source_type": "text",
    "source_content": "Returns accepted within 30 days. Items must be in original packaging.",
    "merchant_id": "merchant_test"
  }'
```

### Get Policy

#### `GET /policy/:policyId`

Retrieve the latest policy snapshot.

**Response (200 OK):**

```typescript
{
  policy_id: string;
  snapshot_id: string;
  hash: string;
  effective_at: string;
  return_window_days: number;
  restock_fee_pct: number;
  allowed_channels: string[];
  evidence: string[];
  exclusions: string[];
  item_classes: Array<{
    class: string;
    window_days: number;
  }>;
  geo_rules: Array<{
    country: string;            // ISO 3166-1 alpha-2
    window_days: number;
  }>;
}
```

### Compare Policies

#### `GET /policy/:policyId/diff?from=snapshot_v1&to=snapshot_v2`

Compare two policy snapshots.

**Query Parameters:**
- `from` (required): Source snapshot ID
- `to` (required): Target snapshot ID

**Response (200 OK):**

```typescript
{
  from_snapshot_id: string;
  to_snapshot_id: string;
  changes: Array<{
    field: string;
    old_value: any;
    new_value: any;
    change_type: "added" | "removed" | "modified";
  }>;
  summary: string;
}
```

---

## Audit Ledger (AEL)

Query the append-only decision ledger for auditing and replay.

### Get Decision

#### `GET /ael/decision/:id`

Retrieve a decision with its Bill of Materials (BOM).

**Response (200 OK):**

```typescript
{
  decision: {
    decision_id: string;
    trace_id: string;
    ts: string;
    merchant_id: string;
    return_token_jti: string;
    input_summary_hash: string;
    output: {
      decision: "approve" | "step_up" | "deny";
      risk_score: number;
    };
    explanations: string[];
    created_at: string;
  };
  bom: {
    decision_id: string;
    model_ref?: string;         // e.g., "gpt-4-0125"
    prompt_ref?: string;
    tool_refs: string[];
    policy_snapshot_hash: string;
    code_version: string;       // Git SHA
    env_snapshot?: Record<string, string>;
  };
}
```

### List Decisions

#### `GET /ael/decisions?limit=50`

List recent decisions for your merchant.

**Query Parameters:**
- `limit` (optional): Number of results (default: 50, max: 100)
- `cursor` (optional): Pagination cursor (future)

**Response (200 OK):**

```typescript
{
  decisions: Array<Decision>;
  next_cursor?: string;         // For pagination
}
```

### Generate Replay

#### `POST /ael/replay/:id`

Generate a replay artifact for time-travel debugging.

**Response (200 OK):**

```typescript
{
  replay_id: string;
  status: "generated";
}
```

### Get Replay Artifact

#### `GET /ael/replay/:replayId`

Download the replay bundle.

**Response (200 OK):**

```typescript
{
  replay_id: string;
  decision_id: string;
  env_lock: {
    model_hash?: string;
    tools_versions: Record<string, string>;
    policy_snapshot_hash: string;
  };
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  created_at: string;
  bundle_url?: string;          // Signed S3 URL (future)
}
```

### Compare Decisions

#### `GET /ael/diff?baseline=dec_123&candidate=dec_456`

Compare two decisions for A/B testing or debugging.

**Query Parameters:**
- `baseline` (required): Baseline decision ID
- `candidate` (required): Candidate decision ID

**Response (200 OK):**

```typescript
{
  baseline_decision_id: string;
  candidate_decision_id: string;
  baseline_env: {
    policy_hash: string;
    model_ref?: string;
    code_version: string;
  };
  candidate_env: { ... };
  changes: {
    decision_delta: {
      baseline: string;
      candidate: string;
      changed: boolean;
    };
    rationale_delta: Array<{
      field: string;
      baseline_value: any;
      candidate_value: any;
    }>;
  };
  summary: string;
}
```

---

## Webhooks

Arcana can receive events from e-commerce platforms and payment processors.

### Shopify Webhooks

#### `POST /webhooks/shopify`

**Headers:**
- `X-Shopify-Topic`: Event type (e.g., `orders/updated`)
- `X-Shopify-Shop-Domain`: Shop domain
- `X-Shopify-Hmac-Sha256`: HMAC signature

**Verification:**

```typescript
import crypto from 'crypto';

function verifyShopifyWebhook(body: string, hmac: string, secret: string): boolean {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64');
  return crypto.timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(hmac)
  );
}
```

**Supported Topics:**
- `orders/updated`
- `orders/fulfilled`
- `refunds/create`

### Stripe Webhooks

#### `POST /webhooks/stripe`

**Headers:**
- `Stripe-Signature`: Webhook signature

**Verification:**

```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

function verifyStripeWebhook(body: string, signature: string, secret: string) {
  return stripe.webhooks.constructEvent(body, signature, secret);
}
```

**Supported Events:**
- `charge.refunded`
- `refund.created`
- `refund.updated`

---

## Error Handling

All errors follow a consistent structure:

```typescript
{
  error: {
    code: string;             // Error code (e.g., "RT-001")
    message: string;          // Human-readable message
    details?: any;            // Additional context
    trace_id: string;         // Request trace ID
  }
}
```

### Error Codes

#### Returns Errors (RT-*)

| Code | Status | Description | Resolution |
|------|--------|-------------|------------|
| RT-001 | 400 | Malformed payload | Check request schema |
| RT-003 | 422 | Outside return window | Check policy dates |
| RT-004 | 410 | Token expired | Issue new token |
| RT-007 | 401 | Invalid signature | Verify token integrity |
| RT-008 | 422 | Evidence incomplete | Provide required evidence |
| RT-010 | 409 | Policy hash mismatch | Re-issue token with current policy |
| RT-021 | 409 | Idempotency conflict | Check existing request |

#### Policy Errors (POL-*)

| Code | Status | Description |
|------|--------|-------------|
| POL-001 | 404 | Policy not found |
| POL-002 | 400 | Invalid policy format |
| POL-003 | 422 | Policy parse error |

#### AEL Errors

| Code | Status | Description |
|------|--------|-------------|
| AEL-001 | 404 | Decision not found |
| AEL-002 | 500 | Replay failed |

#### Auth Errors

| Code | Status | Description |
|------|--------|-------------|
| AUTH-001 | 401 | Invalid API key |
| AUTH-002 | 403 | Unauthorized |

#### Rate Limiting

| Code | Status | Description |
|------|--------|-------------|
| RATE-001 | 429 | Rate limit exceeded |

### Retry Logic

For transient errors (5xx), implement exponential backoff:

```typescript
async function retryRequest(fn: () => Promise<any>, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.statusCode < 500 || i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 2 ** i * 1000));
    }
  }
}
```

---

## Rate Limits

### Default Limits

| Tier | Requests/min | Burst |
|------|--------------|-------|
| Free | 60 | 10/sec |
| Standard | 100 | 20/sec |
| Enterprise | Custom | Custom |

### Headers

Rate limit information is returned in response headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1729972800
```

### Best Practices

1. **Cache policy data** - Policies change infrequently
2. **Batch requests** - Use webhooks instead of polling
3. **Implement backoff** - Respect 429 responses
4. **Use idempotency keys** - Prevent duplicate operations

---

## SDK Examples

### Node.js/TypeScript

```typescript
import { ArcanaReturns } from '@arcana/returns-sdk';

const arcana = new ArcanaReturns({
  apiKey: process.env.ARCANA_API_KEY,
  environment: 'production',
});

// Issue return token
const token = await arcana.returns.issueToken({
  order_id: 'ord_123',
  customer_ref: 'cust_456',
  items: [{ sku: 'SHIRT-M', qty: 1, price_cents: 2999 }],
  reason_code: 'doesnt_fit',
  policy_id: 'plc_abc',
});

// Authorize return
const auth = await arcana.returns.authorize({
  return_token: token.return_token,
  evidence: [
    { type: 'photo_packaging', url: 'https://...' }
  ],
  dropoff_choice: 'mail_in',
});

// Commit return
if (auth.decision === 'approve') {
  const commit = await arcana.returns.commit({
    return_token: token.return_token,
    receipt_event: {
      type: 'scan',
      carrier: 'UPS',
      ts: new Date().toISOString(),
    },
  });
}
```

### Python

```python
from arcana_returns import ArcanaClient

client = ArcanaClient(api_key=os.environ['ARCANA_API_KEY'])

# Issue token
token = client.returns.issue_token(
    order_id='ord_123',
    customer_ref='cust_456',
    items=[{'sku': 'SHIRT-M', 'qty': 1, 'price_cents': 2999}],
    reason_code='doesnt_fit',
    policy_id='plc_abc'
)

# Authorize
auth = client.returns.authorize(
    return_token=token['return_token'],
    evidence=[{'type': 'photo_packaging', 'url': 'https://...'}],
    dropoff_choice='mail_in'
)
```

### Ruby

```ruby
require 'arcana_returns'

client = ArcanaReturns::Client.new(api_key: ENV['ARCANA_API_KEY'])

# Issue token
token = client.returns.issue_token(
  order_id: 'ord_123',
  customer_ref: 'cust_456',
  items: [{ sku: 'SHIRT-M', qty: 1, price_cents: 2999 }],
  reason_code: 'doesnt_fit',
  policy_id: 'plc_abc'
)

# Authorize
auth = client.returns.authorize(
  return_token: token.return_token,
  evidence: [{ type: 'photo_packaging', url: 'https://...' }],
  dropoff_choice: 'mail_in'
)
```

---

## Idempotency

Use `Idempotency-Key` header to prevent duplicate operations:

```http
POST /returns/commit
Authorization: Bearer sk_live_...
Idempotency-Key: unique-key-123
Content-Type: application/json
```

The same `Idempotency-Key` within 24 hours will return the cached response.

---

## Changelog & Versioning

### Current Version: v0.1 (Beta)

**Breaking Changes Policy:**
- Major version bump (v1.0, v2.0): Breaking changes
- Minor version (v0.2, v0.3): Additive changes only
- We provide 6 months notice before deprecation

**Subscribe to updates:**
- [API Changelog](https://arcana.returns/changelog)
- [Developer Newsletter](https://arcana.returns/newsletter)

---

## Support

- **Documentation**: https://docs.arcana.returns
- **Status Page**: https://status.arcana.returns
- **Email**: api-support@arcana.returns
- **Discord**: https://discord.gg/arcana-dev

**Include in support requests:**
1. `trace_id` from error response
2. Timestamp of request
3. Minimal reproduction case
4. Expected vs actual behavior
