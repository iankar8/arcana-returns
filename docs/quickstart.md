# Quickstart Guide

## Installation

```bash
cd arcana-returns
npm install
```

## Setup

### 1. Generate Ed25519 Keys

```bash
mkdir -p keys
openssl genpkey -algorithm ed25519 -out keys/private.pem
openssl pkey -in keys/private.pem -pubout -out keys/public.pem
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your configuration.

### 3. Initialize Database

```bash
npm run db:migrate
```

### 4. Create an API Key

```bash
npm run cli -- keys create --merchant merchant_test --name "Test Key"
```

Save the generated API key securely.

## Start the Server

```bash
npm run dev
```

Server runs at `http://localhost:3000`

## Test the API

### 1. Import a Policy

```bash
curl -X POST http://localhost:3000/policy/import \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "source_type": "text",
    "source_content": "Returns accepted within 30 days of purchase.",
    "merchant_id": "merchant_test"
  }'
```

### 2. Issue a Return Token

```bash
curl -X POST http://localhost:3000/returns/token \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "ord_test_001",
    "customer_ref": "cust_test",
    "items": [{"sku": "SHIRT-M-BLU", "qty": 1, "price_cents": 2999}],
    "reason_code": "doesnt_fit",
    "policy_id": "plc_YOUR_POLICY_ID"
  }'
```

### 3. Authorize with Evidence

```bash
curl -X POST http://localhost:3000/returns/authorize \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "return_token": "YOUR_RETURN_TOKEN",
    "evidence": [
      {"type": "photo_packaging", "url": "https://example.com/photo.jpg"}
    ],
    "dropoff_choice": "mail_in"
  }'
```

### 4. Commit the Return

```bash
curl -X POST http://localhost:3000/returns/commit \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "return_token": "YOUR_RETURN_TOKEN",
    "receipt_event": {
      "type": "scan",
      "carrier": "UPS",
      "ts": "2025-10-25T18:00:00Z"
    }
  }'
```

## CLI Usage

### Simulate a Return

```bash
npm run cli -- returns simulate \
  --order ord_123 \
  --sku SHIRT-M-BLU \
  --reason doesnt_fit \
  --policy plc_YOUR_POLICY_ID
```

### Export Replay Bundle

```bash
npm run cli -- replay export \
  --decision dec_abc123 \
  --out ./replay-bundle.json
```

### Compare Decisions

```bash
npm run cli -- replay diff \
  --baseline dec_abc \
  --candidate dec_xyz
```

### View Evidence Ladder

```bash
npm run cli -- ladder show
```

## Next Steps

- Read the [API Reference](./api-reference.md)
- Explore [Policy Graph Schema](./policy-schema.md)
- Learn about [Return Token Spec](./return-token.md)
- Set up [Shopify Integration](./shopify-adapter.md)
