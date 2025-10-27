# Arcana Returns API - Quick Reference Card

> **Print or bookmark this page for rapid API development**

## Base URLs

```
Production:  https://api.arcana.returns
Sandbox:     https://sandbox-api.arcana.returns
Development: http://localhost:3000
```

## Authentication

```http
Authorization: Bearer sk_live_your_api_key_here
```

---

## 3-Step Returns Flow

### 1️⃣ Issue Token

```bash
POST /returns/token
{
  "order_id": "ord_123",
  "customer_ref": "cust_456",
  "items": [{"sku": "SKU-1", "qty": 1, "price_cents": 2999}],
  "reason_code": "doesnt_fit",
  "policy_id": "plc_abc"
}

→ Returns: { "return_token": "rt.eyJ...", "risk_score": 0.12 }
```

### 2️⃣ Authorize

```bash
POST /returns/authorize
{
  "return_token": "rt.eyJ...",
  "evidence": [{"type": "photo_packaging", "url": "https://..."}],
  "dropoff_choice": "mail_in"
}

→ Returns: { "decision": "approve", "label_credential": "lbl_xyz" }
```

### 3️⃣ Commit

```bash
POST /returns/commit
{
  "return_token": "rt.eyJ...",
  "receipt_event": {
    "type": "scan",
    "carrier": "UPS",
    "ts": "2025-10-26T10:00:00Z"
  }
}

→ Returns: { "refund_instruction": "instant" }
```

---

## Common Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/health` | Health check (no auth) |
| `POST` | `/returns/token` | Issue return token |
| `POST` | `/returns/authorize` | Authorize with evidence |
| `POST` | `/returns/commit` | Finalize return |
| `POST` | `/policy/import` | Import policy |
| `GET` | `/policy/:id` | Get policy |
| `GET` | `/policy/:id/diff` | Compare policies |
| `GET` | `/ael/decision/:id` | Get decision |
| `GET` | `/ael/decisions` | List decisions |
| `POST` | `/ael/replay/:id` | Generate replay |

---

## Return Reason Codes

| Code | Description |
|------|-------------|
| `doesnt_fit` | Size/fit issues |
| `not_as_described` | Product mismatch |
| `damaged` | Damaged on arrival |
| `wrong_item` | Wrong product shipped |
| `changed_mind` | Customer regret |
| `quality_issue` | Poor quality |
| `other` | Other reasons |

---

## Evidence Types

| Type | Description |
|------|-------------|
| `photo_packaging` | Package condition photo |
| `photo_product` | Product photo |
| `photo_defect` | Defect/damage photo |
| `receipt` | Purchase receipt |
| `video` | Video evidence |

---

## Decision Types

| Decision | Meaning | Next Action |
|----------|---------|-------------|
| `approve` | ✅ Accepted | Proceed to commit |
| `step_up` | ⚠️ More info needed | Collect additional evidence |
| `deny` | ❌ Rejected | Do not proceed |

---

## Refund Instructions

| Instruction | Meaning |
|-------------|---------|
| `instant` | Issue refund immediately |
| `hold` | Wait for inspection |
| `partial` | Issue partial refund (restocking fee) |
| `deny` | Do not refund |

---

## Error Codes

### Returns (RT-*)

| Code | Status | Description |
|------|--------|-------------|
| `RT-001` | 400 | Malformed payload |
| `RT-003` | 422 | Outside return window |
| `RT-004` | 410 | Token expired |
| `RT-007` | 401 | Invalid signature |
| `RT-008` | 422 | Evidence incomplete |
| `RT-010` | 409 | Policy hash mismatch |
| `RT-021` | 409 | Already committed |

### Policy (POL-*)

| Code | Status | Description |
|------|--------|-------------|
| `POL-001` | 404 | Policy not found |
| `POL-002` | 400 | Invalid format |
| `POL-003` | 422 | Parse error |

### AEL (AEL-*)

| Code | Status | Description |
|------|--------|-------------|
| `AEL-001` | 404 | Decision not found |
| `AEL-002` | 500 | Replay failed |

### Auth (AUTH-*)

| Code | Status | Description |
|------|--------|-------------|
| `AUTH-001` | 401 | Invalid API key |
| `AUTH-002` | 403 | Unauthorized |
| `RATE-001` | 429 | Rate limit exceeded |

---

## Rate Limits

| Tier | Per Minute | Burst |
|------|------------|-------|
| Free | 60 | 10/sec |
| Standard | 100 | 20/sec |
| Enterprise | Custom | Custom |

**Response Headers:**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1729972800
```

---

## Token Lifecycle

```
issued → verified → authorized → committed → revoked
   ↓                    ↓
expired              denied
```

**TTL:** 15 minutes (default)

---

## Policy Fields

| Field | Type | Description |
|-------|------|-------------|
| `return_window_days` | int | Days to return |
| `restock_fee_pct` | number | 0-100 |
| `allowed_channels` | array | mail_in, drop_off, in_store |
| `evidence` | array | Required evidence types |
| `exclusions` | array | Excluded categories |

---

## Risk Score Interpretation

| Score | Level | Evidence Required |
|-------|-------|-------------------|
| 0.0 - 0.3 | 🟢 Low | Minimal |
| 0.3 - 0.7 | 🟡 Medium | Photo required |
| 0.7 - 1.0 | 🔴 High | Enhanced verification |

---

## CLI Commands

```bash
# Create API key
npm run cli -- keys create --merchant merchant_id --name "Key Name"

# Simulate return
npm run cli -- returns simulate --order ord_123 --sku SKU-1

# Export replay
npm run cli -- replay export --decision dec_abc --out bundle.json

# Compare decisions
npm run cli -- replay diff --baseline dec_abc --candidate dec_xyz

# View evidence ladder
npm run cli -- ladder show
```

---

## Response Format

**Success:**
```json
{
  "field": "value",
  "trace_id": "trc_abc123"
}
```

**Error:**
```json
{
  "error": {
    "code": "RT-001",
    "message": "Descriptive message",
    "details": {},
    "trace_id": "trc_abc123"
  }
}
```

---

## Idempotency

Add header to prevent duplicates:

```http
Idempotency-Key: unique-key-123
```

Valid for 24 hours.

---

## Webhooks

### Shopify
```http
POST /webhooks/shopify
X-Shopify-Topic: orders/updated
X-Shopify-Shop-Domain: store.myshopify.com
X-Shopify-Hmac-Sha256: ...
```

### Stripe
```http
POST /webhooks/stripe
Stripe-Signature: ...
```

---

## Quick Examples

### Node.js
```javascript
const response = await fetch('https://api.arcana.returns/returns/token', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ order_id: 'ord_123', ... })
});
```

### Python
```python
import requests

response = requests.post(
    'https://api.arcana.returns/returns/token',
    headers={'Authorization': f'Bearer {API_KEY}'},
    json={'order_id': 'ord_123', ...}
)
```

### cURL
```bash
curl -X POST https://api.arcana.returns/returns/token \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"order_id":"ord_123",...}'
```

---

## Best Practices

✅ **DO:**
- Cache policy data (changes infrequently)
- Implement exponential backoff for retries
- Use idempotency keys for commits
- Store API keys in environment variables
- Include trace_id in support requests

❌ **DON'T:**
- Hardcode API keys in code
- Retry on 4xx errors (except 429)
- Reuse return tokens
- Poll for updates (use webhooks)
- Store PII in customer_ref

---

## Support

- **Docs:** https://docs.arcana.returns
- **Status:** https://status.arcana.returns
- **Email:** api-support@arcana.returns
- **Discord:** https://discord.gg/arcana-dev

**Include in requests:** trace_id, timestamp, code snippet

---

## Version Info

**Current:** v0.1 (Beta)  
**Updated:** 2025-10-26  
**Changelog:** https://arcana.returns/changelog

---

_Save this reference • Print it • Share with your team_
