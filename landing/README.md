# Arcana Landing Pages

Multi-vertical landing page system for AI-powered fraud prevention.

## Structure

### Home (`/`)
Minimal dark landing page
- Single headline: "Infrastructure for AI-powered commerce and financial crime detection."
- Three links: Returns API (live) → AI Commerce → Banking

### Returns API (`/returns`)
**LIVE** - Agentic Returns Management landing page
- **Primary Message:** "Agentic Returns Management"
- **What we do:**
  - Agent-initiated returns (ChatGPT, Claude, Gemini, custom platforms)
  - Policy enforcement and evidence requirements
  - Agent verification (JWT, VC, SPT)
  - 3-endpoint API flow
- **Target Audience:** Merchants accepting agent-initiated returns
- **Accurate to codebase:** Yes ✅

### AI Commerce (`/commerce`)
**COMING SOON** - Purchase routing and orchestration
- Future: Route AI-powered purchases across agent platforms
- Agent purchase verification
- Policy attachment at checkout
- Fraud prevention for agent transactions

### Banking (`/banking`)
**COMING SOON** - AI Agents for financial crime detection

### Team (`/team`)
Simple team overview page
- Founding team info
- Previously at: Equifax, Acorns, HSBC, Google, Stanford

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables (see RESEND_SETUP.md)
cp .env.example .env.local
# Add your RESEND_API_KEY and NOTIFICATION_EMAIL

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Email Capture & Waitlist

The site uses [Resend](https://resend.com) for email capture:

- **Form Location:** `/returns` page - "Get early access" section
- **API Endpoint:** `POST /api/waitlist`
- **Storage:** `data/waitlist.json` (gitignored)
- **Emails Sent:**
  - Notification to your team
  - Confirmation to user

See [RESEND_SETUP.md](./RESEND_SETUP.md) for detailed setup instructions.

Visit:
- `http://localhost:3001` - Home page
- `http://localhost:3001/returns` - **Returns API landing page (LIVE)**
- `http://localhost:3001/commerce` - AI Commerce (coming soon)
- `http://localhost:3001/banking` - Banking (coming soon)
- `http://localhost:3001/team` - Team page

## Returns API Page Structure

### Sections

1. **Hero** - Agentic Returns Management
2. **How It Works** - 3-endpoint flow (token, authorize, commit)
3. **Supported Agent Platforms** - ChatGPT, Claude, Gemini, custom
4. **Integration** - Code examples
5. **CTA** - Email capture for beta access

### Design

- **Colors:** Blue primary (#2563EB), Red accents for urgency
- **Icons:** Lucide React (Shield, AlertTriangle, CheckCircle, etc.)
- **Style:** Clean, professional, enterprise SaaS
- **Mobile:** Fully responsive

## Key Messages (Returns API)

### Hero
- "Agentic Returns Management"
- "Let AI agents process returns on behalf of customers—with policy enforcement, agent verification, and fraud prevention"

### How It Works
- Issue Return Token - POST /returns/token
- Authorize with Evidence - POST /returns/authorize  
- Commit & Refund - POST /returns/commit

### Supported Agent Platforms
- OpenAI (ChatGPT) - JWT attestations
- Anthropic (Claude) - Verifiable credentials
- Google (Gemini) - Signed tokens
- Custom platforms - Configurable verification

### CTA
- "Get early access"
- 10-minute integration

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Production
vercel --prod
```

### Manual Deploy

```bash
npm run build
npm start
```

## Customization

### Update Copy

Edit `/app/page.tsx` - all copy is inline for easy editing

### Update Stats

Line 266-280: Update percentages and metrics as you get real data

### Update CTA

Line 286-308: Email form action (currently no backend)

## TODO

- [ ] Connect email form to backend/Mailchimp
- [ ] Add analytics (PostHog, Google Analytics)
- [ ] Add demo video
- [ ] Add testimonials (once you have customers)
- [ ] Add case study section
- [ ] Add FAQ section

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** TailwindCSS
- **Icons:** Lucide React
- **Deployment:** Vercel (or any Node.js host)

## Performance

- Lighthouse Score Target: 95+
- First Contentful Paint: < 1s
- Largest Contentful Paint: < 2.5s
- Time to Interactive: < 3s

## SEO

- Title: "Arcana - Agent Fraud Prevention for Returns"
- Meta Description: "Prevent returns fraud spikes when adopting agentic commerce..."
- Keywords: agent fraud, returns fraud, agentic commerce, ChatGPT checkout

---

**Status:** Ready to deploy
**Domain:** arcana.ai (recommended) or arcana.dev
**Subdomain:** arcana.ai/returns (for vertical-specific landing page)
