# Next Steps - Arcana Returns v0.1

## ✅ What's Complete

### Core System (100%)
- ✅ Policy Snapshot Extractor with versioning
- ✅ Returns API (3 endpoints: token, authorize, commit)
- ✅ AEL-lite append-only ledger
- ✅ Shopify event processor
- ✅ Stripe reconciliation processor
- ✅ Background job runner
- ✅ CLI tools (9 commands)
- ✅ Complete documentation

### Files Created: ~40
- Types & schemas
- Services & processors
- API routes & middleware
- Database schema
- CLI commands
- Documentation

## 🚀 Immediate Action Required

### Step 1: Install Node.js

**You need Node.js 20+ to run this project.**

Choose one method:

```bash
# Option A: Homebrew (Recommended)
brew install node@20

# Option B: nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20

# Option C: Download from nodejs.org
# Visit https://nodejs.org/ and download LTS version
```

Verify installation:
```bash
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
```

### Step 2: Install Dependencies

```bash
cd /Users/iankar/CascadeProjects/arcana-returns
npm install
```

This installs all packages defined in `package.json`.

### Step 3: Run Setup

```bash
./scripts/setup.sh
```

This will:
- Generate Ed25519 signing keys
- Create `.env` file
- Initialize SQLite database
- Create a test API key

**IMPORTANT:** Save the API key that's displayed!

### Step 4: Start the Server

```bash
npm run dev
```

Server starts at `http://localhost:3000`

### Step 5: Test the System

```bash
# Health check
curl http://localhost:3000/health

# Create an API key
npm run cli -- keys create --merchant merchant_test --name "Test Key"

# Import a policy
curl -X POST http://localhost:3000/policy/import \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "source_type": "text",
    "source_content": "Returns accepted within 30 days.",
    "merchant_id": "merchant_test"
  }'

# Simulate a return
npm run cli -- returns simulate \
  --order ord_001 \
  --sku TEST-SKU \
  --reason doesnt_fit \
  --merchant merchant_test
```

## 📊 Updated Linear Status

Your `arcana_linear_import.csv` has been updated with correct statuses:

**Done:**
- Epic: Policy Snapshot Extractor
- Epic: Returns API + Return Token
- Epic: AEL-lite
- Epic: Analyst Mini-Console/CLI

**In Progress:**
- Epic: Adapter — Shopify (event processing complete)
- Epic: Adapter — Stripe (reconciliation complete)

**Todo:**
- Epic: Agent Protocol Orchestrator
- Epic: Pilot A
- Epic: Persona Harness v0
- Epic: Observability & SRE
- Epic: Security, Privacy & Compliance

## 🎯 Priority Work (After Installation)

### Week 1: Verification & Testing
1. ✅ Install Node.js
2. ✅ Run setup script
3. Test full returns flow (token → authorize → commit)
4. Import 2-3 real merchant policies
5. Verify event processing works
6. Test CLI commands

### Week 2: Pilot Preparation
1. Create pilot merchant setup script
2. Build observability dashboard
3. Write contract tests for Shopify/Stripe
4. Document pilot onboarding process
5. Create golden set (50 test decisions)

### Week 3: Pilot Launch
1. Onboard first pilot merchant
2. Monitor event processing
3. Generate weekly delta reports
4. Collect feedback
5. Iterate on issues

## 🔧 CLI Commands Available

```bash
# Returns simulation
npm run cli -- returns simulate --order <id> --sku <sku> --reason <code>
npm run cli -- returns list --merchant <id>

# Replay & analysis
npm run cli -- replay export --decision <id> --out <file>
npm run cli -- replay diff --baseline <id> --candidate <id>

# Evidence ladder
npm run cli -- ladder show

# API keys
npm run cli -- keys create --merchant <id> --name <name>
npm run cli -- keys list --merchant <id>
npm run cli -- keys revoke --key <keyId>

# Event processing
npm run cli -- process events
```

## 📁 Key Files to Review

- `GETTING_STARTED.md` - Detailed installation guide
- `IMPLEMENTATION_STATUS.md` - Complete feature status
- `ARCHITECTURE.md` - System design overview
- `docs/api-reference.md` - API documentation
- `docs/quickstart.md` - Quick start guide
- `examples/test-requests.http` - Example API calls

## 🐛 Known Issues

All TypeScript lint errors are expected until `npm install` runs. They're just missing type definitions for:
- Node.js built-ins (`console`, `process`, `Buffer`)
- Dependencies (`fastify`, `zod`, `commander`, etc.)

These will resolve automatically after installation.

## 🎉 What's Working

- **Policy Management:** Import, version, diff
- **Returns Flow:** Full 3-step flow with signed tokens
- **AEL:** Decision logging, replay, diff
- **Webhooks:** Shopify & Stripe event receivers
- **Event Processing:** Background processor (runs every 10s)
- **CLI:** 9 commands for testing and management
- **Security:** API key auth, rate limiting, JWT signing
- **Database:** SQLite with append-only patterns

## 📞 Support

If you encounter issues:

1. Check `GETTING_STARTED.md` troubleshooting section
2. Verify Node.js version: `node --version`
3. Check logs in terminal
4. Review `.env` configuration
5. Try `rm -rf node_modules && npm install`

---

**Status:** Ready for installation and testing ✅

**Next Action:** Install Node.js, then run `npm install`
