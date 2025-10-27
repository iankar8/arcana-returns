# Arcana Agentic Commerce Integration - Implementation Plan

## Vision
Build attestation verification middleware that lets merchants accept returns from ANY agentic platform (ChatGPT, Gemini, Claude, etc.) with zero per-platform integration work.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│           Agent Platform (ChatGPT, Gemini, etc)         │
│  Sends: X-Agent-Attestation header (JWT/VC/SPT/etc)    │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                 Arcana Middleware                        │
│  1. Detect format (JWT/VC/SPT/custom)                   │
│  2. Verify signature                                     │
│  3. Extract agent_id, platform, claims                  │
│  4. Pass clean data to merchant                         │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│            Merchant's Existing Returns API               │
│  Receives: Verified agent info in request context       │
└─────────────────────────────────────────────────────────┘
```

## Phase 1: Core Attestation Middleware (Days 1-3)

### 1.1 Attestation Verifier Service
**File:** `src/services/attestation.ts`

**Features:**
- Auto-detect attestation format (JWT, VC, SPT, custom)
- Multi-protocol signature verification
- Agent identity extraction
- Caching of public keys (JWKS)
- Error handling for invalid attestations

**Endpoints to support:**
- Visa TAP: JWT/JWS with Visa public key
- Google AP2: Verifiable Credentials (W3C standard)
- Stripe/OpenAI ACP: SPT tokens
- Generic: Custom formats with JWKS endpoint

### 1.2 Protocol Adapters
**Files:**
- `src/adapters/visa-tap.ts` - JWT verifier for Visa TAP
- `src/adapters/google-ap2.ts` - VC verifier for Google AP2
- `src/adapters/stripe-acp.ts` - SPT verifier for Stripe/OpenAI
- `src/adapters/custom.ts` - Generic JWKS-based verification

### 1.3 Middleware Integration
**File:** `src/server/middleware/agent-auth.ts`

**Features:**
- Extract `X-Agent-Attestation` header
- Verify attestation via appropriate adapter
- Inject verified agent info into request context
- Optional: Log attestation events
- Optional: Rate limit per agent_id

### 1.4 Enhanced Returns API
**Update:** `src/types/returns.ts`

Add agent context to all return operations:
```typescript
interface AgentContext {
  platform: string;        // 'chatgpt', 'gemini', 'claude'
  agent_id: string;        // Unique agent identifier
  attestation_format: string; // 'jwt', 'vc', 'spt'
  verified: boolean;
  verified_at: Date;
  claims?: Record<string, any>; // Raw claims from attestation
}
```

### 1.5 Database Schema Updates
**Update:** `src/db/schema.sql`

Add agent tracking tables:
```sql
CREATE TABLE agent_attestations (
  id TEXT PRIMARY KEY,
  trace_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  attestation_format TEXT NOT NULL,
  verified BOOLEAN NOT NULL,
  raw_attestation TEXT,
  claims TEXT, -- JSON
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_agent_attestations_agent_id ON agent_attestations(agent_id);
CREATE INDEX idx_agent_attestations_platform ON agent_attestations(platform);
```

---

## Phase 2: API Documentation (Day 4)

### 2.1 OpenAPI Spec
**File:** `docs/openapi/agentic-commerce.yaml`

Document:
- Attestation header format
- Expected request/response schemas
- Error codes for verification failures
- Examples for each protocol

### 2.2 Integration Guide
**File:** `docs/integration-guide.md`

Sections:
- Quick Start (5-minute setup)
- Attestation formats by platform
- Testing with mock attestations
- Production deployment checklist
- Troubleshooting guide

### 2.3 API Reference Updates
**Update:** `docs/api-reference.md`

Add:
- Agent attestation endpoints
- Verification status endpoints
- Agent analytics endpoints

---

## Phase 3: Landing Page (Day 5)

### 3.1 Marketing Site
**Directory:** `landing/`

**Tech Stack:**
- Next.js 14 (App Router)
- TailwindCSS
- Framer Motion (animations)
- shadcn/ui components

**Pages:**
1. **Home** (`/`)
   - Hero: "Accept agent returns from any platform. One integration."
   - Problem/Solution
   - Protocol comparison chart
   - CTA: "Get Started" / "Book Demo"

2. **How It Works** (`/how-it-works`)
   - Visual flow diagram
   - Code examples
   - Integration time comparison

3. **Docs** (`/docs`)
   - Quick start
   - API reference
   - SDKs & libraries

4. **Pricing** (`/pricing`)
   - Per-transaction pricing
   - Volume discounts
   - Enterprise tier

### 3.2 Key Sections

**Hero Section:**
```
Stop building per-platform integrations.
Accept agentic returns from ChatGPT, Gemini, Claude—all with one API.

[Get Started] [View Docs]
```

**Problem Section:**
```
The Agentic Commerce Integration Problem

Without Arcana:
- 2-3 weeks per protocol integration
- 4 protocols = 9-13 weeks of eng time
- $90k-$130k in development costs
- Ongoing maintenance burden

With Arcana:
- 10 minutes to integrate
- All protocols supported
- Zero maintenance
- One line of code
```

**How It Works:**
```
1. Agent sends request with attestation
2. Arcana verifies signature
3. Your API receives clean data
4. That's it.
```

**Integration Example:**
```typescript
// Before: No agentic support
app.post('/returns', (req, res) => {
  // Your existing logic
});

// After: All agents supported
app.post('/returns', 
  arcana.verifyAgent(), // <-- Add this line
  (req, res) => {
    // Access verified agent info
    const { platform, agent_id } = req.agent;
    // Your existing logic
  }
);
```

---

## Phase 4: Demo Website (Days 6-7)

### 4.1 Interactive Demo
**Directory:** `demo/`

**Two-column comparison:**

**LEFT: Without Arcana**
- Merchant receives raw agent request
- No attestation verification
- Unknown agent identity
- Manual per-platform handling
- Cluttered code example

**RIGHT: With Arcana**
- Clean, verified agent context
- Automatic signature verification
- Extracted agent identity
- Single integration
- Clean code example

### 4.2 Live Simulation
**Features:**
- Dropdown to select agent platform (ChatGPT, Gemini, Claude)
- "Generate Attestation" button (creates mock JWT/VC/SPT)
- Send request through Arcana
- Show before/after request payloads
- Display verification results
- Show merchant-received data

### 4.3 Demo Flow

```
Step 1: Select Agent Platform
  [ ] ChatGPT (Stripe ACP - SPT)
  [ ] Gemini (Google AP2 - VC)
  [ ] Claude (Custom - JWT)

Step 2: Generate Mock Return Request
  Order ID: [ord_12345]
  Item: [Blue Sneakers - Size 10]
  Reason: [doesnt_fit]
  
  [Generate Request]

Step 3: Watch Arcana Work
  ✓ Attestation detected (JWT)
  ✓ Signature verified
  ✓ Agent identity extracted
  ✓ Request forwarded to merchant

Step 4: See What Merchant Receives
  {
    "agent": {
      "platform": "chatgpt",
      "agent_id": "agent_xyz123",
      "verified": true
    },
    "order_id": "ord_12345",
    "items": [...]
  }
```

---

## Implementation Timeline

### Week 1: Core Product
- **Day 1-2:** Attestation verifier service + protocol adapters
- **Day 3:** Middleware integration + database updates
- **Day 4:** API documentation + OpenAPI spec
- **Day 5:** Landing page (Next.js + TailwindCSS)
- **Day 6-7:** Demo website with live simulation

### Week 2: Polish & Launch
- **Day 8-9:** Testing (unit + integration)
- **Day 10:** Deployment (Vercel/Railway)
- **Day 11:** Beta merchant onboarding flow
- **Day 12-13:** Content (blog posts, Twitter thread, Product Hunt prep)
- **Day 14:** Launch

---

## Tech Stack Summary

### Backend
- Node.js 20+ / TypeScript
- Fastify (existing)
- SQLite (existing)
- jose (JWT verification)
- did-jwt (VC verification)

### Frontend (Landing + Demo)
- Next.js 14 (App Router)
- TailwindCSS
- shadcn/ui
- Framer Motion
- Lucide icons

### Deployment
- Backend: Railway / Fly.io
- Frontend: Vercel
- Database: Turso (SQLite cloud) or keep local

### Documentation
- OpenAPI 3.1
- Swagger UI
- Mintlify or Docusaurus

---

## Pricing Model (For Landing Page)

### Starter
- Free up to 1,000 verifications/month
- All protocols supported
- Community support
- **$0/month**

### Growth
- $49/month + $0.05 per verification
- Includes 10,000 verifications
- Priority support
- Custom attestation formats
- **Start Free Trial**

### Enterprise
- Custom volume pricing
- Dedicated support
- SLA guarantees
- On-premise deployment option
- **Contact Sales**

---

## Success Metrics

### Week 1 Goals
- [ ] 3 protocol verifiers working (JWT, VC, SPT)
- [ ] Middleware integrated with existing returns API
- [ ] Landing page deployed
- [ ] Demo working with mock attestations

### Week 2 Goals
- [ ] 5 beta merchants signed up
- [ ] 100+ attestations verified
- [ ] 0 verification failures in production
- [ ] Product Hunt launch prepared

### Month 1 Goals
- [ ] 50 merchants integrated
- [ ] 10,000+ verifications processed
- [ ] 2nd protocol added (beyond initial 3)
- [ ] First paid customer

---

## Risks & Mitigations

### Risk: Protocol specs incomplete/incorrect
**Mitigation:** Start with Stripe ACP (most documented), add others incrementally

### Risk: Public keys not accessible
**Mitigation:** Cache keys, provide fallback manual configuration

### Risk: Platforms change attestation format
**Mitigation:** Version detection, graceful degradation

### Risk: Performance issues with signature verification
**Mitigation:** Cache verified attestations (15min TTL), async verification

---

## Next Steps (Tonight → Tomorrow 8am)

1. **Create one-pager PDF** (use landing page content)
2. **Write email templates** for Stripe/OpenAI outreach
3. **Prepare demo script** (walk through the value prop)
4. **Set up Twitter/LinkedIn posts** announcing the product

---

## File Structure (After Implementation)

```
arcana-returns/
├── src/
│   ├── services/
│   │   ├── attestation.ts          [NEW - Core verifier]
│   │   ├── returns.ts              [UPDATED - Add agent context]
│   │   └── ...
│   ├── adapters/                   [NEW]
│   │   ├── visa-tap.ts
│   │   ├── google-ap2.ts
│   │   ├── stripe-acp.ts
│   │   └── custom.ts
│   ├── server/
│   │   ├── middleware/
│   │   │   └── agent-auth.ts       [NEW - Attestation middleware]
│   │   └── routes/
│   │       ├── returns.ts          [UPDATED]
│   │       └── agent-analytics.ts  [NEW]
│   └── types/
│       ├── attestation.ts          [NEW]
│       └── returns.ts              [UPDATED]
├── landing/                        [NEW - Next.js site]
│   ├── app/
│   │   ├── page.tsx                (home)
│   │   ├── how-it-works/
│   │   ├── docs/
│   │   └── pricing/
│   └── components/
├── demo/                           [NEW - Interactive demo]
│   └── app/
│       └── page.tsx
├── docs/
│   ├── openapi/
│   │   └── agentic-commerce.yaml  [NEW]
│   ├── integration-guide.md        [NEW]
│   └── agentic-commerce-specs.md   [EXISTING]
└── scripts/
    └── test-attestations.ts        [NEW - Generate mock tokens]
```

---

## Ready to Build?

This plan gives us:
1. ✅ Working product (attestation middleware)
2. ✅ Clear documentation
3. ✅ Beautiful landing page
4. ✅ Interactive demo
5. ✅ Sellable in 7 days

**Start with Day 1 implementation?**
