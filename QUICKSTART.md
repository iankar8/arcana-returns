# Arcana Returns API - Quickstart Guide

Get up and running in 5 minutes! 🚀

---

## 1. Install & Setup (1 minute)

```bash
# Clone and install
cd /Users/iankar/CascadeProjects/arcana-returns
npm install

# Initialize database
npm run db:init

# Create .env file
cp .env.example .env
```

Edit `.env`:
```bash
JWT_SECRET=$(openssl rand -base64 32)
JWT_ISSUER=arcana
DATABASE_PATH=./data/arcana.db
LOG_LEVEL=info
```

---

## 2. Generate API Key (30 seconds)

```bash
# Generate API key for test merchant
npm run cli -- keys generate --merchant test_merchant

# Copy the generated API key (starts with sk_)
export API_KEY="sk_..."
```

---

## 3. Create a Policy (30 seconds)

```bash
# Create default policy
npm run cli -- policy create --id plc_test --file ./examples/policy-basic.json

# Or use existing policy
export POLICY_ID="plc_NFB5TJw3uVnS"
```

---

## 4. Start Server (30 seconds)

```bash
# Development mode
npm run dev

# Server starts on http://localhost:3000
```

Check health:
```bash
curl http://localhost:3000/health
# {"status":"ok","version":"0.1.0","timestamp":"..."}
```

---

## 5. Test the API (2 minutes)

### Step 1: Issue Return Token

```bash
curl -X POST http://localhost:3000/returns/token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "order_id": "ord_test_001",
    "customer_ref": "cust_001",
    "items": [
      {
        "sku": "SHIRT-M",
        "qty": 1,
        "price_cents": 2999
      }
    ],
    "reason_code": "doesnt_fit",
    "policy_id": "'$POLICY_ID'"
  }'
```

**Response:**
```json
{
  "return_token": "rt.eyJ...",
  "risk_score": 0.2,
  "required_evidence": ["photo_packaging"]
}
```

Save the `return_token`!

---

### Step 2: Authorize Return

```bash
export RETURN_TOKEN="rt.eyJ..."

curl -X POST http://localhost:3000/returns/authorize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "return_token": "'$RETURN_TOKEN'",
    "evidence": [
      {
        "type": "photo_packaging",
        "url": "https://picsum.photos/800/600.jpg"
      }
    ]
  }'
```

**Response:**
```json
{
  "decision": "approve",
  "conditions": {
    "restock_pct": 0,
    "window": 30
  },
  "label_credential": "lbl_xyz123",
  "audit_ref": "aud_abc456"
}
```

---

### Step 3: Commit Return

```bash
curl -X POST http://localhost:3000/returns/commit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "return_token": "'$RETURN_TOKEN'",
    "receipt_event": {
      "type": "scan",
      "carrier": "UPS",
      "ts": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"
    }
  }'
```

**Response:**
```json
{
  "refund_instruction": "instant",
  "final_receipt": {
    "return_id": "ret_123",
    "refund_amount_cents": 2999
  },
  "audit_ref": "aud_def789"
}
```

---

## ✅ Success!

You've completed a full returns flow! 🎉

---

## 🎯 Next Steps

### Explore Features

```bash
# Check system stats
npm run cli -- maintenance stats

# View rate limits
npm run cli -- maintenance rate-limits

# Check DLQ
npm run cli -- maintenance dlq-stats
```

### Test Error Handling

```bash
# Invalid token
curl -X POST http://localhost:3000/returns/authorize \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"return_token":"invalid"}'

# Expected: Helpful error with suggestions
```

### Test Idempotency

```bash
# Same request twice with idempotency key
curl -X POST http://localhost:3000/returns/token \
  -H "Authorization: Bearer $API_KEY" \
  -H "Idempotency-Key: test-key-001" \
  -H "Content-Type: application/json" \
  -d '{"order_id":"ord_idem","customer_ref":"c","items":[{"sku":"T","qty":1,"price_cents":1999}],"reason_code":"doesnt_fit","policy_id":"'$POLICY_ID'"}'

# Run again - should get SAME token
```

---

## 📚 Learn More

- **[API Reference](./docs/api-reference-enhanced.md)** - Full endpoint docs
- **[Production Readiness](./PRODUCTION_READINESS.md)** - Deployment guide
- **[Implementation Summary](./IMPLEMENTATION_SUMMARY.md)** - What was built

---

## 🐛 Troubleshooting

### Server won't start
```bash
# Check if port 3000 is in use
lsof -i :3000

# Use different port
PORT=3001 npm run dev
```

### Database errors
```bash
# Reinitialize database
rm -rf ./data/arcana.db
npm run db:init
```

### API key not working
```bash
# Regenerate key
npm run cli -- keys generate --merchant test_merchant --force
```

---

## 🎉 You're Ready!

The Arcana Returns API is running and ready for integration.

**Questions?** Check the docs or reach out to eng@arcana.dev

**Happy coding!** 🚀
