# Protocol Analysis - Arcana Returns vs Visa TAP / Agentic Commerce

## 🎯 Goal: Merchant Integration with Minimal APIs

**Target:** Merchant calls 1-2 APIs, everything else happens automatically via webhooks/events

**Inspiration:** Visa TAP (Token Authentication Protocol), Stripe Connect, Shopify App Bridge

---

## 📊 Current State vs Ideal State

### Current Implementation (3-Step Flow)

```
Merchant Integration Required:
1. POST /returns/token        → Customer initiates return
2. POST /returns/authorize    → Customer provides evidence
3. POST /returns/commit       → Package received/scanned

Total: 3 API calls from merchant
```

**Issues:**
- ❌ Merchant must integrate 3 endpoints
- ❌ Merchant tracks return state
- ❌ Merchant calls commit endpoint
- ❌ No automatic refund processing
- ❌ Manual webhook setup required

### Ideal State (Event-Driven)

```
Merchant Integration Required:
1. Install Arcana Returns app/plugin
2. (Optional) POST /returns/initiate → Only if custom UI

Total: 0-1 API calls from merchant
Everything else automatic via webhooks
```

**Benefits:**
- ✅ Zero-touch after installation
- ✅ Automatic event processing
- ✅ Automatic refund issuance
- ✅ Real-time status updates
- ✅ Merchant dashboard for monitoring

---

## 🔄 Ideal Workflow (Visa TAP Style)

### Phase 1: Installation (One-Time Setup)

```
1. Merchant installs Arcana Returns
   → OAuth flow (Shopify/Stripe)
   → Webhooks auto-configured
   → Policy auto-imported
   → API keys generated
   
2. System validates connection
   → Test webhook delivery
   → Verify policy extraction
   → Create merchant dashboard
```

**Merchant Action:** Click "Install" button  
**Our System:** Handles everything automatically

### Phase 2: Return Initiation (Customer-Driven)

```
Customer clicks "Return Item" in merchant store
   ↓
Merchant store calls: POST /returns/initiate
   {
     "order_id": "ord_123",
     "items": [...],
     "reason": "doesnt_fit"
   }
   ↓
Arcana Returns:
   → Issues return token (JWT)
   → Calculates risk score
   → Determines evidence requirements
   → Generates return label (if needed)
   → Returns customer-facing URL
   ↓
Customer receives:
   → Return instructions
   → Evidence upload link
   → Shipping label
   → Tracking info
```

**Merchant Action:** Single API call (or zero if using widget)  
**Customer Experience:** Seamless, guided flow

### Phase 3: Evidence Collection (Automatic)

```
Customer uploads evidence via Arcana-hosted page
   ↓
Arcana Returns:
   → Validates evidence quality
   → Runs authorization decision
   → Updates return status
   → Notifies merchant via webhook
   ↓
Merchant receives webhook:
   {
     "event": "return.authorized",
     "decision": "approve",
     "refund_instruction": "instant"
   }
```

**Merchant Action:** None (webhook handler optional)  
**Our System:** Handles everything

### Phase 4: Package Receipt (Automatic)

```
Carrier scans package
   ↓
Carrier webhook → Arcana Returns
   ↓
Arcana Returns:
   → Validates tracking event
   → Commits return
   → Issues refund via Stripe API
   → Updates inventory (if integrated)
   → Notifies merchant & customer
   ↓
Merchant receives webhook:
   {
     "event": "return.completed",
     "refund_id": "re_123",
     "amount": 2999
   }
```

**Merchant Action:** None  
**Our System:** Handles everything including refund

---

## 🏗️ What We Need to Add

### 1. OAuth & App Installation Flow ⭐ CRITICAL

**Missing:**
- OAuth provider endpoints (Shopify OAuth, Stripe Connect)
- Installation wizard UI
- Automatic webhook registration
- Credential storage & refresh

**Add:**
```typescript
// src/server/routes/oauth.ts
POST   /oauth/shopify/install     → Start Shopify OAuth
GET    /oauth/shopify/callback    → Handle OAuth callback
POST   /oauth/stripe/connect      → Start Stripe Connect
GET    /oauth/stripe/callback     → Handle Stripe callback
POST   /oauth/disconnect          → Revoke access

// Auto-configure webhooks during install
- Register Shopify webhooks (orders/*, refunds/*)
- Register Stripe webhooks (charge.refunded, etc.)
- Store credentials securely
- Test webhook delivery
```

**Impact:** Reduces merchant setup from 30 minutes to 2 minutes

---

### 2. Single Initiation Endpoint ⭐ CRITICAL

**Current:** 3 separate endpoints (token, authorize, commit)  
**Needed:** 1 endpoint that starts the flow

**Add:**
```typescript
// src/server/routes/returns.ts
POST /returns/initiate
{
  "order_id": "ord_123",
  "items": [{"sku": "...", "qty": 1}],
  "reason": "doesnt_fit",
  "customer": {
    "email": "customer@example.com",
    "name": "John Doe"
  }
}

Response:
{
  "return_id": "ret_abc123",
  "status": "initiated",
  "customer_portal_url": "https://returns.arcana.com/ret_abc123",
  "return_label_url": "https://...",
  "tracking_number": "1Z999...",
  "next_steps": ["upload_evidence", "ship_package"]
}
```

**Benefits:**
- Merchant calls once
- Customer gets portal link
- Everything else automatic

---

### 3. Customer Portal (Hosted Page) ⭐ CRITICAL

**Missing:** Customer-facing UI for evidence upload

**Add:**
```
/portal/:returnId
- Shows return status
- Upload evidence (photos, receipts)
- View shipping label
- Track package
- Chat support (future)

Tech Stack:
- Next.js or React SPA
- Hosted on returns.arcana.com
- Mobile-responsive
- Accessible (WCAG 2.1)
```

**Impact:** Merchant doesn't build return UI

---

### 4. Automatic Refund Issuance ⭐ CRITICAL

**Current:** Merchant must process refund manually  
**Needed:** Automatic refund via Stripe API

**Add:**
```typescript
// src/services/refund-processor.ts
class RefundProcessor {
  async issueRefund(returnToken: string) {
    // 1. Verify return approved & committed
    // 2. Calculate refund amount (minus restock fee)
    // 3. Call Stripe API to issue refund
    // 4. Update return status
    // 5. Send webhooks to merchant
    // 6. Notify customer
  }
}

// Triggered automatically on commit
```

**Benefits:**
- Zero merchant action
- Instant refunds
- Automatic reconciliation

---

### 5. Webhook Event System (Outbound) ⭐ HIGH PRIORITY

**Current:** We receive webhooks, but don't send them  
**Needed:** Notify merchant of return events

**Add:**
```typescript
// src/services/webhook-sender.ts
Events to send:
- return.initiated
- return.evidence_uploaded
- return.authorized (approve/deny/step_up)
- return.shipped
- return.received
- return.completed
- return.refunded
- return.cancelled

// Webhook delivery with retry logic
- Exponential backoff
- Dead letter queue
- Delivery status tracking
- Webhook signature (HMAC)
```

**Impact:** Merchant stays in sync without polling

---

### 6. Carrier Integration (Shipping Labels) 🔶 MEDIUM PRIORITY

**Missing:** Generate return shipping labels

**Add:**
```typescript
// src/services/shipping.ts
Integrations:
- EasyPost API (multi-carrier)
- Shippo API (alternative)
- Direct: UPS, FedEx, USPS APIs

Features:
- Generate prepaid labels
- Track packages
- Receive scan events
- Calculate shipping costs
- Label customization
```

**Impact:** Fully automated return shipping

---

### 7. Merchant Dashboard UI 🔶 MEDIUM PRIORITY

**Current:** CLI + API only  
**Needed:** Web dashboard for merchants

**Add:**
```
/dashboard
- Return analytics (metrics we built)
- Recent returns list
- Policy management
- Webhook logs
- API key management
- Settings & configuration

Tech Stack:
- Next.js + TailwindCSS
- Charts (Recharts/Chart.js)
- Real-time updates (WebSocket)
```

**Impact:** Merchant visibility without API calls

---

### 8. Embeddable Widget (Optional) 🔷 LOW PRIORITY

**For merchants without custom UI:**

```html
<!-- Merchant adds to their site -->
<script src="https://cdn.arcana.com/returns-widget.js"></script>
<div id="arcana-returns" data-merchant="merchant_123"></div>

<!-- Widget handles everything -->
- Return initiation
- Evidence upload
- Status tracking
- Customer communication
```

**Impact:** Zero-code integration option

---

### 9. Real-Time Status Updates 🔷 LOW PRIORITY

**Add WebSocket support:**

```typescript
// src/server/websocket.ts
WS /returns/:returnId/status

Client subscribes → receives real-time updates
- Evidence uploaded
- Decision made
- Package scanned
- Refund issued
```

**Impact:** Live status without polling

---

### 10. Multi-Tenant Architecture 🔶 MEDIUM PRIORITY

**Current:** Single database, manual merchant setup  
**Needed:** Proper multi-tenancy

**Add:**
```typescript
// Tenant isolation
- Separate API keys per merchant
- Data isolation in queries
- Rate limiting per merchant
- Usage tracking & billing
- Merchant-specific configuration

// Database changes
- Add tenant_id to all tables
- Row-level security policies
- Tenant-scoped indexes
```

**Impact:** Production-ready multi-merchant support

---

## 🎯 Prioritized Roadmap

### Phase 1: Minimal Viable Protocol (2 weeks)
**Goal:** Merchant calls 1 API, everything else automatic

1. ✅ **Single initiation endpoint** (`POST /returns/initiate`)
2. ✅ **Customer portal** (hosted page for evidence)
3. ✅ **Automatic refund issuance** (Stripe integration)
4. ✅ **Outbound webhooks** (notify merchant of events)

**Result:** Merchant integration = 1 API call + webhook handler

### Phase 2: Zero-Touch Installation (2 weeks)
**Goal:** Merchant clicks "Install", everything configured

5. ✅ **OAuth flows** (Shopify + Stripe)
6. ✅ **Automatic webhook registration**
7. ✅ **Installation wizard**
8. ✅ **Merchant dashboard** (basic)

**Result:** Merchant setup = 2 minutes, zero code

### Phase 3: Full Automation (4 weeks)
**Goal:** Complete hands-off experience

9. ✅ **Carrier integration** (shipping labels)
10. ✅ **Real-time status** (WebSocket)
11. ✅ **Embeddable widget** (zero-code option)
12. ✅ **Multi-tenant architecture**

**Result:** Production-ready, scalable platform

---

## 📋 Implementation Checklist

### Immediate (This Week)
- [ ] Design `/returns/initiate` endpoint
- [ ] Spec out customer portal UI
- [ ] Design webhook event schema
- [ ] Plan Stripe refund integration

### Week 2
- [ ] Build `/returns/initiate` endpoint
- [ ] Create customer portal (React app)
- [ ] Implement outbound webhooks
- [ ] Add Stripe refund automation

### Week 3
- [ ] Build Shopify OAuth flow
- [ ] Build Stripe Connect flow
- [ ] Auto-register webhooks on install
- [ ] Create installation wizard

### Week 4
- [ ] Build merchant dashboard
- [ ] Add webhook delivery logs
- [ ] Implement retry logic
- [ ] Add usage analytics

---

## 🔄 Comparison: Current vs Target

| Feature | Current | Target | Gap |
|---------|---------|--------|-----|
| **Merchant APIs** | 3 endpoints | 1 endpoint | Need initiate |
| **Installation** | Manual setup | OAuth + auto | Need OAuth |
| **Customer UI** | Merchant builds | Hosted portal | Need portal |
| **Refunds** | Manual | Automatic | Need Stripe |
| **Webhooks** | Inbound only | Bidirectional | Need outbound |
| **Shipping** | Manual | Auto labels | Need carrier |
| **Dashboard** | CLI only | Web UI | Need dashboard |
| **Setup Time** | 30 minutes | 2 minutes | Need wizard |

---

## 💡 Key Insights

### What Makes This "Visa TAP-like"

1. **Single Integration Point**
   - Visa TAP: Merchant calls one tokenization API
   - Arcana: Merchant calls one initiation API

2. **Automatic Processing**
   - Visa TAP: Token validation happens automatically
   - Arcana: Return flow happens automatically

3. **Event-Driven**
   - Visa TAP: Webhooks for auth/settlement
   - Arcana: Webhooks for return lifecycle

4. **Hosted Experience**
   - Visa TAP: Visa handles 3DS challenge
   - Arcana: We handle evidence collection

5. **Zero Merchant State**
   - Visa TAP: Visa tracks transaction state
   - Arcana: We track return state

### Critical Success Factors

1. **OAuth Installation** - Must be 1-click
2. **Single API Call** - Merchant shouldn't track state
3. **Hosted Portal** - Customer experience on us
4. **Automatic Refunds** - Zero merchant action
5. **Reliable Webhooks** - Merchant stays in sync

---

## 🚀 Recommended Next Steps

### Option A: MVP Protocol (Fastest Value)
**Build:** Initiate endpoint + Customer portal + Webhooks  
**Time:** 2 weeks  
**Value:** Reduces merchant integration from 3 APIs to 1

### Option B: Full Installation Flow (Best UX)
**Build:** OAuth + Auto-config + Dashboard  
**Time:** 4 weeks  
**Value:** Reduces setup from 30 min to 2 min

### Option C: Complete Platform (Production Ready)
**Build:** Everything above + Carriers + Multi-tenant  
**Time:** 8 weeks  
**Value:** Production-ready, scalable, zero-touch

---

## 📊 Effort Estimation

| Component | Complexity | Time | Priority |
|-----------|------------|------|----------|
| Initiate endpoint | Low | 2 days | P0 |
| Customer portal | Medium | 1 week | P0 |
| Outbound webhooks | Low | 2 days | P0 |
| Stripe refunds | Low | 2 days | P0 |
| Shopify OAuth | Medium | 3 days | P1 |
| Stripe Connect | Medium | 3 days | P1 |
| Webhook auto-config | Low | 2 days | P1 |
| Merchant dashboard | High | 2 weeks | P1 |
| Carrier integration | High | 1 week | P2 |
| Embeddable widget | Medium | 1 week | P2 |
| WebSocket status | Low | 2 days | P3 |
| Multi-tenant | Medium | 1 week | P1 |

**Total MVP (P0):** 2 weeks  
**Total with OAuth (P0+P1):** 4 weeks  
**Total Complete (P0+P1+P2):** 8 weeks

---

## 🎯 My Recommendation

**Start with Phase 1 (MVP Protocol):**

1. Build `/returns/initiate` endpoint (2 days)
2. Build customer portal for evidence (1 week)
3. Add outbound webhooks (2 days)
4. Implement Stripe refund automation (2 days)

**Result:** Merchant integration goes from:
- ❌ 3 API calls + manual refunds + custom UI
- ✅ 1 API call + automatic everything

**Then iterate to OAuth installation in Phase 2.**

This gives immediate value while building toward the full vision.

---

**Want me to start building any of these components?** I recommend starting with the `/returns/initiate` endpoint and customer portal.
