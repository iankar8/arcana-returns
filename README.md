# Arcana Returns API v0.1

**Agentic Returns with Audit-Grade Logging**

## Overview

Arcana provides a minimal API surface for intelligent return decisions with complete auditability. Every decision is bound to a versioned policy snapshot and logged in an append-only ledger (AEL-lite) for time-travel replay.

## Features

- **Policy Snapshot Extractor**: Version-controlled policy graphs with content hashing
- **Returns API**: 3 endpoints (`/token`, `/authorize`, `/commit`) with signed Return Tokens (RT)
- **AEL-lite**: Append-only decision ledger with replay capability
- **Shopify Adapter**: Webhook-driven integration
- **Analyst CLI**: Simulate, adjust, and export decisions

## Quick Start

### Prerequisites

- Node.js 20+
- OpenSSL (for key generation)

### Installation

```bash
npm install
```

### Generate Signing Keys

```bash
mkdir -p keys
openssl genpkey -algorithm ed25519 -out keys/private.pem
openssl pkey -in keys/private.pem -pubout -out keys/public.pem
```

### Configure Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

### Initialize Database

```bash
npm run db:migrate
```

### Start Development Server

```bash
npm run dev
```

Server runs at `http://localhost:3000`

## API Endpoints

### Policy Management

- `POST /policy/import` - Import policy from PDF/URL
- `GET /policy/:policyId` - Get latest policy snapshot
- `GET /policy/:policyId/diff` - Compare policy versions

### Returns Flow

- `POST /returns/token` - Issue signed Return Token
- `POST /returns/authorize` - Authorize return with evidence
- `POST /returns/commit` - Commit return and issue refund instruction

### AEL (Audit & Eval Ledger)

- `GET /ael/decision/:id` - Get decision with BOM
- `POST /ael/replay/:id` - Generate replay pack
- `GET /ael/diff` - Compare decisions

### Webhooks

- `POST /webhooks/shopify` - Shopify event handler
- `POST /webhooks/stripe` - Stripe event handler

## CLI Usage

```bash
# Simulate a return decision
npm run cli -- returns simulate --order ord_789 --sku SKU-1 --reason doesnt_fit

# Export replay bundle
npm run cli -- replay export --decision dec_123 --out ./bundle.zip

# Adjust evidence ladder
npm run cli -- ladder set --photo-packaging required_when risk>0.3
```

## Architecture

```
┌─────────────────┐
│ Merchant App    │
└────────┬────────┘
         │
    ┌────▼────────────────────┐
    │  Returns API            │
    │  - Token Issuance       │
    │  - Authorization        │
    │  - Commit               │
    └────┬────────────────────┘
         │
    ┌────▼────────────────────┐
    │  Policy Graph Store     │
    │  (versioned, hashed)    │
    └─────────────────────────┘
         │
    ┌────▼────────────────────┐
    │  AEL-lite               │
    │  (append-only ledger)   │
    └─────────────────────────┘
```

## Security

- **Ed25519 Signing**: All Return Tokens are cryptographically signed
- **Short-lived Tokens**: 15-minute expiry by default
- **Rate Limiting**: Per-key burst controls
- **Idempotency**: Prevent duplicate operations
- **RBAC**: Role-based access control per merchant

## Testing

```bash
# Run tests
npm test

# With coverage
npm test:coverage
```

## Documentation

- [API Reference](./docs/api-reference.md)
- [Policy Graph Schema](./docs/policy-schema.md)
- [Return Token Spec](./docs/return-token.md)
- [Replay Guide](./docs/replay-guide.md)
- [Shopify Integration](./docs/shopify-adapter.md)

## License

Proprietary - Arcana Inc.
