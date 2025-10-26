# Arcana Returns API Reference

## Authentication

All API requests (except webhooks and health checks) require an API key in the `Authorization` header:

```
Authorization: Bearer sk_your_api_key_here
```

## Policy Management

### Import Policy

```http
POST /policy/import
Content-Type: application/json

{
  "source_type": "pdf|url|text",
  "source_content": "base64_encoded_pdf_or_text",
  "source_url": "https://example.com/policy.pdf",
  "merchant_id": "merchant_123",
  "effective_at": "2025-10-25T00:00:00Z"
}
```

**Response:**
```json
{
  "policy_id": "plc_abc123",
  "snapshot_id": "plc_abc123_v1",
  "policy_snapshot_hash": "sha256:...",
  "requires_review": true,
  "extracted_fields": { ... }
}
```

### Get Policy

```http
GET /policy/:policyId
```

**Response:** Full `PolicyGraph` object

### Compare Policies

```http
GET /policy/:policyId/diff?from=snapshot_v1&to=snapshot_v2
```

**Response:** `PolicyDiff` object with changes

## Returns Flow

### Issue Return Token

```http
POST /returns/token
Content-Type: application/json

{
  "order_id": "ord_789",
  "customer_ref": "cust_456",
  "items": [
    {
      "sku": "SKU-1",
      "qty": 1,
      "price_cents": 1299
    }
  ],
  "reason_code": "doesnt_fit",
  "device_fingerprint": "dfp_abc",
  "agent_headers": {
    "agent_id": "shop-agent-42",
    "attestation": "urn:tap:claims:v1:...",
    "version": "1.0"
  },
  "policy_id": "plc_123"
}
```

**Response:**
```json
{
  "return_token": "rt.eyJ...",
  "risk_score": 0.27,
  "required_evidence": ["photo_packaging"],
  "policy_snapshot_hash": "sha256:...",
  "trace_id": "trc_9Nf...",
  "expires_at": "2025-10-25T18:15:00Z"
}
```

### Authorize Return

```http
POST /returns/authorize
Content-Type: application/json

{
  "return_token": "rt.eyJ...",
  "evidence": [
    {
      "type": "photo_packaging",
      "url": "https://cdn.example.com/evidence/pkg.jpg"
    }
  ],
  "dropoff_choice": "mail_in"
}
```

**Response:**
```json
{
  "decision": "approve",
  "conditions": {
    "restock_pct": 0,
    "window": 30
  },
  "label_credential": "lbl_xyz",
  "explanations": ["within window", "evidence provided"],
  "audit_ref": "aud_001"
}
```

### Commit Return

```http
POST /returns/commit
Content-Type: application/json

{
  "return_token": "rt.eyJ...",
  "receipt_event": {
    "type": "scan",
    "carrier": "UPS",
    "ts": "2025-10-25T18:01:00Z",
    "tracking_number": "1Z999AA10123456784"
  }
}
```

**Response:**
```json
{
  "refund_instruction": "instant",
  "final_receipt": {
    "id": "rcp_9x"
  },
  "audit_ref": "aud_002"
}
```

## AEL (Audit & Eval Ledger)

### Get Decision

```http
GET /ael/decision/:decisionId
```

**Response:** Decision with BOM

### Generate Replay

```http
POST /ael/replay/:decisionId
```

**Response:**
```json
{
  "replay_id": "rpl_abc",
  "status": "generated"
}
```

### Get Replay Artifact

```http
GET /ael/replay/:replayId
```

**Response:** Full replay artifact bundle

### Compare Decisions

```http
GET /ael/diff?baseline=dec_123&candidate=dec_456
```

**Response:** Diff report

### List Decisions

```http
GET /ael/decisions?limit=50
```

**Response:**
```json
{
  "decisions": [ ... ]
}
```

## Webhooks

### Shopify

```http
POST /webhooks/shopify
X-Shopify-Topic: orders/updated
X-Shopify-Shop-Domain: example.myshopify.com
```

### Stripe

```http
POST /webhooks/stripe
Stripe-Signature: ...
```

## Error Codes

| Code | Description |
|------|-------------|
| RT-001 | Malformed payload |
| RT-004 | Expired token |
| RT-007 | Invalid signature |
| RT-010 | Policy hash mismatch |
| RT-021 | Idempotency conflict |
| POL-001 | Policy not found |
| POL-002 | Invalid policy format |
| POL-003 | Policy parse error |
| AEL-001 | Decision not found |
| AEL-002 | Replay failed |
| AUTH-001 | Invalid API key |
| AUTH-002 | Unauthorized |
| RATE-001 | Rate limit exceeded |

## Rate Limits

Default: 100 requests per minute per API key

Burst: Up to 20 requests in a 1-second window
