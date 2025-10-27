# Product Strategy - Arcana Returns MVP

## 🎯 Core Hypothesis

**"E-commerce merchants will pay for AI-powered return fraud detection that integrates seamlessly with their existing systems and provides audit-grade decision logging."**

---

## 📊 Market Analysis

### The Return Fraud Problem

**Scale:**
- E-commerce returns: $743B annually (2023)
- Return fraud: 10-15% of all returns (~$74-111B)
- Growing 20% YoY with online shopping growth
- Average merchant loses 2-3% of revenue to return fraud

**Common Fraud Patterns:**
1. **Wardrobing** - Buy, wear once, return (fashion: 30% of returns)
2. **Switch fraud** - Return different/damaged item
3. **Receipt fraud** - Fake receipts, stolen credit cards
4. **Serial returners** - Abuse return policies systematically
5. **Bracketing** - Buy multiple sizes/colors, return most
6. **Empty box** - Claim item missing, keep product

**Current Solutions (Inadequate):**
- ❌ Manual review (slow, expensive, inconsistent)
- ❌ Rule-based systems (rigid, high false positives)
- ❌ Blanket policies (hurt good customers)
- ❌ No audit trail (compliance issues)
- ❌ Siloed data (can't detect patterns)

**Market Gap:**
- ✅ AI-powered fraud detection
- ✅ Real-time decisions
- ✅ Audit-grade logging
- ✅ Works with existing systems
- ✅ Learns from patterns

---

## 🎯 MVP Validation Strategy

### Phase 1: Prove the Core Value (Weeks 1-4)

**Goal:** Validate that merchants will use AI fraud detection if it's easy to integrate

**Success Metrics:**
- 3-5 pilot merchants onboarded
- 100+ returns processed
- 10%+ fraud detection rate
- <5% false positive rate
- 95%+ merchant satisfaction

**What to Build:**
1. ✅ **Seamless Integration** - Works with existing merchant systems
2. ✅ **Real Fraud Detection** - Catches actual fraud patterns
3. ✅ **Complete Workflow** - End-to-end, no gaps
4. ✅ **Audit Trail** - Every decision logged and explainable
5. ✅ **Merchant Dashboard** - Visibility into decisions

**What NOT to Build (Yet):**
- ❌ Custom UI/portal (use merchant's existing UI)
- ❌ Advanced ML models (start with heuristics)
- ❌ Multi-channel support (focus on Shopify)
- ❌ International support (US only)
- ❌ Mobile apps

### Phase 2: Prove the Economics (Weeks 5-8)

**Goal:** Validate merchants will pay for the value

**Success Metrics:**
- $500-2000 fraud prevented per merchant/month
- Merchants willing to pay $99-499/month
- 3:1 or better ROI
- Merchants renew after trial

**Pricing Hypothesis:**
- Starter: $99/mo (up to 100 returns)
- Growth: $299/mo (up to 500 returns)
- Scale: $499/mo (up to 2000 returns)
- Enterprise: Custom (unlimited)

**Value Proposition:**
- Save 2-3% of return value in fraud
- Reduce manual review time by 80%
- Improve customer experience (faster approvals)
- Compliance-ready audit trail

### Phase 3: Prove the Scalability (Weeks 9-12)

**Goal:** Validate the system can scale

**Success Metrics:**
- 10+ merchants
- 1000+ returns/day
- <500ms API response time
- 99.9% uptime
- Automated onboarding

---

## 🏗️ MVP Architecture (End-to-End)

### Integration Points (Work with Existing Systems)

```
┌─────────────────────────────────────────────────────────┐
│                    MERCHANT SYSTEMS                      │
│  (Shopify, WooCommerce, Custom, etc.)                   │
└─────────────────────────────────────────────────────────┘
                         │
                         │ Webhooks (orders, refunds)
                         ↓
┌─────────────────────────────────────────────────────────┐
│                   ARCANA RETURNS API                     │
│                                                          │
│  POST /returns/initiate    ← Merchant calls when        │
│                              customer requests return    │
│                                                          │
│  POST /returns/evidence    ← Merchant uploads evidence  │
│                              (photos, receipts)          │
│                                                          │
│  Webhooks →                → Send decisions back        │
│                              to merchant                 │
└─────────────────────────────────────────────────────────┘
                         │
                         │ Auto-authorize, auto-refund
                         ↓
┌─────────────────────────────────────────────────────────┐
│                  FRAUD DETECTION ENGINE                  │
│                                                          │
│  • Risk scoring (order history, value, patterns)        │
│  • Evidence validation (image quality, receipt OCR)     │
│  • Decision logic (approve/step-up/deny)                │
│  • Explanation generation (why this decision?)          │
└─────────────────────────────────────────────────────────┘
                         │
                         │ Log every decision
                         ↓
┌─────────────────────────────────────────────────────────┐
│                    AEL (AUDIT LOG)                       │
│                                                          │
│  • Immutable decision log                               │
│  • Replay capability                                    │
│  • Policy versioning                                    │
│  • Compliance reports                                   │
└─────────────────────────────────────────────────────────┘
                         │
                         │ Issue refunds
                         ↓
┌─────────────────────────────────────────────────────────┐
│                  PAYMENT PROCESSOR                       │
│                    (Stripe, PayPal)                      │
└─────────────────────────────────────────────────────────┘
```

### Complete Workflow (No Gaps)

**1. Return Initiation**
```
Customer clicks "Return" in merchant's store
    ↓
Merchant's system calls: POST /returns/initiate
    {
      "order_id": "ord_123",
      "items": [{"sku": "SHIRT-M", "qty": 1, "price_cents": 2999}],
      "reason": "doesnt_fit",
      "customer": {
        "email": "customer@example.com",
        "order_history": {
          "total_orders": 5,
          "total_returns": 1,
          "account_age_days": 180
        }
      }
    }
    ↓
Arcana Returns:
    → Fetches return policy
    → Calculates initial risk score
    → Determines evidence requirements
    → Generates return label (via EasyPost)
    → Returns instructions
    ↓
Response:
    {
      "return_id": "ret_abc123",
      "status": "awaiting_evidence",
      "risk_score": 0.35,
      "required_evidence": ["photo_packaging", "receipt"],
      "return_label_url": "https://...",
      "tracking_number": "1Z999...",
      "upload_token": "tok_xyz"
    }
    ↓
Merchant displays return instructions in their UI
```

**2. Evidence Collection**
```
Customer uploads photos/receipts to merchant's existing upload system
    ↓
Merchant's CDN stores files
    ↓
Merchant calls: POST /returns/evidence
    {
      "return_id": "ret_abc123",
      "upload_token": "tok_xyz",
      "evidence": [
        {
          "type": "photo_packaging",
          "url": "https://merchant-cdn.com/uploads/ret_abc123/package.jpg",
          "uploaded_at": "2025-10-26T14:00:00Z"
        },
        {
          "type": "receipt",
          "url": "https://merchant-cdn.com/uploads/ret_abc123/receipt.pdf",
          "uploaded_at": "2025-10-26T14:01:00Z"
        }
      ]
    }
    ↓
Arcana Returns (automatic):
    → Fetches images from merchant CDN
    → Validates image quality (blur, lighting, completeness)
    → OCR receipt, verify order details
    → Updates risk score based on evidence
    → Runs authorization decision
    → Logs decision to AEL
    ↓
Webhook to merchant:
    {
      "event": "return.authorized",
      "return_id": "ret_abc123",
      "decision": "approve",
      "risk_score": 0.25,
      "explanations": [
        "Evidence quality: excellent",
        "Customer history: good (5 orders, 1 return)",
        "Order value: low risk ($29.99)",
        "Receipt verified: matches order"
      ],
      "refund_instruction": "on_receipt",
      "decision_id": "dec_xyz789"
    }
    ↓
Merchant updates return status in their system
```

**3. Package Return**
```
Customer ships package
    ↓
Carrier scans package → Webhook to Arcana
    ↓
Arcana Returns (automatic):
    → Validates tracking event
    → Verifies package weight/dimensions (fraud check)
    → Commits return
    → Issues refund via Stripe API
    → Logs to AEL
    ↓
Webhook to merchant:
    {
      "event": "return.completed",
      "return_id": "ret_abc123",
      "refund_id": "re_stripe_123",
      "amount": 2999,
      "refunded_at": "2025-10-26T16:00:00Z",
      "package_received": {
        "tracking_number": "1Z999...",
        "weight_oz": 8.5,
        "scanned_at": "2025-10-26T15:45:00Z"
      }
    }
    ↓
Merchant marks return complete
Customer receives refund
```

**4. Fraud Detection (Continuous)**
```
Background processor analyzes patterns:
    → Serial returners (>50% return rate)
    → Suspicious timing (return right after wear window)
    → Weight mismatches (empty box fraud)
    → Receipt inconsistencies
    → Device fingerprinting
    → Velocity checks (too many returns too fast)
    ↓
If fraud detected:
    → Flag return for manual review
    → Webhook to merchant: "return.flagged"
    → Update risk score
    → Add to merchant's fraud dashboard
```

---

## 🎯 Why This Works (Validation Thesis)

### 1. Seamless Integration = Low Friction

**Merchant keeps their existing:**
- ✅ Return request UI
- ✅ File upload system
- ✅ Customer communication
- ✅ Branding and UX

**Merchant adds:**
- 2 API calls (initiate, evidence)
- 1 webhook handler (receive decisions)
- ~2 hours integration time

**Result:** Merchants can test with minimal investment

### 2. Complete Workflow = Real Value

**No gaps in the flow:**
- ✅ Return initiation → Risk scoring
- ✅ Evidence collection → Validation
- ✅ Authorization → Decision logging
- ✅ Package receipt → Auto-refund
- ✅ Fraud detection → Merchant alerts

**Result:** Merchants see immediate fraud prevention

### 3. Audit Trail = Compliance Value

**Every decision logged:**
- ✅ Why was this return approved/denied?
- ✅ What evidence was provided?
- ✅ What was the risk score?
- ✅ Can we replay this decision?

**Result:** Merchants can defend decisions to customers, regulators

### 4. Works with Existing Systems = Faster Adoption

**Integrates with:**
- ✅ Shopify (webhooks for orders/refunds)
- ✅ Stripe (automatic refund issuance)
- ✅ Merchant CDN (evidence storage)
- ✅ Carrier APIs (tracking, labels)

**Result:** No rip-and-replace, works alongside existing tools

---

## 📊 MVP Feature Priority

### Must-Have (Week 1-2)

1. **POST /returns/initiate** - Start return flow
2. **POST /returns/evidence** - Submit evidence from merchant CDN
3. **Risk scoring engine** - Basic heuristics (order value, history, reason)
4. **Evidence validation** - Image quality, receipt OCR
5. **Authorization logic** - Approve/step-up/deny decisions
6. **AEL logging** - Immutable decision log
7. **Outbound webhooks** - Notify merchant of decisions
8. **Shopify integration** - Receive order/refund webhooks
9. **Stripe integration** - Auto-issue refunds

### Should-Have (Week 3-4)

10. **Merchant dashboard** - View returns, decisions, fraud alerts
11. **Policy management** - Import/update return policies
12. **Fraud pattern detection** - Serial returners, velocity checks
13. **Manual review queue** - Flag suspicious returns
14. **Carrier integration** - Generate labels, track packages
15. **Webhook retry logic** - Reliable delivery

### Nice-to-Have (Week 5-8)

16. **Advanced ML models** - Better fraud detection
17. **Multi-merchant analytics** - Cross-merchant fraud patterns
18. **Customer risk profiles** - Track behavior over time
19. **A/B testing** - Test different decision thresholds
20. **Reporting & exports** - Compliance reports, CSV exports

---

## 💰 Business Model Validation

### Pricing Strategy

**Value-Based Pricing:**
- Merchants save 2-3% of return value in fraud
- Average return value: $50-100
- Average merchant: 100-500 returns/month
- Fraud savings: $100-1500/month

**Pricing Tiers:**
```
Starter: $99/mo
- Up to 100 returns/month
- Basic fraud detection
- 7-day audit log
- Email support

Growth: $299/mo
- Up to 500 returns/month
- Advanced fraud detection
- 30-day audit log
- Priority support
- Custom policies

Scale: $499/mo
- Up to 2000 returns/month
- ML-powered fraud detection
- 90-day audit log
- Dedicated support
- API access
- Custom integrations

Enterprise: Custom
- Unlimited returns
- White-label option
- SLA guarantees
- Custom ML models
- Dedicated CSM
```

### Unit Economics

**Per Merchant:**
- Revenue: $99-499/mo
- COGS: ~$20/mo (infrastructure, APIs)
- Gross Margin: 80%+
- CAC: $500-1000 (sales, onboarding)
- Payback: 2-5 months
- LTV: $3000-12000 (2-3 year retention)

**At Scale (100 merchants):**
- MRR: $20,000-50,000
- Annual Revenue: $240,000-600,000
- Gross Profit: $192,000-480,000
- Break-even: ~20-30 merchants

---

## 🎯 Go-to-Market Strategy

### Phase 1: Pilot Program (Weeks 1-4)

**Target:** 3-5 Shopify merchants with:
- $500K-5M annual revenue
- 10-20% return rate
- Existing fraud problem
- Technical team (can integrate APIs)

**Outreach:**
- Shopify app store listing
- Direct outreach to merchants
- E-commerce communities (Reddit, Discord)
- Referrals from payment processors

**Offer:**
- Free for first 3 months
- Hands-on onboarding
- Weekly check-ins
- Feature requests prioritized

**Success Criteria:**
- 3+ merchants onboarded
- 100+ returns processed
- 10%+ fraud detected
- Merchants want to pay after trial

### Phase 2: Early Adopters (Weeks 5-8)

**Target:** 10-20 merchants

**Channels:**
- Shopify app store (organic)
- Content marketing (fraud prevention guides)
- Partnerships (Stripe, Shopify)
- Case studies from pilots

**Pricing:**
- 50% discount for first 6 months
- Month-to-month (no contracts)
- Cancel anytime

**Success Criteria:**
- 10+ paying customers
- $2000+ MRR
- <10% churn
- Net Promoter Score >50

### Phase 3: Scale (Weeks 9-12)

**Target:** 50+ merchants

**Channels:**
- Paid ads (Google, Facebook)
- Partnerships (expand beyond Shopify)
- Sales team (outbound)
- Affiliate program

**Pricing:**
- Full price
- Annual contracts (discount)
- Add-ons (custom ML, white-label)

**Success Criteria:**
- $10,000+ MRR
- Profitable unit economics
- Self-serve onboarding
- Product-market fit validated

---

## 🔍 Key Validation Questions

### Technical Validation

1. **Can we integrate with merchant systems in <2 hours?**
   - Test: Time 3 pilot integrations
   - Success: Average <2 hours

2. **Can we detect real fraud with basic heuristics?**
   - Test: Run on historical return data
   - Success: 10%+ fraud detection, <5% false positives

3. **Can we handle 1000+ returns/day?**
   - Test: Load testing
   - Success: <500ms response time, 99.9% uptime

4. **Is the audit trail sufficient for compliance?**
   - Test: Review with legal/compliance experts
   - Success: Meets SOC 2, GDPR requirements

### Business Validation

5. **Will merchants pay $99-499/mo?**
   - Test: Pilot program, pricing surveys
   - Success: 50%+ convert after trial

6. **Is the ROI compelling (3:1 or better)?**
   - Test: Calculate fraud savings vs cost
   - Success: Average 3:1 ROI across pilots

7. **Can we acquire merchants profitably?**
   - Test: CAC from different channels
   - Success: CAC < 6 months revenue

8. **Will merchants stick around (low churn)?**
   - Test: Retention after 3, 6, 12 months
   - Success: <10% monthly churn

### Product Validation

9. **Do merchants prefer this over manual review?**
   - Test: Time savings, accuracy comparison
   - Success: 80%+ time savings, higher accuracy

10. **Does working with existing systems matter?**
    - Test: Compare to "rip and replace" solutions
    - Success: 5x faster integration

---

## 🚀 MVP Launch Plan

### Week 1-2: Core Infrastructure
- [x] Returns API (initiate, evidence, webhooks)
- [x] Risk scoring engine (basic heuristics)
- [x] Evidence validation (image quality, OCR)
- [x] AEL logging (decision audit trail)
- [x] Shopify integration (webhooks)
- [x] Stripe integration (refunds)

### Week 3-4: Merchant Tools
- [ ] Merchant dashboard (returns, decisions, fraud)
- [ ] Policy management (import, update)
- [ ] Webhook configuration (setup, test)
- [ ] Documentation (API docs, integration guide)
- [ ] Onboarding flow (guided setup)

### Week 5-6: Pilot Program
- [ ] Recruit 3-5 pilot merchants
- [ ] Hands-on integration support
- [ ] Collect feedback (weekly calls)
- [ ] Iterate on product (fix bugs, add features)
- [ ] Measure success metrics

### Week 7-8: Validation & Iteration
- [ ] Analyze pilot results
- [ ] Calculate fraud detection rate
- [ ] Measure merchant satisfaction
- [ ] Validate pricing (willingness to pay)
- [ ] Decide: pivot, persevere, or kill

---

## 🎯 Success Metrics (MVP)

### Product Metrics
- **Integration time:** <2 hours average
- **API response time:** <500ms p95
- **Uptime:** 99.9%+
- **Fraud detection rate:** 10%+ of returns
- **False positive rate:** <5%
- **Evidence validation accuracy:** 95%+

### Business Metrics
- **Pilot merchants:** 3-5 onboarded
- **Returns processed:** 100+ total
- **Fraud prevented:** $5000+ total
- **Merchant satisfaction:** 4.5/5 stars
- **Conversion to paid:** 50%+ after trial
- **ROI:** 3:1 or better

### Engagement Metrics
- **Daily active merchants:** 80%+
- **Returns per merchant:** 20+ per month
- **Dashboard usage:** 3+ sessions per week
- **Webhook delivery:** 99%+ success rate
- **Support tickets:** <1 per merchant per month

---

## 💡 Key Insights & Risks

### Why This Could Work

1. **Real Pain Point** - Return fraud is a $74-111B problem
2. **Underserved Market** - No good AI-powered solutions
3. **Easy Integration** - Works with existing systems
4. **Immediate Value** - Fraud prevention from day 1
5. **Audit Trail** - Compliance is a forcing function
6. **Network Effects** - More merchants = better fraud detection

### Risks & Mitigations

**Risk 1: Merchants won't integrate (too much work)**
- Mitigation: 2-hour integration time, hands-on support

**Risk 2: Fraud detection doesn't work (false positives)**
- Mitigation: Start conservative, tune thresholds, manual review queue

**Risk 3: Merchants won't pay (not enough value)**
- Mitigation: Prove ROI in pilot, adjust pricing

**Risk 4: Can't scale (technical limitations)**
- Mitigation: Load testing, infrastructure planning

**Risk 5: Compliance issues (data privacy, regulations)**
- Mitigation: Legal review, SOC 2 certification

**Risk 6: Competition (Stripe, Shopify build this)**
- Mitigation: Move fast, deep integrations, superior ML

---

## 🎯 Recommendation

**Build the MVP exactly as designed:**

1. ✅ **Keep it simple** - 2 API calls, webhooks, done
2. ✅ **Work with existing systems** - No portal, use merchant UI
3. ✅ **Complete workflow** - End-to-end, no gaps
4. ✅ **Prove fraud detection** - 10%+ detection rate
5. ✅ **Validate willingness to pay** - $99-499/mo

**Timeline: 4 weeks to pilot-ready MVP**

**Next Steps:**
1. Build `/returns/initiate` and `/returns/evidence` endpoints
2. Implement automatic authorization and refund issuance
3. Add outbound webhooks for merchant notifications
4. Build basic merchant dashboard
5. Recruit 3-5 pilot merchants
6. Measure, learn, iterate

**This is a strong MVP strategy because:**
- ✅ Validates core hypothesis (merchants will pay for AI fraud detection)
- ✅ Works with existing systems (low friction)
- ✅ Complete workflow (real value)
- ✅ Fast to build (4 weeks)
- ✅ Clear success metrics (fraud detection, ROI, satisfaction)

**Want me to start building the MVP endpoints?**
