# Integration Patterns - Arcana Returns

## 🎯 Design Principle: Flexibility Over Prescription

**Support multiple integration patterns:**
1. **Granular API** - Full control, 3-step flow (current)
2. **Simplified API** - Single call, automatic flow (new)
3. **Headless** - No portal, merchant handles UI (new)
4. **Hybrid** - Mix and match as needed

---

## 📊 Pattern Comparison

| Pattern | APIs | UI | Evidence | Refunds | Use Case |
|---------|------|----|---------|---------| ---------|
| **Granular** | 3 calls | Merchant | Merchant uploads | Manual | Full control |
| **Simplified** | 1 call | Portal | Portal upload | Auto | Quick integration |
| **Headless** | 1-2 calls | Merchant | Merchant uploads | Auto | Deep integration |
| **Hybrid** | Mix | Mix | Mix | Mix | Custom needs |

---

## 🔧 Pattern 1: Granular API (Current - Keep This!)

**For merchants who want full control**

### Flow
```typescript
// Step 1: Merchant issues token
POST /returns/token
{
  "order_id": "ord_123",
  "items": [...],
  "reason": "doesnt_fit",
  "policy_id": "plc_abc"
}
→ Returns: { return_token, trace_id, required_evidence }

// Step 2: Merchant collects evidence in their UI
// Customer uploads to merchant's system
// Merchant forwards to us

POST /returns/authorize
{
  "return_token": "eyJ...",
  "evidence": [
    { "type": "photo_packaging", "url": "https://merchant.com/uploads/photo.jpg" },
    { "type": "receipt", "url": "https://merchant.com/uploads/receipt.pdf" }
  ],
  "dropoff_choice": "mail_in"
}
→ Returns: { decision: "approve", decision_id, explanations }

// Step 3: Merchant commits after package receipt
POST /returns/commit
{
  "return_token": "eyJ...",
  "receipt_event": {
    "type": "scan",
    "carrier": "UPS",
    "ts": "2025-10-26T14:00:00Z",
    "tracking_number": "1Z999..."
  }
}
→ Returns: { refund_instruction: "instant", receipt }
```

**Evidence Handling:**
- Merchant hosts files on their CDN
- Passes URLs to us
- We fetch and validate
- Merchant controls UX completely

**Benefits:**
- ✅ Full control over customer experience
- ✅ Evidence stays on merchant infrastructure
- ✅ Custom validation logic
- ✅ Existing UI integration

**Keep this exactly as-is!**

---

## 🚀 Pattern 2: Simplified API (New - Add This)

**For merchants who want quick integration**

### Flow
```typescript
// Single call to initiate
POST /returns/initiate
{
  "order_id": "ord_123",
  "items": [...],
  "reason": "doesnt_fit",
  "customer": {
    "email": "customer@example.com",
    "name": "John Doe"
  },
  "return_method": "mail_in",
  "evidence_collection": "portal" // or "merchant" or "skip"
}

Response:
{
  "return_id": "ret_abc123",
  "status": "initiated",
  "customer_portal_url": "https://returns.arcana.com/ret_abc123", // if portal
  "return_label_url": "https://...",
  "tracking_number": "1Z999...",
  "next_steps": ["upload_evidence", "ship_package"]
}

// Everything else happens automatically via webhooks
```

**Evidence Handling:**
- If `evidence_collection: "portal"` → Customer uses our hosted page
- If `evidence_collection: "merchant"` → Merchant collects, sends via webhook
- If `evidence_collection: "skip"` → No evidence required (low-value items)

**Benefits:**
- ✅ Single API call
- ✅ Automatic flow
- ✅ Optional portal
- ✅ Webhook-driven

---

## 🎨 Pattern 3: Headless (New - Your Preference!)

**Deep integration with merchant's existing system - NO PORTAL**

### Flow
```typescript
// Step 1: Initiate return (merchant's UI)
POST /returns/initiate
{
  "order_id": "ord_123",
  "items": [...],
  "reason": "doesnt_fit",
  "customer": { "email": "...", "name": "..." },
  "evidence_collection": "merchant", // Key: merchant handles UI
  "evidence_webhook_url": "https://merchant.com/webhooks/arcana/evidence" // Where to send upload URLs
}

Response:
{
  "return_id": "ret_abc123",
  "status": "awaiting_evidence",
  "evidence_upload_token": "tok_xyz", // Merchant uses this to submit evidence
  "required_evidence": ["photo_packaging", "receipt"],
  "return_label_url": "https://...",
  "tracking_number": "1Z999..."
}

// Step 2: Customer uploads to merchant's system
// Merchant's existing file upload infrastructure

// Step 3: Merchant submits evidence to us
POST /returns/evidence
{
  "return_id": "ret_abc123",
  "upload_token": "tok_xyz",
  "evidence": [
    {
      "type": "photo_packaging",
      "url": "https://merchant-cdn.com/uploads/abc123/photo.jpg",
      "uploaded_at": "2025-10-26T14:00:00Z"
    },
    {
      "type": "receipt",
      "url": "https://merchant-cdn.com/uploads/abc123/receipt.pdf",
      "uploaded_at": "2025-10-26T14:01:00Z"
    }
  ]
}

Response:
{
  "status": "evidence_received",
  "validation": {
    "photo_packaging": { "valid": true, "quality_score": 0.95 },
    "receipt": { "valid": true, "readable": true }
  },
  "next_step": "authorization_pending"
}

// Step 4: We automatically authorize (async)
// Send webhook to merchant

Webhook → https://merchant.com/webhooks/arcana
{
  "event": "return.authorized",
  "return_id": "ret_abc123",
  "decision": "approve",
  "decision_id": "dec_xyz",
  "explanations": ["Evidence quality good", "Low risk score"],
  "refund_instruction": "on_receipt"
}

// Step 5: Package scanned (automatic)
// Carrier webhook → us → we commit → issue refund → notify merchant

Webhook → https://merchant.com/webhooks/arcana
{
  "event": "return.completed",
  "return_id": "ret_abc123",
  "refund_id": "re_stripe_123",
  "amount": 2999,
  "refunded_at": "2025-10-26T15:00:00Z"
}
```

### Evidence Flow Options

**Option A: Merchant CDN (Your Preference)**
```typescript
// Merchant hosts files, passes URLs
POST /returns/evidence
{
  "return_id": "ret_abc",
  "evidence": [
    { "type": "photo", "url": "https://merchant-cdn.com/file.jpg" }
  ]
}

// We fetch from merchant's URL
// Validate and store reference
```

**Option B: Direct Upload to Us**
```typescript
// We provide signed upload URL
GET /returns/ret_abc/upload-url?type=photo_packaging
→ Returns: { upload_url: "https://arcana-storage.s3.amazonaws.com/...", expires_at: "..." }

// Merchant uploads directly to our S3
PUT https://arcana-storage.s3.amazonaws.com/...
[file data]

// Merchant notifies us upload complete
POST /returns/evidence
{
  "return_id": "ret_abc",
  "evidence": [
    { "type": "photo", "storage_key": "uploads/ret_abc/photo.jpg" }
  ]
}
```

**Option C: Webhook Push**
```typescript
// Merchant uploads to their system
// Then pushes file data to our webhook

POST /returns/evidence/upload
{
  "return_id": "ret_abc",
  "evidence": [
    {
      "type": "photo_packaging",
      "filename": "package.jpg",
      "content_type": "image/jpeg",
      "data": "base64_encoded_file_data",
      "size_bytes": 245678
    }
  ]
}

// We store and process
```

**Recommendation: Option A (Merchant CDN)**
- ✅ Merchant keeps control of files
- ✅ No data transfer needed
- ✅ Uses existing infrastructure
- ✅ Simpler integration
- ✅ Better for privacy/compliance

---

## 🔄 Pattern 4: Hybrid (Mix and Match)

**Merchants can combine patterns**

### Example 1: Granular + Auto Refunds
```typescript
// Use 3-step API for control
POST /returns/token
POST /returns/authorize
POST /returns/commit

// But enable auto-refunds
POST /returns/commit
{
  "return_token": "...",
  "receipt_event": {...},
  "auto_refund": true // NEW: We issue refund automatically
}
```

### Example 2: Simplified + Merchant Evidence
```typescript
// Use simplified initiation
POST /returns/initiate
{
  ...,
  "evidence_collection": "merchant" // Merchant handles UI
}

// But automatic everything else
// Webhooks for authorization & refunds
```

### Example 3: Granular + Webhooks
```typescript
// Use 3-step API
// But subscribe to webhooks for status updates
// Best of both worlds: control + notifications
```

---

## 🏗️ What We Need to Build

### 1. New Endpoints (Headless Support)

```typescript
// Simplified initiation
POST /returns/initiate
- Combines token + setup
- Returns upload token
- Configurable evidence collection

// Evidence submission (merchant-hosted files)
POST /returns/evidence
- Accept URLs to merchant-hosted files
- Validate evidence quality
- Trigger authorization automatically

// Upload URL generation (optional)
GET /returns/:returnId/upload-url
- For direct upload to our storage
- Signed URLs with expiration

// Status endpoint (for polling if needed)
GET /returns/:returnId/status
- Current state
- Next steps
- Decision info
```

### 2. Outbound Webhooks

```typescript
// Events to send to merchant
return.initiated
return.evidence_received
return.evidence_validated
return.authorized (approve/step_up/deny)
return.shipped
return.received
return.completed
return.refunded
return.cancelled

// Webhook payload
{
  "event": "return.authorized",
  "return_id": "ret_abc",
  "merchant_id": "merchant_123",
  "timestamp": "2025-10-26T14:00:00Z",
  "data": {
    "decision": "approve",
    "decision_id": "dec_xyz",
    "risk_score": 0.25,
    "explanations": [...]
  },
  "signature": "hmac_sha256_signature"
}
```

### 3. Automatic Authorization

```typescript
// After evidence received, auto-run authorization
// No need for merchant to call /authorize

// In background processor
async function processEvidenceSubmission(returnId: string) {
  const evidence = await getEvidence(returnId);
  const token = await getReturnToken(returnId);
  
  // Automatically authorize
  const decision = await authorize({
    return_token: token.jti,
    evidence: evidence,
    dropoff_choice: token.dropoff_choice
  });
  
  // Send webhook
  await sendWebhook(token.merchant_id, {
    event: 'return.authorized',
    data: decision
  });
}
```

### 4. Automatic Refund Issuance

```typescript
// After package received, auto-issue refund
// Triggered by carrier webhook or commit call

async function processPackageReceipt(returnId: string) {
  const decision = await getDecision(returnId);
  
  if (decision.decision !== 'approve') {
    return; // Don't refund denied returns
  }
  
  // Issue refund via Stripe
  const refund = await stripe.refunds.create({
    charge: decision.charge_id,
    amount: decision.refund_amount,
    metadata: {
      return_id: returnId,
      decision_id: decision.decision_id
    }
  });
  
  // Update return status
  await markReturnCompleted(returnId, refund.id);
  
  // Send webhook
  await sendWebhook(decision.merchant_id, {
    event: 'return.completed',
    data: { refund_id: refund.id, amount: refund.amount }
  });
}
```

### 5. Evidence Validation Service

```typescript
// Validate evidence quality
async function validateEvidence(evidence: Evidence[]) {
  for (const item of evidence) {
    if (item.type === 'photo_packaging') {
      // Fetch image from merchant URL
      const image = await fetch(item.url);
      
      // Validate quality
      const quality = await analyzeImageQuality(image);
      
      if (quality.score < 0.5) {
        return { valid: false, reason: 'Image quality too low' };
      }
    }
    
    if (item.type === 'receipt') {
      // Validate receipt is readable
      const receipt = await fetch(item.url);
      const readable = await validateReceipt(receipt);
      
      if (!readable) {
        return { valid: false, reason: 'Receipt not readable' };
      }
    }
  }
  
  return { valid: true };
}
```

---

## 📋 Implementation Priority

### Phase 1: Headless Pattern (1 week)
**Goal: Support merchant UI without portal**

1. ✅ `POST /returns/initiate` endpoint
2. ✅ `POST /returns/evidence` endpoint (accept merchant URLs)
3. ✅ Automatic authorization after evidence
4. ✅ Outbound webhooks (basic)

**Result:** Merchant uses their UI, we handle logic

### Phase 2: Automatic Refunds (3 days)
**Goal: Zero-touch refund processing**

5. ✅ Stripe refund integration
6. ✅ Auto-refund on package receipt
7. ✅ Refund webhooks

**Result:** Complete automation after evidence

### Phase 3: Enhanced Webhooks (3 days)
**Goal: Rich event system**

8. ✅ All lifecycle events
9. ✅ Retry logic with exponential backoff
10. ✅ Webhook signature verification
11. ✅ Delivery status tracking

**Result:** Reliable merchant notifications

### Phase 4: Optional Portal (1 week)
**Goal: Fallback for merchants without UI**

12. ✅ Customer portal (React app)
13. ✅ Evidence upload to our storage
14. ✅ Status tracking page

**Result:** Zero-code option available

---

## 🎯 Recommended Architecture

### API Design

```typescript
// Keep all 4 endpoints available
POST /returns/token          // Granular: Step 1
POST /returns/authorize      // Granular: Step 2
POST /returns/commit         // Granular: Step 3

POST /returns/initiate       // Simplified: All-in-one
POST /returns/evidence       // Headless: Evidence submission
GET  /returns/:id/status     // Polling: Status check
GET  /returns/:id/upload-url // Optional: Direct upload

// Webhooks for automation
POST /webhooks/arcana        // Merchant receives events
```

### Evidence Flow (Merchant CDN)

```
Customer → Merchant UI → Merchant CDN
                ↓
        Merchant calls /returns/evidence
                ↓
        Passes CDN URLs to us
                ↓
        We fetch & validate
                ↓
        Auto-authorize
                ↓
        Webhook to merchant
```

### Configuration

```typescript
// Merchant settings
{
  "integration_pattern": "headless", // or "granular" or "simplified"
  "evidence_collection": "merchant", // or "portal" or "skip"
  "auto_refund": true,
  "webhook_url": "https://merchant.com/webhooks/arcana",
  "webhook_events": ["return.authorized", "return.completed"]
}
```

---

## 💡 Key Insights

### Why This Approach is Better

1. **Flexibility** - Merchants choose their pattern
2. **No Portal Required** - Merchant uses existing UI
3. **Deep Integration** - Works with merchant's infrastructure
4. **Gradual Adoption** - Start granular, move to simplified
5. **Backward Compatible** - Existing 3-step API unchanged

### Evidence Handling Best Practices

**Merchant CDN (Recommended):**
- ✅ Merchant controls files
- ✅ No data transfer
- ✅ Privacy compliant
- ✅ Uses existing infrastructure
- ✅ Faster integration

**Our Storage (Optional):**
- ✅ Simpler for merchant
- ✅ We handle storage/CDN
- ✅ Better for small merchants
- ❌ Data transfer required
- ❌ Privacy considerations

### Webhook Design

```typescript
// Reliable delivery
- Exponential backoff: 1s, 2s, 4s, 8s, 16s, 32s
- Max retries: 10
- Dead letter queue after failures
- Delivery status tracking
- HMAC signature verification

// Event schema
{
  "event": "return.authorized",
  "id": "evt_abc123",
  "created": 1698345600,
  "livemode": true,
  "data": {...},
  "signature": "sha256=..."
}
```

---

## 🚀 Next Steps

**I recommend building Phase 1 (Headless Pattern) first:**

1. `POST /returns/initiate` - Single call to start
2. `POST /returns/evidence` - Accept merchant CDN URLs
3. Automatic authorization - Run after evidence received
4. Basic webhooks - Notify merchant of decisions

This gives you:
- ✅ Deep merchant integration
- ✅ No portal needed
- ✅ Automatic flow after evidence
- ✅ Works with existing merchant UI

**Want me to start building these endpoints?**

I'd start with `/returns/initiate` and `/returns/evidence` to support the headless pattern you prefer.
