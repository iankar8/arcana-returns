# Returns API - Gap Analysis (80% → 100%)

## Current Status: 80% Complete

**What's Working:**
- ✅ 3-endpoint flow (token, authorize, commit)
- ✅ JWT signing with Ed25519
- ✅ Risk scoring (basic heuristics)
- ✅ Evidence ladder
- ✅ AEL logging
- ✅ Shopify/Stripe event processing
- ✅ CLI tools
- ✅ Database schema

**What's Missing: 20%**

---

## 🔴 Critical Gaps (Must Fix for 100%)

### 1. Idempotency Not Enforced ⚠️ HIGH PRIORITY

**Current State:**
- Schema exists (`idempotency_keys` table)
- Types defined
- **NOT enforced in route handlers**

**Impact:**
- Duplicate returns if merchant retries
- Double refunds possible
- Not production-safe

**Fix Required:**
```typescript
// src/server/middleware/idempotency.ts (NEW FILE)
export async function idempotencyMiddleware(request, reply) {
  const idempotencyKey = request.headers['idempotency-key'];
  
  if (!idempotencyKey) {
    return; // Optional for GET requests
  }
  
  const db = getDb();
  const existing = db.prepare(`
    SELECT response FROM idempotency_keys 
    WHERE key = ? AND merchant_id = ? AND expires_at > datetime('now')
  `).get(idempotencyKey, request.merchantId);
  
  if (existing) {
    // Return cached response
    return reply.send(JSON.parse(existing.response));
  }
  
  // Store key for this request
  request.idempotencyKey = idempotencyKey;
}

// In route handler after processing
if (request.idempotencyKey) {
  db.prepare(`
    INSERT INTO idempotency_keys (key, merchant_id, endpoint, request_hash, response, expires_at)
    VALUES (?, ?, ?, ?, ?, datetime('now', '+24 hours'))
  `).run(
    request.idempotencyKey,
    merchantId,
    request.url,
    requestHash,
    JSON.stringify(response)
  );
}
```

**Effort:** 2-3 hours
**Priority:** P0 (blocks production)

---

### 2. Evidence Validation Missing ⚠️ HIGH PRIORITY

**Current State:**
- Evidence URLs accepted
- **No validation of URL accessibility**
- **No content-type checking**
- **No image quality validation**

**Impact:**
- Broken evidence URLs accepted
- Can't verify evidence actually exists
- Poor quality images not caught

**Fix Required:**
```typescript
// src/services/evidence-validator.ts (NEW FILE)
export class EvidenceValidator {
  async validateEvidence(evidence: Evidence[]): Promise<ValidationResult> {
    for (const item of evidence) {
      // 1. Check URL is accessible
      const response = await fetch(item.url, { method: 'HEAD' });
      if (!response.ok) {
        return { valid: false, reason: `URL not accessible: ${item.url}` };
      }
      
      // 2. Check content-type
      const contentType = response.headers.get('content-type');
      if (item.type === 'photo_packaging' && !contentType?.startsWith('image/')) {
        return { valid: false, reason: 'Photo must be an image' };
      }
      
      // 3. Check file size (prevent huge files)
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
        return { valid: false, reason: 'File too large (max 10MB)' };
      }
      
      // 4. For images, check quality (optional - can be async)
      if (item.type.startsWith('photo_')) {
        const quality = await this.checkImageQuality(item.url);
        if (quality.score < 0.5) {
          return { valid: false, reason: 'Image quality too low' };
        }
      }
    }
    
    return { valid: true };
  }
  
  private async checkImageQuality(url: string): Promise<{ score: number }> {
    // Basic checks: resolution, blur, brightness
    // Can use sharp library or external API
    return { score: 0.8 }; // Placeholder
  }
}
```

**Effort:** 4-6 hours
**Priority:** P0 (data quality issue)

---

### 3. Webhook Retry Logic Missing ⚠️ MEDIUM PRIORITY

**Current State:**
- Shopify/Stripe webhooks received
- Events stored
- **No retry on processing failure**
- **No dead letter queue**

**Impact:**
- Failed events lost
- No visibility into failures
- Manual intervention needed

**Fix Required:**
```typescript
// src/services/webhook-retry.ts (NEW FILE)
export class WebhookRetryService {
  async processWithRetry(eventId: string, processor: () => Promise<void>) {
    const maxRetries = 5;
    const backoffMs = [1000, 2000, 4000, 8000, 16000];
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        await processor();
        
        // Mark as processed
        db.prepare(`
          UPDATE shopify_events 
          SET processed = 1, processed_at = datetime('now')
          WHERE event_id = ?
        `).run(eventId);
        
        return;
      } catch (error) {
        console.error(`Attempt ${attempt + 1} failed:`, error);
        
        if (attempt < maxRetries - 1) {
          await this.sleep(backoffMs[attempt]);
        } else {
          // Move to dead letter queue
          db.prepare(`
            INSERT INTO webhook_failures (event_id, error, attempts, created_at)
            VALUES (?, ?, ?, datetime('now'))
          `).run(eventId, error.message, maxRetries);
        }
      }
    }
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

**Effort:** 3-4 hours
**Priority:** P1 (reliability issue)

---

### 4. Rate Limiting Not Per-Endpoint ⚠️ MEDIUM PRIORITY

**Current State:**
- Global rate limit (100 req/min)
- **Not per-endpoint**
- **Not per-merchant**

**Impact:**
- One merchant can exhaust quota
- No differentiation between read/write
- Can't protect expensive endpoints

**Fix Required:**
```typescript
// src/server/middleware/rate-limit.ts (UPDATE)
import rateLimit from '@fastify/rate-limit';

export const rateLimitConfig = {
  global: false, // Disable global
  max: async (request) => {
    // Different limits per endpoint
    if (request.url.startsWith('/returns/token')) {
      return 50; // Token issuance is expensive
    }
    if (request.url.startsWith('/returns/authorize')) {
      return 100;
    }
    if (request.url.startsWith('/returns/commit')) {
      return 100;
    }
    return 200; // Read endpoints
  },
  timeWindow: '1 minute',
  keyGenerator: (request) => {
    // Rate limit per merchant
    return `${request.merchantId}:${request.url}`;
  },
};
```

**Effort:** 1-2 hours
**Priority:** P1 (abuse prevention)

---

### 5. Error Messages Not Descriptive ⚠️ LOW PRIORITY

**Current State:**
- Generic error codes
- **Not actionable for merchants**
- **No suggestions for fixes**

**Impact:**
- Poor developer experience
- More support tickets
- Slower integration

**Fix Required:**
```typescript
// src/types/common.ts (UPDATE)
export const ErrorMessages = {
  POL_001: {
    message: 'Policy not found',
    suggestion: 'Ensure the policy_id exists. Use GET /policy to list available policies.',
    docs: 'https://docs.arcana.com/errors/POL_001'
  },
  RT_001: {
    message: 'Return token expired',
    suggestion: 'Tokens expire after 15 minutes. Request a new token.',
    docs: 'https://docs.arcana.com/errors/RT_001'
  },
  // ... more errors
};

// In error handler
export class ArcanaError extends Error {
  toJSON() {
    const errorInfo = ErrorMessages[this.code];
    return {
      error: {
        code: this.code,
        message: errorInfo.message,
        suggestion: errorInfo.suggestion,
        docs: errorInfo.docs,
        trace_id: this.traceId
      }
    };
  }
}
```

**Effort:** 2-3 hours
**Priority:** P2 (DX improvement)

---

## 🟡 Nice-to-Have Improvements (Not Blocking 100%)

### 6. Policy Parser Enhancement

**Current:** Keyword extraction  
**Ideal:** LLM-based extraction  
**Effort:** 1-2 weeks  
**Priority:** P3 (works well enough for MVP)

### 7. Risk Scoring ML Model

**Current:** Heuristics (order value, history)  
**Ideal:** ML model trained on fraud data  
**Effort:** 2-4 weeks  
**Priority:** P3 (heuristics sufficient for pilots)

### 8. Replay Re-execution

**Current:** Replay exports bundle, no re-run  
**Ideal:** Actually re-execute decision  
**Effort:** 1 week  
**Priority:** P3 (export is enough for audit)

### 9. Shopify Admin UI

**Current:** CLI only  
**Ideal:** Shopify admin extension  
**Effort:** 2 weeks  
**Priority:** P3 (not needed for API validation)

### 10. S3 Integration

**Current:** Evidence URLs from merchant CDN  
**Ideal:** Upload to our S3  
**Effort:** 3-4 days  
**Priority:** P3 (merchant CDN works fine)

---

## 📊 Effort Summary

| Gap | Priority | Effort | Impact |
|-----|----------|--------|--------|
| 1. Idempotency | P0 | 2-3h | Critical |
| 2. Evidence Validation | P0 | 4-6h | Critical |
| 3. Webhook Retry | P1 | 3-4h | High |
| 4. Rate Limiting | P1 | 1-2h | High |
| 5. Error Messages | P2 | 2-3h | Medium |

**Total P0 effort:** 6-9 hours  
**Total P0+P1 effort:** 10-15 hours  
**Total P0+P1+P2 effort:** 12-18 hours

---

## 🎯 Recommended Path to 100%

### Phase 1: Production Readiness (P0 - 1 day)
1. ✅ Implement idempotency middleware (2-3h)
2. ✅ Add evidence validation (4-6h)

**Result:** System is production-safe

### Phase 2: Reliability (P1 - 0.5 day)
3. ✅ Add webhook retry logic (3-4h)
4. ✅ Improve rate limiting (1-2h)

**Result:** System is reliable at scale

### Phase 3: Polish (P2 - 0.5 day)
5. ✅ Better error messages (2-3h)

**Result:** Great developer experience

**Total time to 100%: 2 days**

---

## 🚀 What to Build First

**My recommendation: Start with P0 items**

1. **Idempotency** (2-3 hours)
   - Create middleware
   - Add to all POST endpoints
   - Test with duplicate requests

2. **Evidence Validation** (4-6 hours)
   - Create validator service
   - Add URL accessibility check
   - Add content-type validation
   - Add file size limits
   - (Optional) Add image quality check

**After these 2, you're at 90% and production-safe.**

Then add P1 items to reach 95%, and P2 for 100%.

---

## ✅ Definition of "100% Complete"

**Returns API is 100% when:**
- [x] All 3 endpoints working (token, authorize, commit)
- [x] JWT signing/verification
- [x] Risk scoring
- [x] Evidence ladder
- [x] AEL logging
- [ ] **Idempotency enforced** ← Missing
- [ ] **Evidence validated** ← Missing
- [ ] **Webhook retry logic** ← Missing
- [ ] **Per-endpoint rate limits** ← Missing
- [ ] **Descriptive errors** ← Missing

**Current: 80% (8/13 items)**  
**After P0: 90% (10/13 items)**  
**After P0+P1: 95% (12/13 items)**  
**After P0+P1+P2: 100% (13/13 items)**

---

## 🤔 Questions for You

1. **Do you want me to build the P0 items now?** (idempotency + evidence validation)
2. **Is 2 days to 100% acceptable?** Or do you need faster?
3. **Are there other gaps I'm missing?** Anything else blocking pilots?
4. **Should I prioritize differently?** Maybe P1 before P0?

**Want me to start with idempotency middleware?**
