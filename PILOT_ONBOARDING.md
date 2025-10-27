# Arcana Returns API - Pilot Program

## 🎉 Welcome to the Arcana Returns Pilot!

Thank you for being an early partner. This document contains everything you need to get started.

---

## 📋 Your Pilot Details

**Program Duration:** 90 days  
**Start Date:** [To be filled]  
**API Base URL:** `https://arcana-returns-api.fly.dev`  
**Your Credentials:** [See secure email]

```
Merchant ID: [To be provided]
API Key: sk_[To be provided]
Policy ID: plc_[To be provided]
```

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Verify Access

Test that your credentials work:

```bash
curl https://arcana-returns-api.fly.dev/health
```

Expected response:
```json
{"status":"ok","version":"0.1.0","timestamp":"2025-10-27T..."}
```

### Step 2: Issue Your First Return Token

Replace `YOUR_API_KEY` and `YOUR_POLICY_ID` with your credentials:

```bash
curl -X POST https://arcana-returns-api.fly.dev/returns/token \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "test_order_001",
    "customer_ref": "test_customer_001",
    "items": [{
      "sku": "TEST-SKU",
      "qty": 1,
      "price_cents": 4999
    }],
    "reason_code": "doesnt_fit",
    "policy_id": "YOUR_POLICY_ID"
  }'
```

Expected response:
```json
{
  "return_token": "rt.eyJ...",
  "risk_score": 0.2,
  "required_evidence": ["photo_packaging"]
}
```

### Step 3: Authorize the Return

```bash
# Save the return_token from step 2
RETURN_TOKEN="rt.eyJ..."

curl -X POST https://arcana-returns-api.fly.dev/returns/authorize \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "return_token": "'$RETURN_TOKEN'",
    "evidence": [{
      "type": "photo_packaging",
      "url": "https://example.com/photo.jpg"
    }]
  }'
```

Expected response:
```json
{
  "decision": "approve",
  "conditions": {
    "restock_pct": 0,
    "window": 30
  },
  "label_credential": "lbl_...",
  "audit_ref": "aud_..."
}
```

### Step 4: Commit the Return

```bash
curl -X POST https://arcana-returns-api.fly.dev/returns/commit \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "return_token": "'$RETURN_TOKEN'",
    "receipt_event": {
      "type": "scan",
      "carrier": "UPS",
      "ts": "2025-10-27T18:00:00Z"
    }
  }'
```

Expected response:
```json
{
  "refund_instruction": "instant",
  "final_receipt": {
    "return_id": "ret_...",
    "refund_amount_cents": 4999
  }
}
```

---

## 📚 Full Documentation

- **[Quickstart Guide](./QUICKSTART.md)** - Step-by-step getting started
- **[API Reference](./docs/api-reference-enhanced.md)** - Complete endpoint documentation
- **[Examples](./examples/)** - Working code examples
- **[Integration Patterns](./INTEGRATION_PATTERNS.md)** - Best practices

---

## 🎯 Pilot Objectives

### What We're Testing:
1. **Fraud detection accuracy** - Does it catch real fraud?
2. **Integration ease** - How long to integrate?
3. **Performance** - Response times, uptime
4. **Value** - Time/money saved vs manual process

### What We Need From You:
- ✅ Process **50-100 returns** during the 90-day pilot
- ✅ **Weekly feedback calls** (Fridays at 2pm PT)
- ✅ **Report bugs immediately** via email or Slack
- ✅ **Share metrics** (fraud caught, approval times, error rates)
- ✅ **Be honest** about what works and what doesn't

### What You'll Get:
- ✅ Free API access during pilot
- ✅ Direct access to engineering team
- ✅ Influence product roadmap
- ✅ Early adopter pricing when we launch
- ✅ Co-marketing opportunities (case study, press release)

---

## 💬 Support During Pilot

### Response Times:
- **Critical issues** (system down): 30 minutes
- **Bugs/errors**: 2 hours
- **Questions**: 4 hours
- **Feature requests**: Weekly call

### How to Reach Us:
- **Email:** support@arcanalabs.dev
- **Slack:** [Dedicated channel to be created]
- **Emergency:** [Phone number to be provided]

### Weekly Check-ins:
- **Day:** Fridays
- **Time:** 2:00pm PT
- **Duration:** 30 minutes
- **Format:** Video call (Zoom link to be sent)

---

## 🔧 Integration Guide

### Common Integration Patterns:

#### 1. Shopify Integration
If you use Shopify, we can automatically sync returns:

```bash
# We'll set up webhook listeners for:
# - orders/updated (to detect return requests)
# - refunds/create (to track refund completion)
```

#### 2. Custom E-commerce Platform
Integrate at checkout completion:

```javascript
// After order is placed
const returnToken = await fetch('https://arcana-returns-api.fly.dev/returns/token', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    order_id: order.id,
    customer_ref: customer.id,
    items: order.items.map(item => ({
      sku: item.sku,
      qty: item.quantity,
      price_cents: item.price
    })),
    reason_code: 'placeholder', // Will be updated when return initiated
    policy_id: 'YOUR_POLICY_ID'
  })
});

// Store return_token in your database for later use
```

#### 3. Manual Process
For pilot, you can manually process returns:
1. Customer emails requesting return
2. You call `/returns/token` via Postman/curl
3. Customer uploads photos
4. You call `/returns/authorize` with evidence
5. Package arrives, you call `/returns/commit`

---

## ⚠️ Pilot Disclaimers

Please read carefully:

### System Status
- ✅ **Current Status:** Production-deployed, stable
- ⚠️ **Uptime Target:** 99% (not guaranteed during pilot)
- ⚠️ **May require restarts:** For updates/fixes
- ⚠️ **Features may change:** Based on your feedback

### Data & Privacy
- 📊 **Data retention:** 90 days during pilot
- 🔒 **Security:** API keys, encryption in transit
- 🌍 **Location:** US-only during pilot (no EU merchants)
- 📧 **Notifications:** We'll email before any breaking changes

### Financial
- 💰 **Pilot is free:** No charges during 90-day period
- 📈 **Post-pilot pricing:** TBD, will share before pilot ends
- 🤝 **No commitment:** Either party can exit with 7 days notice

### Support
- ⏰ **Business hours:** M-F 9am-6pm PT
- 🚫 **Not 24/7:** Yet (coming in v1.0)
- 📞 **Emergency contact:** For critical system down only

---

## 📊 Success Metrics

We'll track together:

### Technical Metrics:
- ✅ Uptime %
- ✅ p95/p99 latency
- ✅ Error rate
- ✅ Integration time

### Business Metrics:
- ✅ Fraud caught (false positive rate)
- ✅ Time saved vs manual review
- ✅ Customer satisfaction
- ✅ Return approval rate

### Your Feedback:
- ✅ Net Promoter Score (NPS)
- ✅ Feature requests
- ✅ Pain points
- ✅ Would you pay for this?

---

## 🐛 Reporting Issues

### Bug Report Template:

```
**Issue:** [Brief description]
**Severity:** Critical / High / Medium / Low
**When:** [Timestamp]
**Endpoint:** [e.g., POST /returns/token]
**Request:** [Sanitized request body]
**Response:** [Error message]
**Trace ID:** [From error response]
**Expected:** [What should have happened]
```

Send to: support@arcanalabs.dev

---

## 🎓 Best Practices

### API Keys
- ✅ Store securely (environment variables, not code)
- ✅ Never commit to Git
- ✅ Rotate monthly (we'll remind you)
- ✅ Use separate keys for dev/staging/prod

### Error Handling
- ✅ Always check response status codes
- ✅ Log trace IDs for debugging
- ✅ Implement retry logic (with backoff)
- ✅ Handle rate limits gracefully

### Evidence Collection
- ✅ HTTPS URLs only
- ✅ Images < 10MB
- ✅ JPG/PNG formats
- ✅ Clear, well-lit photos

### Idempotency
- ✅ Use unique idempotency keys for token issuance
- ✅ Safe to retry with same key
- ✅ Keys valid for 24 hours

---

## 🎉 Next Steps

1. **Today:** Test the quick start guide above
2. **This week:** Integration kickoff call (30 min)
3. **Week 1:** Process first 5-10 returns
4. **Week 2:** First feedback call
5. **Ongoing:** Weekly calls, continuous feedback

---

## ❓ FAQ

**Q: What if the API goes down during a return?**  
A: Returns are idempotent - safe to retry. We aim for <5 min recovery time.

**Q: Can I use this in production?**  
A: Yes, but with pilot disclaimers above. Start with low-risk returns.

**Q: What happens after the pilot?**  
A: We'll discuss pricing and full production deployment. No forced commitment.

**Q: Can I invite other team members?**  
A: Yes! We'll create additional API keys and Slack access.

**Q: What data do you store?**  
A: Order IDs, return tokens, decisions, evidence URLs. No payment info. See privacy policy.

**Q: Can I export my data?**  
A: Yes, via API or we can provide CSV export.

**Q: Do you support [X feature]?**  
A: Maybe! Let's discuss on our weekly call.

---

## 📞 Contact

**Primary Contact:** Ian Kar  
**Email:** support@arcanalabs.dev  
**Response Time:** <2 hours (M-F business hours)

**Weekly Call:** Fridays 2pm PT  
**Zoom Link:** [To be sent weekly]

---

**Welcome aboard! Let's build something great together. 🚀**

---

*Last Updated: October 27, 2025*  
*Version: 0.1.0-pilot*
