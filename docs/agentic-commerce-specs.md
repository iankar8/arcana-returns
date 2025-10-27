# Agentic Commerce Protocol Specifications

**Research Date:** October 26, 2025  
**Purpose:** Normalize agent attestation formats for Arcana Returns integration

---

## Executive Summary

Three major agentic commerce protocols have emerged:

1. **Stripe/OpenAI Agentic Commerce Protocol (ACP)** - Open standard, production-ready
2. **Google Agent Payments Protocol (AP2)** - Intent mandate-based, verifiable credentials
3. **Visa Trusted Agent Protocol (TAP)** - JWT-based ID tokens, merchant verification
4. **Mastercard Agent Pay** - Agentic tokens (limited public specs)

**Key Finding:** Agent attestation is **platform-issued** (OpenAI, Google, etc.), not merchant-scoped. Think of this as **"Plaid for agentic commerce"** - a trust layer between agents, merchants, and payment providers.

---

## 1. Stripe/OpenAI Agentic Commerce Protocol (ACP)

### Overview
- **Maintainers:** OpenAI & Stripe
- **Status:** Draft, production-ready (ChatGPT Instant Checkout live)
- **License:** Apache 2.0
- **Repo:** https://github.com/agentic-commerce-protocol/agentic-commerce-protocol

### Architecture

```
┌──────────┐         ┌──────────┐         ┌──────────┐
│  Buyer   │────────▶│ AI Agent │────────▶│ Merchant │
│          │         │ (ChatGPT)│         │          │
└──────────┘         └──────────┘         └──────────┘
                           │                     │
                           │                     │
                     ┌─────▼─────┐         ┌─────▼─────┐
                     │   SPT     │         │    PSP    │
                     │  (Stripe) │◀────────│  (Stripe) │
                     └───────────┘         └───────────┘
```

### Payment Token Format: Shared Payment Token (SPT)

**Type:** Proprietary token (not JWS/JWT)  
**Issuer:** AI Platform (OpenAI)  
**Scope:** Merchant-specific, single-use or reusable  
**Constraints:**
- Max amount limit
- Time-bound expiry
- Revocable via webhook
- Scoped to specific business

**Flow:**
1. Buyer saves payment method in ChatGPT
2. Buyer clicks "Buy" → OpenAI issues SPT scoped to merchant
3. OpenAI sends SPT identifier to merchant via API
4. Merchant creates PaymentIntent with SPT
5. Stripe processes payment with fraud detection

**Key Properties:**
- **Programmable:** Time/amount limits, revocable
- **Reusable:** Saved payment methods
- **Secure:** Credentials never exposed
- **Fraud-protected:** Stripe Radar integration
- **Interoperable:** Compatible with card network agentic tokens

### Attestation Format

**No explicit agent attestation in ACP v1.** Authentication is via:
- **API Keys:** Bearer tokens in `Authorization` header
- **Optional Signature Header:** `Signature: ZXltZX...` (format unspecified)
- **Optional Timestamp:** `Timestamp: 2025-09-29T10:30:00Z`

**Delegated Payment Spec:**
- OpenAI sends payment data directly to PSP
- PSP returns scoped payment token
- Token forwarded to merchant during checkout completion

**Who Issues Attestations:** OpenAI (for ChatGPT), other AI platforms for their agents

### Checkout Endpoints (Merchant-Implemented)

```
POST /checkout_sessions
GET  /checkout_sessions/{id}
POST /checkout_sessions/{id}
POST /checkout_sessions/{id}/complete
POST /checkout_sessions/{id}/cancel
```

**Headers:**
- `Authorization: Bearer api_key_123`
- `Content-Type: application/json`
- `Accept-Language: en-US` (optional)
- `User-Agent: ChatGPT/2.0 (Mac OS X 15.0.1; arm64; build 0)` (optional)
- `Idempotency-Key: idempotency_key_123` (optional)
- `Request-Id: request_id_123` (optional)
- `Signature: ZXltZX...` (optional)
- `Timestamp: 2025-09-29T10:30:00Z` (optional)
- `API-Version: 2025-09-29` (required)

### Data Structures

**Buyer:**
```json
{
  "first_name": "string",
  "last_name": "string",
  "email": "string",
  "phone_number": "string"
}
```

**PaymentData:**
```json
{
  "token": "string",
  "provider": "stripe",
  "billing_address": { ... }
}
```

**Order:**
```json
{
  "id": "string",
  "checkout_session_id": "string",
  "permalink_url": "string"
}
```

### Security Model

- **Merchant of Record:** Merchant (not OpenAI)
- **PCI Scope:** Delegated Payment Spec involves CHD handling
- **TLS:** 1.2+ required
- **Network Tokens:** Migration planned for eligible cards
- **Single-use Tokens:** Max amount + expiry constraints

### Reputation/Trust Model

**Not specified in ACP v1.** Trust is implicit via:
- Platform reputation (OpenAI, Stripe)
- Stripe Radar fraud detection
- Merchant risk signals

**No decay policy defined.**

---

## 2. Google Agent Payments Protocol (AP2)

### Overview
- **Maintainer:** Google Cloud
- **Status:** Announced September 2025
- **Focus:** Intent mandates + verifiable credentials
- **Announcement:** https://cloud.google.com/blog/products/ai-machine-learning/announcing-agents-to-payments-ap2-protocol

### Architecture

```
┌──────────┐         ┌──────────┐         ┌──────────┐
│  User    │────────▶│ AI Agent │────────▶│ Merchant │
│          │         │ (Gemini) │         │          │
└──────────┘         └──────────┘         └──────────┘
      │                    │                     │
      │ Signs Mandate      │ Presents Mandate   │
      │                    │                     │
      ▼                    ▼                     ▼
┌─────────────────────────────────────────────────────┐
│         Intent Mandate (Verifiable Credential)      │
│         Cart Mandate (Verifiable Credential)        │
└─────────────────────────────────────────────────────┘
```

### Attestation Format: Mandates (Verifiable Credentials)

**Type:** Cryptographically-signed digital contracts  
**Issuer:** User (signed by user's credential)  
**Format:** Verifiable Credentials (W3C standard)  
**Scope:** Transaction-specific

**Two Types of Mandates:**

1. **Intent Mandate** (Human Present)
   - User request: "Find me new white running shoes"
   - Captures initial intent
   - Provides auditable context

2. **Cart Mandate** (Human Present)
   - User approval after agent presents cart
   - Tamper-proof record of exact items + price
   - Ensures "what you see is what you pay for"

3. **Intent Mandate** (Delegated Task)
   - User pre-authorizes: "Buy concert tickets the moment they go on sale"
   - Specifies rules: price limits, timing, conditions
   - Agent auto-generates Cart Mandate when conditions met

**Chain of Evidence:**
```
Intent Mandate → Cart Mandate → Payment Method → Non-repudiable Audit Trail
```

### Who Issues Attestations

**User issues mandates** (via their agent platform)  
**Agent platform** (Google, Gemini) validates and presents mandates to merchants

### Trust Model

**Authorization:** Proving user gave agent authority for specific purchase  
**Authenticity:** Ensuring agent request reflects user's true intent  
**Accountability:** Determining responsibility for fraudulent/incorrect transactions

**Verifiable Credentials provide:**
- Tamper-proof evidence
- Cryptographic signatures
- Non-repudiable audit trail

### Reputation/Decay Policy

**Not specified in announcement.** Focus is on mandate-based trust, not agent reputation scoring.

---

## 3. Visa Trusted Agent Protocol (TAP)

### Overview
- **Maintainer:** Visa
- **Status:** Production (limited documentation)
- **Spec:** https://developer.visa.com/capabilities/trusted-agent-protocol/trusted-agent-protocol-specifications (access restricted)

### Attestation Format: ID Token (JWT)

**Type:** JWT (JSON Web Token)  
**Issuer:** Visa  
**Format:** JWS (JSON Web Signature) per RFC 7515  
**Signature:** Digitally signed by Visa

**JOSE Header (RFC 7519):**
- Compliant with RFC 7519
- Required fields per RFC (exact fields not publicly documented)

**ID Token Claims:**
- Represents digitally-signed attestation
- Consumer identified by Payment Scheme
- Merchant validates using Visa's public key

### Who Issues Attestations

**Visa issues ID tokens** after consumer identification by payment scheme

### Trust Model

- **Agent Indication:** Token indicates agent is "Visa trusted agent"
- **Intent Signal:** Retrieve/purchase intent for specific product/service
- **Consumer Data:** Multiple consumer-related data elements for merchant insight
- **Merchant Verification:** Merchants validate token using Visa's public key

### Integration Patterns

1. **API/Protocol-based:** Pass all payment info (token, addresses) to complete transaction
2. **Customer with Merchant Account:** Verifiable token ID or loyalty account

### Reputation/Decay Policy

**Not publicly documented.**

---

## 4. Mastercard Agent Pay

### Overview
- **Maintainer:** Mastercard
- **Status:** Announced April 2025
- **Focus:** Agentic tokens (new tokenization class)
- **Announcement:** (access restricted)

### Attestation Format: Agentic Tokens

**Type:** New class of secure, dynamic tokens  
**Issuer:** Mastercard  
**Technology:** Derived from contactless payment tokenization

**Key Features:**
- Secure, dynamic tokens
- Purpose-built for AI agent transactions
- Scalable merchant participation without heavy integration

### Mastercard Agent Pay Acceptance Framework

- Enables merchant participation with minimal development
- Scalability and ubiquity focus
- Secure transaction standards for agentic commerce

### Reputation/Decay Policy

**Not publicly documented.**

---

## Comparative Analysis

| Protocol | Attestation Format | Issuer | Scope | Reputation Model |
|----------|-------------------|--------|-------|------------------|
| **ACP (Stripe/OpenAI)** | SPT (proprietary token) | AI Platform | Merchant-specific | Implicit (Stripe Radar) |
| **AP2 (Google)** | Verifiable Credentials (Mandates) | User (via platform) | Transaction-specific | Mandate-based trust |
| **TAP (Visa)** | JWT (JWS) | Visa | Consumer-specific | Not disclosed |
| **Agent Pay (Mastercard)** | Agentic Tokens | Mastercard | Not disclosed | Not disclosed |

---

## Key Questions Answered

### 1. What's the agent attestation format?

**Mixed:**
- **ACP:** No explicit attestation (API keys + optional signature header)
- **AP2:** Verifiable Credentials (W3C standard)
- **TAP:** JWT/JWS (RFC 7515/7519)
- **Agent Pay:** Proprietary agentic tokens

**Recommendation for Arcana:** Support multiple formats via adapter pattern:
- JWT/JWS parser for Visa TAP
- VC validator for Google AP2
- SPT handler for Stripe/OpenAI ACP
- Generic signature verification for custom implementations

### 2. Who issues attestations?

**Platform-issued, not merchant-scoped:**
- **OpenAI** issues SPTs for ChatGPT
- **Google** validates/presents mandates for Gemini
- **Visa** issues ID tokens for trusted agents
- **Mastercard** issues agentic tokens

**Analogy:** Like Plaid for banking - platforms provide trust layer between agents and merchants.

### 3. What's the reputation decay policy?

**Not publicly specified by any protocol.**

**Recommendation for Arcana:**
- Implement time-based decay: `reputation_score = base_score * e^(-λt)`
- Default decay constant: λ = 0.1 (10% decay per time unit)
- Configurable per merchant
- Track metrics:
  - Successful transactions
  - Disputed returns
  - Fraud incidents
  - Policy violations

**Decay triggers:**
- Time since last transaction
- Negative events (chargebacks, fraud)
- Policy changes (reset on major updates)

### 4. Is this merchant-scoped or global?

**Hybrid model:**

**Global Trust Layer:**
- Platform attestations (OpenAI, Google, Visa, Mastercard)
- Agent identity verification
- Cross-merchant reputation signals

**Merchant-Scoped:**
- Payment tokens (SPTs scoped to specific merchant)
- Checkout sessions (merchant-specific)
- Risk policies (merchant-defined)

**Banning:**
- **Global:** Platform-level (OpenAI can ban agent from ChatGPT)
- **Merchant-level:** Merchant can reject specific agents via API keys/allowlists

**Recommendation for Arcana:**
- Support both global and merchant-scoped reputation
- Global: Agent platform reputation score (0-100)
- Merchant: Per-merchant trust score (0-100)
- Combined score: `final_score = 0.6 * global + 0.4 * merchant`

---

## Integration Recommendations for Arcana

### 1. Multi-Protocol Support

```typescript
interface AgentAttestation {
  format: 'jwt' | 'vc' | 'spt' | 'custom';
  issuer: string; // 'openai', 'google', 'visa', 'mastercard', etc.
  token: string;
  claims: Record<string, any>;
  verified: boolean;
  verifiedAt: Date;
}

interface AgentIdentity {
  platform: string; // 'chatgpt', 'gemini', 'claude', etc.
  agentId: string;
  attestation: AgentAttestation;
  reputation: {
    global: number; // 0-100
    merchant: number; // 0-100
    combined: number; // weighted average
    lastUpdated: Date;
  };
}
```

### 2. Attestation Verification Service

```typescript
class AttestationVerifier {
  async verify(attestation: AgentAttestation): Promise<boolean> {
    switch (attestation.format) {
      case 'jwt':
        return this.verifyJWT(attestation); // Visa TAP
      case 'vc':
        return this.verifyVC(attestation); // Google AP2
      case 'spt':
        return this.verifySPT(attestation); // Stripe/OpenAI ACP
      case 'custom':
        return this.verifyCustom(attestation);
    }
  }

  private async verifyJWT(attestation: AgentAttestation): Promise<boolean> {
    // Fetch Visa public key from JWKS endpoint
    // Verify signature per RFC 7515
    // Validate claims (exp, iss, aud)
  }

  private async verifyVC(attestation: AgentAttestation): Promise<boolean> {
    // Verify W3C Verifiable Credential
    // Check mandate chain (Intent → Cart)
    // Validate cryptographic signatures
  }

  private async verifySPT(attestation: AgentAttestation): Promise<boolean> {
    // Verify SPT via Stripe API
    // Check scope, expiry, revocation status
  }
}
```

### 3. Reputation Scoring System

```typescript
interface ReputationConfig {
  decayConstant: number; // λ for exponential decay
  decayInterval: 'day' | 'week' | 'month';
  weights: {
    successfulTransactions: number;
    disputedReturns: number;
    fraudIncidents: number;
    policyViolations: number;
  };
  thresholds: {
    ban: number; // Auto-ban below this score
    stepUp: number; // Require additional evidence
    trusted: number; // Fast-track approval
  };
}

class ReputationEngine {
  calculateScore(
    agentId: string,
    merchantId: string,
    config: ReputationConfig
  ): number {
    const events = this.getAgentEvents(agentId, merchantId);
    const baseScore = this.computeBaseScore(events, config.weights);
    const decayedScore = this.applyDecay(baseScore, config);
    return Math.max(0, Math.min(100, decayedScore));
  }

  private applyDecay(score: number, config: ReputationConfig): number {
    const timeSinceLastEvent = this.getTimeSinceLastEvent();
    const decayFactor = Math.exp(-config.decayConstant * timeSinceLastEvent);
    return score * decayFactor;
  }
}
```

### 4. Return Token Enhancement

Add agent attestation to existing Return Token (RT):

```typescript
interface ReturnTokenPayload {
  // Existing fields
  policy_hash: string;
  items_hash: string;
  risk_score: number;
  trace_id: string;
  
  // New: Agent attestation
  agent?: {
    platform: string;
    agent_id: string;
    attestation_format: 'jwt' | 'vc' | 'spt' | 'custom';
    attestation_token: string;
    reputation_score: number;
    verified: boolean;
  };
}
```

### 5. Policy Graph Extension

Add agent reputation rules to policy snapshots:

```typescript
interface PolicySnapshot {
  // Existing fields
  policy_id: string;
  snapshot_id: string;
  hash: string;
  return_window_days: number;
  
  // New: Agent reputation rules
  agent_reputation?: {
    enabled: boolean;
    min_score: number; // Minimum reputation to auto-approve
    step_up_threshold: number; // Require evidence below this
    ban_threshold: number; // Auto-deny below this
    platforms_allowed: string[]; // ['chatgpt', 'gemini', 'claude']
    platforms_blocked: string[];
  };
}
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- [ ] Design `AgentAttestation` and `AgentIdentity` schemas
- [ ] Add database tables: `agent_identities`, `agent_reputation`, `agent_events`
- [ ] Implement JWT verifier (Visa TAP support)
- [ ] Add agent fields to Return Token payload

### Phase 2: Multi-Protocol Support (Week 3-4)
- [ ] Implement VC verifier (Google AP2 support)
- [ ] Implement SPT verifier (Stripe/OpenAI ACP support)
- [ ] Build attestation adapter pattern
- [ ] Add platform-specific JWKS/public key fetching

### Phase 3: Reputation Engine (Week 5-6)
- [ ] Implement reputation scoring algorithm
- [ ] Add time-based decay logic
- [ ] Build event tracking (success, disputes, fraud)
- [ ] Create merchant reputation config UI

### Phase 4: Policy Integration (Week 7-8)
- [ ] Extend policy graph with agent reputation rules
- [ ] Add reputation checks to authorization flow
- [ ] Implement auto-ban/step-up logic
- [ ] Build merchant allowlist/blocklist

### Phase 5: Analytics & Monitoring (Week 9-10)
- [ ] Add reputation metrics to dashboard
- [ ] Build agent behavior analytics
- [ ] Create reputation decay alerts
- [ ] Implement A/B testing for reputation thresholds

---

## Open Questions

1. **JWKS Endpoints:** Where do platforms publish public keys for JWT verification?
   - Visa TAP: Not publicly documented
   - OpenAI: TBD
   - Google: TBD

2. **Mandate Format Details:** What's the exact VC schema for Google AP2 mandates?
   - Need access to Google AP2 spec

3. **SPT Verification API:** Does Stripe provide an API to verify SPT validity?
   - Check Stripe docs

4. **Cross-Platform Reputation:** Should we aggregate reputation across platforms?
   - Example: Agent has high score on ChatGPT, low on Gemini
   - Recommendation: Keep separate, use platform-specific scores

5. **Reputation Portability:** Can agents export/import reputation scores?
   - Privacy implications
   - Recommendation: No portability in v1, revisit later

---

## References

- **ACP Spec:** https://github.com/agentic-commerce-protocol/agentic-commerce-protocol
- **ACP Docs (Stripe):** https://docs.stripe.com/agentic-commerce
- **ACP Docs (OpenAI):** https://developers.openai.com/commerce/
- **Google AP2:** https://cloud.google.com/blog/products/ai-machine-learning/announcing-agents-to-payments-ap2-protocol
- **Visa TAP:** https://developer.visa.com/capabilities/trusted-agent-protocol/overview
- **Mastercard Agent Pay:** (access restricted)

---

## Conclusion

**Agentic commerce is platform-issued, not merchant-scoped.** Platforms (OpenAI, Google, Visa, Mastercard) provide the trust layer via attestations. Arcana should act as a **"Plaid for agentic commerce"** - normalizing attestation formats and providing merchant-level reputation scoring on top of global platform trust.

**Next Steps:**
1. Implement multi-protocol attestation verification
2. Build reputation engine with configurable decay
3. Extend policy graph with agent reputation rules
4. Monitor emerging standards (ACP is still in draft)
