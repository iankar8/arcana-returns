# Testing Guide - Arcana Returns

## Overview

This guide covers how to test the Arcana Returns system using the contract test framework, metrics endpoints, and pilot onboarding script.

## Quick Start

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test tests/returns-flow.test.ts

# Watch mode (re-run on changes)
npm test -- --watch
```

## Test Structure

### Test Files

- **`tests/setup.ts`** - Test configuration, fixtures, and utilities
- **`tests/returns-flow.test.ts`** - Core returns flow (token → authorize → commit)
- **`tests/shopify-adapter.test.ts`** - Shopify webhook processing
- **`tests/stripe-adapter.test.ts`** - Stripe refund reconciliation

### Test Database

Tests use an isolated database at `./data/test.db` that is:
- Created fresh before each test run
- Cleaned between individual tests
- Deleted after test completion

## Contract Tests

### Returns Flow Tests

Tests the complete 3-step flow:

```typescript
// 1. Issue token
const tokenResult = await returnsService.issueToken(request, merchantId);

// 2. Authorize
const authResult = await returnsService.authorize(authRequest, merchantId);

// 3. Commit
const commitResult = await returnsService.commit(commitRequest, merchantId);
```

**Coverage:**
- ✅ Token issuance with valid/invalid requests
- ✅ Risk score calculation
- ✅ Authorization decisions (approve/step_up/deny)
- ✅ Commit with receipt events
- ✅ End-to-end flow validation
- ✅ AEL logging verification

### Shopify Adapter Tests

Tests webhook event processing:

```typescript
// Store webhook event
db.prepare(`INSERT INTO shopify_events ...`).run(...);

// Process events
await processor.processPendingEvents();

// Verify results
const token = db.prepare(`SELECT * FROM return_tokens ...`).get();
```

**Coverage:**
- ✅ Event storage
- ✅ Order with return-requested tag
- ✅ Return token creation
- ✅ Order cancellation handling
- ✅ Error handling for malformed payloads

### Stripe Adapter Tests

Tests refund reconciliation:

```typescript
// Create return token + decision
// Store Stripe refund event with metadata
// Process events
// Verify token committed
```

**Coverage:**
- ✅ Refund reconciliation via metadata
- ✅ Token lookup by order_id
- ✅ Auto-commit on approved returns
- ✅ No commit for denied returns

## Metrics Endpoints

### System-Wide Metrics

```bash
curl http://localhost:3000/metrics \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response:**
```json
{
  "timestamp": "2025-10-26T08:00:00.000Z",
  "decisions": {
    "last_24h": {
      "approve": 45,
      "step_up": 12,
      "deny": 3
    },
    "total": 234,
    "avg_risk_score": 0.42
  },
  "tokens": {
    "issued_24h": 60,
    "committed_24h": 48
  },
  "events": {
    "pending_shopify": 0,
    "pending_stripe": 0
  },
  "merchants": {
    "active_7d": 2
  }
}
```

### Per-Merchant Metrics

```bash
curl http://localhost:3000/metrics/merchant/merchant_test \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response:**
```json
{
  "merchant_id": "merchant_test",
  "decisions_7d": {
    "approve": 23,
    "step_up": 5,
    "deny": 1
  },
  "avg_risk_score": 0.38,
  "active_policy": {
    "policy_id": "plc_...",
    "hash": "abc123...",
    "return_window_days": 30
  },
  "recent_decisions": [...]
}
```

### Timeline View

```bash
curl http://localhost:3000/metrics/timeline \
  -H "Authorization: Bearer YOUR_API_KEY"
```

Shows hourly decision counts for the last 24 hours.

### Health Check

```bash
curl http://localhost:3000/metrics/health \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response:**
```json
{
  "status": "healthy",
  "checks": {
    "database": "ok",
    "event_processing": "ok"
  },
  "issues": []
}
```

## Pilot Onboarding Script

Automates merchant setup and validation:

```bash
./scripts/onboard-pilot.sh merchant_nordstrom text
```

**What it does:**
1. ✅ Creates API key
2. ✅ Imports return policy
3. ✅ Tests token issuance
4. ✅ Tests authorization
5. ✅ Tests commit
6. ✅ Generates onboarding report

**Output files:**
- `./data/pilots/{merchant}_api_key.txt`
- `./data/pilots/{merchant}_policy.json`
- `./data/pilots/{merchant}_onboarding_report.md`

### Example Usage

**With text policy:**
```bash
./scripts/onboard-pilot.sh merchant_zappos text
# Then paste policy text when prompted
```

**With URL:**
```bash
./scripts/onboard-pilot.sh merchant_nordstrom url https://nordstrom.com/returns
```

## Manual Testing

### Test Full Flow

```bash
# 1. Import policy
curl -X POST http://localhost:3000/policy/import \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "source_type": "text",
    "source_content": "Returns within 30 days",
    "merchant_id": "merchant_test"
  }'

# 2. Issue token
curl -X POST http://localhost:3000/returns/token \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "ord_001",
    "customer_ref": "cust_001",
    "items": [{"sku": "TEST", "qty": 1, "price_cents": 2999, "name": "Test"}],
    "reason_code": "doesnt_fit",
    "policy_id": "POLICY_ID_FROM_STEP_1"
  }'

# 3. Authorize
curl -X POST http://localhost:3000/returns/authorize \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "return_token": "TOKEN_FROM_STEP_2",
    "evidence": [{"type": "photo_packaging", "url": "https://example.com/photo.jpg"}],
    "dropoff_choice": "mail_in"
  }'

# 4. Commit
curl -X POST http://localhost:3000/returns/commit \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "return_token": "TOKEN_FROM_STEP_2",
    "receipt_event": {"type": "scan", "carrier": "UPS", "ts": "2025-10-26T08:00:00Z"}
  }'
```

### Test Event Processing

```bash
# Manually trigger event processing
npm run cli -- process events

# Check pending events
sqlite3 ./data/arcana.db "SELECT COUNT(*) FROM shopify_events WHERE processed = 0"
sqlite3 ./data/arcana.db "SELECT COUNT(*) FROM stripe_events WHERE processed = 0"
```

## CLI Testing Commands

```bash
# Simulate a return
npm run cli -- returns simulate \
  --order ord_test_001 \
  --sku SHIRT-M-BLUE \
  --reason doesnt_fit \
  --merchant merchant_test

# List recent decisions
npm run cli -- returns list --merchant merchant_test

# Export replay bundle
npm run cli -- replay export --decision DECISION_ID --out replay.json

# Compare decisions
npm run cli -- replay diff --baseline DEC_1 --candidate DEC_2

# View evidence ladder
npm run cli -- ladder show

# Manage API keys
npm run cli -- keys create --merchant merchant_test --name "Test Key"
npm run cli -- keys list --merchant merchant_test
npm run cli -- keys revoke --key KEY_ID
```

## Test Coverage Goals

- **Unit Tests:** ≥80% coverage
- **Integration Tests:** All critical paths
- **Contract Tests:** All adapter interfaces
- **End-to-End:** Complete flows validated

## Continuous Integration

Add to your CI pipeline:

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
```

## Debugging Tests

```bash
# Run with verbose output
npm test -- --reporter=verbose

# Run single test
npm test -- -t "should issue a return token"

# Debug mode
node --inspect-brk node_modules/.bin/vitest
```

## Golden Set Validation

Create a golden set of 50 test decisions:

```bash
# Generate golden set
for i in {1..50}; do
  npm run cli -- returns simulate \
    --order "ord_golden_$i" \
    --sku "SKU_$i" \
    --reason doesnt_fit \
    --merchant merchant_test
done

# Export for replay testing
npm run cli -- returns list --merchant merchant_test > golden_set.json
```

## Performance Testing

```bash
# Load test with autocannon
npm install -g autocannon

autocannon -c 10 -d 30 \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -m POST \
  -b '{"order_id":"ord_load_test","customer_ref":"cust_test","items":[{"sku":"TEST","qty":1,"price_cents":2999,"name":"Test"}],"reason_code":"doesnt_fit","policy_id":"POLICY_ID"}' \
  http://localhost:3000/returns/token
```

## Troubleshooting

### Tests Failing

1. Check test database: `ls -la ./data/test.db`
2. Verify Node version: `node --version` (should be 20+)
3. Clean and reinstall: `rm -rf node_modules && npm install`
4. Check logs: Tests output to console

### Metrics Not Showing Data

1. Verify API key is valid
2. Check database has data: `sqlite3 ./data/arcana.db "SELECT COUNT(*) FROM decisions"`
3. Ensure server is running: `curl http://localhost:3000/health`

### Onboarding Script Fails

1. Check API URL: `echo $API_URL`
2. Verify jq is installed: `brew install jq`
3. Check server logs for errors
4. Ensure database is writable

---

**Next:** Run the test suite and review coverage reports!
