# Getting Started with Arcana Returns

## Prerequisites

### 1. Install Node.js 20+

**Option A: Using Homebrew (Recommended)**
```bash
# Install Homebrew if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node@20

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
```

**Option B: Using nvm (Node Version Manager)**
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart your terminal, then:
nvm install 20
nvm use 20
nvm alias default 20
```

**Option C: Download from nodejs.org**
- Visit https://nodejs.org/
- Download the LTS version (20.x)
- Run the installer

### 2. Install OpenSSL (for key generation)

```bash
# Check if already installed
openssl version

# If not installed:
brew install openssl
```

## Installation Steps

### Step 1: Install Dependencies

```bash
cd /Users/iankar/CascadeProjects/arcana-returns
npm install
```

This will install:
- `fastify` - Web framework
- `better-sqlite3` - Database
- `zod` - Schema validation
- `jose` - JWT signing
- `pdf-parse` - PDF parsing
- `commander` - CLI framework
- And other dependencies...

### Step 2: Run Setup Script

```bash
./scripts/setup.sh
```

This script will:
1. ✅ Verify Node.js version (20+)
2. 🔐 Generate Ed25519 signing keys in `./keys/`
3. 📝 Create `.env` file from template
4. 🗄️ Initialize SQLite database
5. 🔑 Create a test API key

**Save the API key** that's displayed - you'll need it for testing!

### Step 3: Configure Environment

Edit `.env` with your settings:

```bash
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_PATH=./data/arcana.db

# JWT Signing
JWT_PRIVATE_KEY_PATH=./keys/private.pem
JWT_PUBLIC_KEY_PATH=./keys/public.pem
JWT_ISSUER=arcana-returns-v0
JWT_AUDIENCE=arcana-api

# API Keys (for testing)
# Your generated key will be in the database

# Shopify (optional for pilot)
SHOPIFY_API_KEY=
SHOPIFY_API_SECRET=
SHOPIFY_WEBHOOK_SECRET=

# Stripe (optional for pilot)
STRIPE_API_KEY=
STRIPE_WEBHOOK_SECRET=

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000

# Storage
STORAGE_PATH=./data/storage

# Observability
LOG_LEVEL=info
```

### Step 4: Start the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

Server will start at `http://localhost:3000`

### Step 5: Verify Installation

**Test 1: Health Check**
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-10-26T07:00:00.000Z"
}
```

**Test 2: JWKS Endpoint**
```bash
curl http://localhost:3000/.well-known/jwks.json
```

Should return your public key in JWK format.

**Test 3: CLI Commands**
```bash
# View evidence ladder
npm run cli -- ladder show

# List API keys
npm run cli -- keys list --merchant merchant_test

# Simulate a return
npm run cli -- returns simulate \
  --order ord_test_001 \
  --sku SHIRT-M-BLUE \
  --reason doesnt_fit \
  --merchant merchant_test \
  --policy plc_default
```

## Quick Test Flow

### 1. Import a Policy

```bash
curl -X POST http://localhost:3000/policy/import \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "source_type": "text",
    "source_content": "Returns accepted within 30 days of purchase. Items must be in original packaging. No restocking fee. We accept returns via mail or in-store.",
    "merchant_id": "merchant_test"
  }'
```

Save the `policy_id` from the response.

### 2. Issue a Return Token

```bash
curl -X POST http://localhost:3000/returns/token \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "ord_test_001",
    "customer_ref": "cust_test_123",
    "items": [
      {
        "sku": "SHIRT-M-BLUE",
        "qty": 1,
        "price_cents": 2999
      }
    ],
    "reason_code": "doesnt_fit",
    "policy_id": "YOUR_POLICY_ID"
  }'
```

Save the `return_token` from the response.

### 3. Authorize the Return

```bash
curl -X POST http://localhost:3000/returns/authorize \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "return_token": "YOUR_RETURN_TOKEN",
    "evidence": [
      {
        "type": "photo_packaging",
        "url": "https://example.com/photo.jpg"
      }
    ],
    "dropoff_choice": "mail_in"
  }'
```

Should return `"decision": "approve"`.

### 4. Commit the Return

```bash
curl -X POST http://localhost:3000/returns/commit \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "return_token": "YOUR_RETURN_TOKEN",
    "receipt_event": {
      "type": "scan",
      "carrier": "UPS",
      "ts": "2025-10-26T18:00:00Z"
    }
  }'
```

Should return `"refund_instruction": "instant"`.

### 5. View Decision in AEL

```bash
# List recent decisions
curl http://localhost:3000/ael/decisions?limit=10 \
  -H "Authorization: Bearer YOUR_API_KEY"

# Get specific decision
curl http://localhost:3000/ael/decision/DECISION_ID \
  -H "Authorization: Bearer YOUR_API_KEY"

# Export replay bundle
npm run cli -- replay export \
  --decision DECISION_ID \
  --out ./replay-bundle.json
```

## Troubleshooting

### "Cannot find module" errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### "EACCES: permission denied" on setup.sh
```bash
chmod +x scripts/setup.sh
```

### Database locked errors
```bash
# Stop the server and remove lock
rm data/arcana.db-wal data/arcana.db-shm
```

### Port 3000 already in use
```bash
# Change PORT in .env file
PORT=3001

# Or kill the process using port 3000
lsof -ti:3000 | xargs kill
```

## Next Steps

1. ✅ Complete installation and verification
2. 📊 Import 2-3 real merchant policies
3. 🧪 Run through full return flow
4. 🔧 Complete Shopify/Stripe event processors
5. 🚀 Set up pilot merchant

See `IMPLEMENTATION_STATUS.md` for detailed roadmap.
