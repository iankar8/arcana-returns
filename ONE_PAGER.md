# Arcana: Agentic Commerce Merchant Adapter

**One Integration. Every Agent Platform.**

---

## The Problem

Merchants want to accept agent-initiated returns from ChatGPT, Gemini, Claude, and other AI platforms. But each platform requires separate integration:

| Protocol | Merchant Engineering Cost |
|----------|--------------------------|
| Stripe/OpenAI ACP | 2-3 weeks |
| Google AP2 | 3-4 weeks |
| Visa TAP | 2-3 weeks |
| Mastercard Agent Pay | 2-3 weeks |
| **TOTAL** | **9-13 weeks + $90k-$130k** |

Plus ongoing maintenance for protocol updates, security patches, and new platforms.

---

## The Solution: Arcana

**Attestation verification middleware that lets merchants accept returns from ANY agent platform with one integration.**

```typescript
// Merchant's existing returns endpoint
app.post('/returns', (req, res) => {
  // Handle return
});

// Add Arcana (literally one line)
app.post('/returns', 
  arcana.verifyAgent(), // ← Handles all platforms
  (req, res) => {
    const { platform, agent_id } = req.agent; // Verified identity
    // Handle return
  }
);
```

**Integration time:** 10 minutes  
**Cost:** Per-transaction pricing (starts free)

---

## How It Works

```
Agent Platform          Arcana              Merchant
(ChatGPT/Gemini)       Middleware          Returns API
       │                   │                    │
       │  X-Agent-         │                    │
       │  Attestation      │                    │
       ├──────────────────►│                    │
       │  (JWT/VC/SPT)     │                    │
       │                   │ 1. Detect format   │
       │                   │ 2. Verify sig      │
       │                   │ 3. Extract ID      │
       │                   │                    │
       │                   ├───────────────────►│
       │                   │  Verified agent    │
       │                   │  context           │
       │                   │                    │
```

**What Arcana Does:**
1. Detects attestation format (JWT, Verifiable Credential, SPT, custom)
2. Verifies cryptographic signature with platform's public key
3. Extracts agent identity and platform info
4. Passes clean, verified data to merchant's existing API

**What Merchant Does:**
- Add middleware to returns endpoint
- Receive verified agent context in request
- That's it

---

## Value Proposition

### For Platforms (OpenAI, Google, Stripe)
- **Stop hiring BD teams to onboard merchants**
- Integrate Arcana once → access entire merchant network
- We handle protocol maintenance and security
- Focus on your platform, not merchant ops

### For Merchants
- **Accept all agent platforms with one integration**
- 10 minutes vs. 9-13 weeks of engineering
- Zero per-platform maintenance burden
- Future-proof (new platforms auto-supported)

### For Agents
- **Transact at any merchant that uses Arcana**
- Consistent return flow across merchants
- No per-merchant credential management

---

## Protocols Supported

✅ **Stripe/OpenAI ACP** - Shared Payment Tokens (SPT)  
✅ **Google AP2** - Verifiable Credentials (Mandates)  
✅ **Visa TAP** - JWT/JWS ID Tokens  
🔄 **Mastercard Agent Pay** - Agentic Tokens (when specs available)  
✅ **Custom** - JWKS-based verification for any platform

---

## Business Model

### Starter (Free)
- 1,000 verifications/month
- All protocols
- Community support

### Growth ($49/mo)
- Includes 10,000 verifications
- $0.05 per additional verification
- Priority support
- Custom attestation formats

### Enterprise (Custom)
- Volume pricing
- Dedicated support
- On-premise deployment
- SLA guarantees

---

## Current Status

### Built ✅
- Returns API with policy versioning
- JWT signing/verification (Ed25519)
- Risk scoring & evidence ladder
- Audit logging (AEL)
- Shopify + Stripe webhooks

### Building Now (Week 1)
- Attestation verification middleware
- Protocol adapters (JWT, VC, SPT)
- API documentation
- Landing page + demo

### Roadmap
- **Week 2:** Beta merchant onboarding
- **Month 1:** 50 merchants, 10k+ verifications
- **Q1 2026:** Full checkout support (not just returns)

---

## Why Now?

**Holiday 2025 will see unexpected agentic commerce volume.** Merchants need this infrastructure yesterday.

### Market Signals
- OpenAI launched ChatGPT Instant Checkout (Oct 2025)
- Google announced AP2 (Sep 2025)
- Visa TAP in production
- Mastercard Agent Pay announced (Apr 2025)

**Every platform is building merchant onboarding infrastructure.** We do it once for all of them.

---

## The Ask

### For Platforms (OpenAI, Stripe, Google)
1. Pilot with 3-5 merchants you're onboarding
2. Access to integration docs/specs where needed
3. Intro to merchants interested in agentic returns

### For Merchants
1. Beta access (free during pilot)
2. 30-min integration session
3. Feedback on developer experience

---

## Team

**Ian Kar** - Founder  
- Building agentic commerce infrastructure
- Previous: [Your background]

---

## Contact

**Website:** arcana.dev (coming soon)  
**Email:** ian@arcana.dev  
**Demo:** [book demo link]  
**Docs:** github.com/arcana/docs

---

## Traction Target

**Week 1:** 5 beta merchants signed  
**Week 2:** 100+ attestations verified  
**Month 1:** 50 merchants, 10k+ verifications  
**Q1 2026:** Revenue positive

---

**Bottom Line:**  
We're building the Plaid/Stripe for agentic commerce merchant acceptance. Single integration, every platform, zero maintenance.

**Let's talk.**
