# Documentation Update Required

## 🚨 Critical Issues Found

After analyzing the Mintlify docs against the deployed API at **https://arcana-returns-api.fly.dev**, several critical discrepancies were found that need immediate updates.

---

## 1. ❌ INCORRECT BASE URL

### Current (WRONG):
```
https://arcana-returns-api.fly.dev
https://arcana-returns-api.fly.dev
```

### Correct (DEPLOYED):
```
https://arcana-returns-api.fly.dev
```

**Files to Update:**
- `introduction.mdx` (lines 92, 114, 132)
- `authentication.mdx` (lines 82, 86, 92, 106, 152, 166)
- `quickstart.mdx` (lines 31, 49, 72, 93, 116, 136, 155, 176)
- `openapi.yaml` (lines 16, 27-30)

---

## 2. 🆕 MISSING PRODUCTION FEATURES (P0-P4)

The deployed API has **15 major production features** that are **completely undocumented**:

### P0: Production Safety
#### ✅ Idempotency (MISSING from docs)
**What it does:** Prevents duplicate operations with `Idempotency-Key` header

**Should document:**
```http
POST /returns/token
Idempotency-Key: unique-request-id-12345
Authorization: Bearer sk_...
```

**Behavior:**
- Same key returns cached response (200)
- Concurrent requests with same key return 429
- Keys expire after 24 hours

**Where to add:**
- New section in `quickstart.mdx`
- Add to `openapi.yaml` request headers
- Mention in error handling docs

#### ✅ Evidence Validation (MISSING from docs)
**What it does:** Pre-validates evidence URLs before processing

**Validation checks:**
- URL format (HTTPS required)
- Accessibility (200 OK response)
- Content-type verification
- File size limits (10MB max)
- Image quality warnings

**Error codes (undocumented):**
- `EV-001`: HTTPS required
- `EV-004`: URL not accessible
- `EV-009`: Content type mismatch
- `EV-011`: File size exceeded

**Where to add:**
- New section in `/authorize` endpoint docs
- Add error codes to `openapi.yaml`
- Create troubleshooting guide

---

### P1: Reliability
#### ✅ Webhook Retry Logic (MISSING from docs)
**What it does:** Automatic retry with exponential backoff

**Retry strategy:**
1. Attempt 1: Immediate
2. Attempt 2: Wait 1s
3. Attempt 3: Wait 2s
4. Attempt 4: Wait 4s
5. Attempt 5: Wait 8s
6. After 5 failures: Move to Dead Letter Queue (DLQ)

**DLQ Management (undocumented):**
- CLI command to view: (needs SSH access)
- CLI command to retry: (needs SSH access)
- Automatic retry: Hourly

**Where to add:**
- New page: `guides/webhook-reliability.mdx`
- Add to webhook documentation
- Create DLQ troubleshooting guide

#### ✅ Per-Endpoint Rate Limiting (WRONG in docs)
**Current docs say:** "Standard: 100 requests/minute"

**Reality:**
| Endpoint | Limit |
|----------|-------|
| `/returns/token` | 100 req/min |
| `/returns/authorize` | 50 req/min |
| `/returns/commit` | 50 req/min |
| `/webhooks/shopify` | 200 req/min |
| `/webhooks/stripe` | 200 req/min |
| Other endpoints | 1000 req/min (global fallback) |

**Rate limit headers (partially documented):**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 45
X-RateLimit-Window: 60
Retry-After: 45
```

**Where to update:**
- Fix `authentication.mdx` rate limits table (line 132-137)
- Update `openapi.yaml` rate limit descriptions
- Add per-endpoint limits to API reference

---

### P2: Developer Experience
#### ✅ Enhanced Error Messages (PARTIALLY documented)
**What's different:** Field-specific errors with actionable suggestions

**Current error format in docs:**
```json
{
  "error": "Invalid request"
}
```

**Actual deployed format:**
```json
{
  "error": {
    "code": "VALIDATION-001",
    "message": "Request validation failed",
    "suggestion": "Check the fields array for specific validation errors...",
    "fields": [
      {
        "field": "items.0.sku",
        "issue": "Required",
        "example": "SHIRT-M"
      }
    ],
    "docs_url": "https://docs.arcana.dev/errors/VALIDATION-001",
    "trace_id": "trc_abc123"
  }
}
```

**Where to update:**
- Update all error examples in `openapi.yaml`
- Add comprehensive error codes page
- Update `authentication.mdx` error table (line 119-123)

---

### P3: Observability
#### ✅ Health & Metrics Endpoints (MISSING from docs)

**New endpoints not documented:**

##### GET /health/detailed
Returns comprehensive system status:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-27T04:07:09.842Z",
  "version": "0.1.0",
  "checks": {
    "database": {"status": "up"},
    "dlq": {"status": "ok", "unresolved": 0, "total": 0},
    "rateLimits": {"status": "ok", "activeEndpoints": 5}
  },
  "metrics": {
    "requests": {
      "total": 4,
      "avgDuration": 9,
      "errorRate": 0
    }
  }
}
```

##### GET /metrics
Prometheus-compatible metrics:
```
# HELP arcana_requests_total Total number of requests
# TYPE arcana_requests_total counter
arcana_requests_total 1234

# HELP arcana_request_duration_ms Average request duration
# TYPE arcana_request_duration_ms gauge
arcana_request_duration_ms 85

# HELP arcana_error_rate Request error rate
# TYPE arcana_error_rate gauge
arcana_error_rate 0.02

# HELP arcana_dlq_unresolved Unresolved DLQ events
# TYPE arcana_dlq_unresolved gauge
arcana_dlq_unresolved 0
```

**Where to add:**
- Add to `openapi.yaml` under Health tag
- Create `guides/monitoring.mdx`
- Add to quickstart for testing

---

### P4: Operations
#### ✅ Admin Endpoints (UNDOCUMENTED)

##### POST /admin/init-db
Initializes database tables (no auth required)

**Where to add:**
- Internal docs only (security concern)
- Or document with warning about securing in production

---

## 3. ❌ INCOMPLETE ERROR CODES

### Documented Error Codes:
- `AUTH-001`, `AUTH-002`
- `RT-004`
- `POL-001`
- `RATE-001`

### Missing Error Codes (deployed but undocumented):
- `VALIDATION-001` - Request validation failed
- `RT-001` - Malformed request
- `RT-003` - Items outside return window
- `RT-006` - Token not found
- `RT-007` - Invalid token signature
- `RT-008` - Evidence incomplete
- `RT-010` - Policy hash mismatch
- `RT-011` - Not yet authorized
- `RT-021` - Already committed (idempotency)
- `EV-001` - HTTPS required for evidence
- `EV-004` - Evidence URL not accessible
- `EV-009` - Content type mismatch
- `EV-011` - File size exceeded
- `INTERNAL-001` - Internal server error

**Where to add:**
- Create comprehensive error codes reference page
- Link from each endpoint in `openapi.yaml`
- Add to troubleshooting section

---

## 4. ❌ MISSING HEADERS DOCUMENTATION

### Idempotency-Key (MISSING)
```http
Idempotency-Key: unique-request-id
```
**Required for:** All POST endpoints (optional but recommended)

### Request Headers (Update needed)
Current docs show:
```http
Authorization: Bearer sk_...
Content-Type: application/json
```

Should also mention:
```http
Idempotency-Key: unique-id  # Recommended for safety
```

**Where to add:**
- Update all request examples in `quickstart.mdx`
- Add to `openapi.yaml` parameters
- Create best practices guide

---

## 5. ⚠️ RATE LIMIT INCONSISTENCIES

### Current docs (authentication.mdx line 132):
```markdown
| Tier | Requests/Minute | Burst |
|------|-----------------|-------|
| Free | 60 | 10/sec |
| Standard | 100 | 20/sec |
| Enterprise | Custom | Custom |
```

### Reality:
**Per-endpoint limits** (not account-wide):
- Token: 100/min
- Authorize: 50/min
- Commit: 50/min
- Webhooks: 200/min

**No tier system** - same limits for all users

**Where to fix:**
- Replace tier table with per-endpoint table
- Update description to clarify per-endpoint
- Update `openapi.yaml` rate limit descriptions

---

## 6. 🆕 MISSING FEATURES DOCUMENTATION

### Request Logging (undocumented)
All requests include `trace_id` for debugging:
```json
{
  "trace_id": "trc_9Nf2kL5p"
}
```

### Performance Metrics (undocumented)
- p99 latency targets
- Throughput capacity
- Availability SLA

### Operational Features (undocumented)
- Database initialization
- Volume management
- Backup procedures

**Where to add:**
- Create `guides/production-ops.mdx`
- Add to deployment guide
- Link from monitoring docs

---

## 7. 📝 EXAMPLES NEED UPDATING

### All code examples use wrong base URL
**Find & replace across all files:**
- `https://arcana-returns-api.fly.dev` → `https://arcana-returns-api.fly.dev`
- `https://arcana-returns-api.fly.dev` → `https://arcana-returns-api.fly.dev`

### Examples should include:
1. **Idempotency-Key** header in all POST requests
2. **Trace ID** in responses
3. **Enhanced error format** in error examples
4. **Rate limit headers** in success responses

---

## 8. 🔄 OPENAPI.YAML COMPREHENSIVE UPDATES NEEDED

### Add Components:

#### New Request Headers:
```yaml
components:
  parameters:
    IdempotencyKey:
      name: Idempotency-Key
      in: header
      description: Unique key for idempotent requests
      schema:
        type: string
        example: req_abc123xyz
```

#### Update Response Headers:
```yaml
headers:
  X-RateLimit-Limit:
    schema:
      type: integer
    description: Rate limit for this endpoint
  X-RateLimit-Remaining:
    schema:
      type: integer
    description: Requests remaining in window
  X-RateLimit-Reset:
    schema:
      type: integer
    description: Seconds until limit resets
  X-RateLimit-Window:
    schema:
      type: integer
    description: Window size in seconds
```

#### Update Error Schemas:
```yaml
components:
  schemas:
    EnhancedError:
      type: object
      properties:
        error:
          type: object
          properties:
            code:
              type: string
            message:
              type: string
            suggestion:
              type: string
            fields:
              type: array
              items:
                type: object
            docs_url:
              type: string
            trace_id:
              type: string
```

---

## 9. ✅ QUICK FIXES

### Files that need immediate URL updates:
1. `introduction.mdx` - All example URLs
2. `authentication.mdx` - All example URLs
3. `quickstart.mdx` - All example URLs
4. `openapi.yaml` - servers section

### Command to fix:
```bash
cd mintlify-docs
find . -type f -name "*.mdx" -o -name "*.yaml" | xargs sed -i '' 's|https://arcana-returns-api.fly.dev|https://arcana-returns-api.fly.dev|g'
find . -type f -name "*.mdx" -o -name "*.yaml" | xargs sed -i '' 's|https://arcana-returns-api.fly.dev|https://arcana-returns-api.fly.dev|g'
```

---

## 10. 📋 NEW PAGES TO CREATE

### Essential New Documentation Pages:

1. **`guides/idempotency.mdx`**
   - How idempotency works
   - When to use it
   - Best practices
   - Error handling

2. **`guides/evidence-validation.mdx`**
   - Validation rules
   - Supported formats
   - Error codes
   - Troubleshooting

3. **`guides/webhook-reliability.mdx`**
   - Retry strategy
   - DLQ management
   - Monitoring webhooks
   - Manual retry procedures

4. **`guides/rate-limiting.mdx`**
   - Per-endpoint limits
   - Rate limit headers
   - Handling 429 errors
   - Backoff strategies

5. **`guides/monitoring.mdx`**
   - Health endpoints
   - Metrics endpoint
   - Prometheus integration
   - Alerting setup

6. **`guides/error-handling.mdx`**
   - Enhanced error format
   - All error codes
   - Field-specific errors
   - Using trace_id for support

7. **`reference/error-codes.mdx`**
   - Complete error code list
   - Descriptions
   - Resolutions
   - Examples

8. **`guides/production-ops.mdx`**
   - Database management
   - Backup procedures
   - Scaling
   - Maintenance

---

## 11. 🎯 PRIORITY ORDER

### Priority 1 (CRITICAL - Do First):
1. ✅ Fix all base URLs
2. ✅ Update rate limits documentation
3. ✅ Add idempotency documentation
4. ✅ Update error format examples

### Priority 2 (HIGH - Do Next):
5. ✅ Add /health/detailed documentation
6. ✅ Add /metrics documentation
7. ✅ Document evidence validation
8. ✅ Add comprehensive error codes page

### Priority 3 (MEDIUM - Do Soon):
9. ✅ Add webhook retry documentation
10. ✅ Create monitoring guide
11. ✅ Update OpenAPI spec completely
12. ✅ Add idempotency to all examples

### Priority 4 (LOW - Nice to Have):
13. ✅ Production operations guide
14. ✅ Advanced troubleshooting
15. ✅ Performance documentation

---

## 📊 Summary

**Total Issues Found:** 11 major categories
**Files Needing Updates:** 7 existing files
**New Files Needed:** 8 new guide pages
**Estimated Effort:** 4-6 hours for complete update

**Immediate Actions Required:**
1. Change all URLs to `https://arcana-returns-api.fly.dev`
2. Add idempotency documentation
3. Fix rate limits table
4. Update error format examples

**This documentation is currently INACCURATE and will mislead developers!**

---

## 🔗 Related Files

For accurate implementation details, see:
- `P0_IDEMPOTENCY_VALIDATION.md`
- `P0_EVIDENCE_VALIDATION.md`
- `P1_WEBHOOK_RETRY.md`
- `P1_ENDPOINT_RATE_LIMIT.md`
- `PRODUCTION_READINESS.md`
- `IMPLEMENTATION_SUMMARY.md`

These contain the actual deployed behavior that docs should match.
