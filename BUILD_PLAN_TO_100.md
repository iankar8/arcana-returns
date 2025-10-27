# Build Plan: Returns API 80% → 100%

## 🎯 Goal
Complete all critical gaps to reach production-ready Returns API

**Timeline:** 2 days (12-18 hours)  
**Current:** 80% complete  
**Target:** 100% complete

---

## 📋 Phase 1: P0 - Production Safety (Day 1, Morning - 6-9 hours)

### Task 1.1: Idempotency Middleware (2-3 hours)

**Goal:** Prevent duplicate requests from causing duplicate returns/refunds

**Files to Create:**
- `src/server/middleware/idempotency.ts`

**Files to Modify:**
- `src/server/index.ts` - Register middleware
- `src/server/routes/returns.ts` - Store responses

**Implementation Steps:**

1. **Create middleware** (45 min)
```typescript
// src/server/middleware/idempotency.ts
- Check for Idempotency-Key header
- Query idempotency_keys table
- If exists and not expired: return cached response
- If new: attach key to request for later storage
```

2. **Register middleware** (15 min)
```typescript
// src/server/index.ts
- Import idempotency middleware
- Register before route handlers
- Apply to POST endpoints only
```

3. **Store responses** (45 min)
```typescript
// src/server/routes/returns.ts
- After successful response
- Store: key, merchant_id, endpoint, request_hash, response
- Set expiry: 24 hours
- Handle errors gracefully
```

4. **Add tests** (30 min)
```typescript
// Test duplicate requests return same response
// Test expired keys allow new requests
// Test different merchants isolated
```

**Acceptance Criteria:**
- ✅ Duplicate requests return cached response
- ✅ Response includes `X-Idempotency-Replay: true` header
- ✅ Keys expire after 24 hours
- ✅ Per-merchant isolation

**Validation:**
```bash
# Test duplicate token request
curl -X POST http://localhost:3000/returns/token \
  -H "Idempotency-Key: test-key-123" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"order_id":"ord_123",...}'

# Second request should return same token
curl -X POST http://localhost:3000/returns/token \
  -H "Idempotency-Key: test-key-123" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"order_id":"ord_123",...}'
```

---

### Task 1.2: Evidence Validation Service (4-6 hours)

**Goal:** Validate evidence URLs are accessible and meet quality standards

**Files to Create:**
- `src/services/evidence-validator.ts`
- `src/types/evidence.ts` (extend existing)

**Files to Modify:**
- `src/services/returns.ts` - Call validator in authorize()
- `src/types/common.ts` - Add validation error codes

**Implementation Steps:**

1. **Create validator service** (2 hours)
```typescript
// src/services/evidence-validator.ts
- validateEvidence(evidence[]) method
- checkUrlAccessible() - HEAD request
- checkContentType() - image/*, application/pdf
- checkFileSize() - max 10MB
- checkImageQuality() - optional, basic checks
```

2. **Add validation to authorize** (1 hour)
```typescript
// src/services/returns.ts - authorize()
- Before making decision
- Call evidenceValidator.validate()
- If invalid: return error with reason
- If valid: proceed with authorization
```

3. **Add error codes** (30 min)
```typescript
// src/types/common.ts
- EV_001: Evidence URL not accessible
- EV_002: Invalid content type
- EV_003: File too large
- EV_004: Image quality too low
```

4. **Add retry logic for transient failures** (1 hour)
```typescript
// Handle network timeouts
// Retry 3 times with backoff
// Distinguish permanent vs transient errors
```

5. **Add tests** (1 hour)
```typescript
// Test valid evidence passes
// Test broken URL fails
// Test wrong content-type fails
// Test oversized file fails
```

**Acceptance Criteria:**
- ✅ Broken URLs rejected with clear error
- ✅ Wrong content-types rejected
- ✅ Files >10MB rejected
- ✅ Transient failures retried
- ✅ Validation errors include suggestions

**Validation:**
```bash
# Test with broken URL
curl -X POST http://localhost:3000/returns/authorize \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "return_token": "...",
    "evidence": [
      {"type": "photo", "url": "https://broken-url.com/image.jpg"}
    ]
  }'
# Should return: EV_001 with suggestion

# Test with valid URL
curl -X POST http://localhost:3000/returns/authorize \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "return_token": "...",
    "evidence": [
      {"type": "photo", "url": "https://valid-cdn.com/image.jpg"}
    ]
  }'
# Should succeed
```

---

## 📋 Phase 2: P1 - Reliability (Day 1, Afternoon - 4-6 hours)

### Task 2.1: Webhook Retry Logic (3-4 hours)

**Goal:** Ensure failed webhook processing doesn't lose events

**Files to Create:**
- `src/services/webhook-retry.ts`
- `src/db/migrations/002_webhook_failures.sql`

**Files to Modify:**
- `src/services/shopify-processor.ts` - Use retry service
- `src/services/stripe-processor.ts` - Use retry service
- `src/services/background-processor.ts` - Process failures

**Implementation Steps:**

1. **Create retry service** (1.5 hours)
```typescript
// src/services/webhook-retry.ts
- processWithRetry(eventId, processor)
- Exponential backoff: 1s, 2s, 4s, 8s, 16s
- Max 5 retries
- Move to DLQ after max retries
- Log each attempt
```

2. **Add failures table** (30 min)
```sql
-- src/db/migrations/002_webhook_failures.sql
CREATE TABLE webhook_failures (
  failure_id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  error TEXT NOT NULL,
  attempts INTEGER NOT NULL,
  last_attempt TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

3. **Update processors** (1 hour)
```typescript
// src/services/shopify-processor.ts
- Wrap processing in retryService.processWithRetry()
- Handle errors gracefully
- Log to failures table on max retries

// src/services/stripe-processor.ts
- Same pattern
```

4. **Add DLQ processor** (30 min)
```typescript
// src/services/background-processor.ts
- Add job to retry failed events
- Run every hour
- Attempt failed events again
- Alert if DLQ growing
```

5. **Add tests** (30 min)
```typescript
// Test retry on transient failure
// Test DLQ on permanent failure
// Test exponential backoff timing
```

**Acceptance Criteria:**
- ✅ Transient failures retried automatically
- ✅ Permanent failures moved to DLQ
- ✅ DLQ events retried periodically
- ✅ All attempts logged

**Validation:**
```bash
# Simulate webhook failure
# Check logs show retries
# Check DLQ table after max retries
sqlite3 ./data/arcana.db "SELECT * FROM webhook_failures"

# Manually retry failed event
npm run cli -- process failures
```

---

### Task 2.2: Per-Endpoint Rate Limiting (1-2 hours)

**Goal:** Protect expensive endpoints and prevent abuse

**Files to Modify:**
- `src/server/index.ts` - Update rate limit config

**Implementation Steps:**

1. **Update rate limit config** (45 min)
```typescript
// src/server/index.ts
- Remove global rate limit
- Add per-endpoint limits:
  - /returns/token: 50/min (expensive)
  - /returns/authorize: 100/min
  - /returns/commit: 100/min
  - /policy/*: 200/min (reads)
  - /ael/*: 200/min (reads)
- Key by: merchantId + endpoint
```

2. **Add rate limit headers** (30 min)
```typescript
// Add to response:
- X-RateLimit-Limit
- X-RateLimit-Remaining
- X-RateLimit-Reset
```

3. **Add tests** (15 min)
```typescript
// Test limits enforced per endpoint
// Test different merchants isolated
// Test headers present
```

**Acceptance Criteria:**
- ✅ Different limits per endpoint
- ✅ Per-merchant isolation
- ✅ Rate limit headers in response
- ✅ 429 status on exceeded

**Validation:**
```bash
# Test token endpoint limit (50/min)
for i in {1..60}; do
  curl -X POST http://localhost:3000/returns/token \
    -H "Authorization: Bearer $API_KEY" \
    -d '{"order_id":"ord_'$i'",...}'
done
# Should get 429 after 50 requests

# Check headers
curl -I http://localhost:3000/returns/token \
  -H "Authorization: Bearer $API_KEY"
# Should see X-RateLimit-* headers
```

---

## 📋 Phase 3: P2 - Developer Experience (Day 2, Morning - 2-3 hours)

### Task 3.1: Improve Error Messages (2-3 hours)

**Goal:** Make errors actionable with suggestions and docs links

**Files to Create:**
- `src/types/error-catalog.ts`

**Files to Modify:**
- `src/types/common.ts` - Update ArcanaError class
- All service files - Use new error format

**Implementation Steps:**

1. **Create error catalog** (1 hour)
```typescript
// src/types/error-catalog.ts
export const ErrorCatalog = {
  POL_001: {
    message: 'Policy not found',
    suggestion: 'Ensure policy_id exists. List policies: GET /policy',
    docs: 'https://docs.arcana.com/errors/POL_001',
    httpStatus: 404
  },
  RT_001: {
    message: 'Return token expired',
    suggestion: 'Tokens expire after 15 minutes. Request new token.',
    docs: 'https://docs.arcana.com/errors/RT_001',
    httpStatus: 401
  },
  RT_002: {
    message: 'Return token already used',
    suggestion: 'Tokens are single-use. Request new token for new return.',
    docs: 'https://docs.arcana.com/errors/RT_002',
    httpStatus: 409
  },
  EV_001: {
    message: 'Evidence URL not accessible',
    suggestion: 'Ensure URL is publicly accessible and returns 200 OK.',
    docs: 'https://docs.arcana.com/errors/EV_001',
    httpStatus: 400
  },
  // ... 20+ error codes
};
```

2. **Update ArcanaError class** (30 min)
```typescript
// src/types/common.ts
export class ArcanaError extends Error {
  toJSON() {
    const errorInfo = ErrorCatalog[this.code];
    return {
      error: {
        code: this.code,
        message: errorInfo.message,
        suggestion: errorInfo.suggestion,
        docs: errorInfo.docs,
        trace_id: this.traceId,
        timestamp: new Date().toISOString()
      }
    };
  }
}
```

3. **Update all error throws** (1 hour)
```typescript
// Update all services to use catalog
// Ensure all errors have codes
// Add context where helpful
```

4. **Add error documentation** (30 min)
```markdown
// docs/errors.md
# Error Reference
## POL_001 - Policy Not Found
...
```

**Acceptance Criteria:**
- ✅ All errors have codes
- ✅ All errors have suggestions
- ✅ All errors have docs links
- ✅ Errors include trace_id

**Validation:**
```bash
# Test error format
curl -X POST http://localhost:3000/returns/token \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"policy_id":"invalid",...}'

# Should return:
{
  "error": {
    "code": "POL_001",
    "message": "Policy not found",
    "suggestion": "Ensure policy_id exists. List policies: GET /policy",
    "docs": "https://docs.arcana.com/errors/POL_001",
    "trace_id": "trc_abc123",
    "timestamp": "2025-10-26T14:00:00Z"
  }
}
```

---

## 📋 Phase 4: Testing & Validation (Day 2, Afternoon - 2-3 hours)

### Task 4.1: Integration Testing (1-2 hours)

**Goal:** Validate all changes work together

**Test Scenarios:**

1. **Idempotency Test**
```bash
# Issue duplicate token requests
# Verify same token returned
# Verify idempotency headers present
```

2. **Evidence Validation Test**
```bash
# Submit broken evidence URL
# Verify rejection with clear error
# Submit valid evidence
# Verify acceptance
```

3. **Webhook Retry Test**
```bash
# Simulate webhook failure
# Verify retries in logs
# Verify DLQ after max retries
```

4. **Rate Limit Test**
```bash
# Exceed endpoint limit
# Verify 429 response
# Verify rate limit headers
```

5. **Error Message Test**
```bash
# Trigger various errors
# Verify format and suggestions
```

### Task 4.2: Documentation Update (1 hour)

**Update Files:**
- `IMPLEMENTATION_STATUS.md` - Mark items complete
- `RETURNS_GAP_ANALYSIS.md` - Update status
- `docs/api-reference.md` - Add error codes
- `README.md` - Update status to 100%

---

## 📊 Summary

### Timeline
| Phase | Tasks | Time | Status |
|-------|-------|------|--------|
| P0 | Idempotency + Evidence | 6-9h | Pending |
| P1 | Retry + Rate Limit | 4-6h | Pending |
| P2 | Error Messages | 2-3h | Pending |
| Testing | Integration + Docs | 2-3h | Pending |
| **Total** | **6 tasks** | **14-21h** | **0% → 100%** |

### Deliverables
- ✅ Idempotency middleware (production-safe)
- ✅ Evidence validation (data quality)
- ✅ Webhook retry logic (reliability)
- ✅ Per-endpoint rate limits (abuse prevention)
- ✅ Descriptive error messages (DX)
- ✅ Integration tests (confidence)
- ✅ Updated documentation (completeness)

### Success Criteria
**Returns API is 100% when:**
- [x] All 3 endpoints working
- [x] JWT signing/verification
- [x] Risk scoring
- [x] Evidence ladder
- [x] AEL logging
- [ ] **Idempotency enforced** ← Build in P0
- [ ] **Evidence validated** ← Build in P0
- [ ] **Webhook retry logic** ← Build in P1
- [ ] **Per-endpoint rate limits** ← Build in P1
- [ ] **Descriptive errors** ← Build in P2

**After completion: 13/13 items = 100%**

---

## 🚀 Execution Order

### Day 1 Morning (P0)
1. Start: Idempotency middleware
2. Then: Evidence validation
3. Test both together

### Day 1 Afternoon (P1)
4. Start: Webhook retry logic
5. Then: Per-endpoint rate limits
6. Test both together

### Day 2 Morning (P2)
7. Build: Error message improvements
8. Test: All error scenarios

### Day 2 Afternoon (Testing)
9. Run: Full integration tests
10. Update: All documentation
11. Deploy: Ready for pilots

---

## 🎯 Next Steps

**Ready to start?**

1. **Confirm plan** - Any changes needed?
2. **Start with P0.1** - Build idempotency middleware
3. **Then P0.2** - Build evidence validation
4. **Continue through P1, P2**
5. **Test everything**
6. **Update docs**
7. **Ship 100% complete Returns API**

**Want me to start building P0.1 (idempotency middleware)?**
