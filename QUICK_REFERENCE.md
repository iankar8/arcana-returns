# Quick Reference - Arcana Returns

## 🚀 Common Commands

### Server
```bash
npm run dev              # Start dev server (auto-reload)
npm start               # Start production server
```

### Testing
```bash
npm test                # Run all tests
npm run test:coverage   # Run with coverage report
npm test -- --watch     # Watch mode
```

### CLI
```bash
# Simulate return
npm run cli -- returns simulate --order ord_001 --sku TEST --reason doesnt_fit

# List decisions
npm run cli -- returns list --merchant merchant_test

# Export replay
npm run cli -- replay export --decision <id> --out replay.json

# Process events
npm run cli -- process events

# Manage keys
npm run cli -- keys create --merchant <id> --name "Key Name"
npm run cli -- keys list --merchant <id>
```

### Pilot Onboarding
```bash
./scripts/onboard-pilot.sh merchant_name text
./scripts/onboard-pilot.sh merchant_name url https://example.com/returns
```

## 📊 API Endpoints

### Health & Metrics
```bash
GET  /health                          # Basic health check
GET  /metrics/health                  # Detailed health (public)
GET  /metrics                         # System metrics (auth required)
GET  /metrics/merchant/:id            # Merchant metrics
GET  /metrics/timeline                # Hourly timeline
```

### Policy
```bash
POST /policy/import                   # Import policy
GET  /policy/:policyId                # Get policy
GET  /policy/:policyId/diff/:otherId  # Compare policies
```

### Returns
```bash
POST /returns/token                   # Issue return token
POST /returns/authorize               # Authorize return
POST /returns/commit                  # Commit return
```

### AEL
```bash
GET  /ael/decisions                   # List decisions
GET  /ael/decision/:id                # Get decision
GET  /ael/decision/:id/replay         # Get replay bundle
POST /ael/replay                      # Run replay
```

### Webhooks
```bash
POST /webhooks/shopify                # Shopify webhook
POST /webhooks/stripe                 # Stripe webhook
```

## 🔑 Your API Key

```
sk_8d93d0d571b5b56c1162b1281552d1da6549f4c0e8a5e18cb4af460e500b963a
```

## 📁 Important Files

```
./data/arcana.db                      # Main database
./data/pilots/                        # Pilot merchant data
./keys/private.pem                    # JWT signing key
./keys/public.pem                     # JWT public key
.env                                  # Configuration
```

## 🧪 Test a Full Flow

```bash
# 1. Import policy
curl -X POST http://localhost:3000/policy/import \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"source_type":"text","source_content":"Returns within 30 days","merchant_id":"merchant_test"}'

# 2. Issue token (use policy_id from step 1)
curl -X POST http://localhost:3000/returns/token \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"order_id":"ord_001","customer_ref":"cust_001","items":[{"sku":"TEST","qty":1,"price_cents":2999,"name":"Test"}],"reason_code":"doesnt_fit","policy_id":"POLICY_ID"}'

# 3. Authorize (use return_token from step 2)
curl -X POST http://localhost:3000/returns/authorize \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"return_token":"TOKEN","evidence":[{"type":"photo_packaging","url":"https://example.com/photo.jpg"}],"dropoff_choice":"mail_in"}'

# 4. Commit
curl -X POST http://localhost:3000/returns/commit \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"return_token":"TOKEN","receipt_event":{"type":"scan","carrier":"UPS","ts":"2025-10-26T08:00:00Z"}}'
```

## 📊 Check Metrics

```bash
# System health
curl http://localhost:3000/metrics/health

# Full metrics (after server restart)
curl http://localhost:3000/metrics \
  -H "Authorization: Bearer YOUR_API_KEY"

# Merchant metrics
curl http://localhost:3000/metrics/merchant/merchant_test \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## 🗄️ Database Queries

```bash
# View decisions
sqlite3 ./data/arcana.db "SELECT * FROM decisions ORDER BY created_at DESC LIMIT 10"

# View return tokens
sqlite3 ./data/arcana.db "SELECT * FROM return_tokens ORDER BY issued_at DESC LIMIT 10"

# Check pending events
sqlite3 ./data/arcana.db "SELECT COUNT(*) FROM shopify_events WHERE processed = 0"
sqlite3 ./data/arcana.db "SELECT COUNT(*) FROM stripe_events WHERE processed = 0"

# View policies
sqlite3 ./data/arcana.db "SELECT policy_id, merchant_id, return_window_days FROM policy_snapshots"
```

## 🐛 Troubleshooting

### Server won't start
```bash
# Check port
lsof -ti:3000 | xargs kill

# Check Node version
node --version  # Should be 20+

# Reinstall
rm -rf node_modules && npm install
```

### Tests failing
```bash
# Clean test database
rm -f ./data/test.db

# Reinstall
npm install
```

### Metrics 404
```bash
# Restart server to load new routes
# Stop current server (Ctrl+C)
npm run dev
```

## 📚 Documentation

- `GETTING_STARTED.md` - Installation & setup
- `TESTING_GUIDE.md` - Testing documentation
- `IMPLEMENTATION_STATUS.md` - Feature status
- `WORK_COMPLETED.md` - Recent work summary
- `NEXT_STEPS.md` - Roadmap
- `ARCHITECTURE.md` - System design
- `docs/api-reference.md` - API documentation

## 🎯 Next Actions

1. **Restart server** to load metrics routes
2. **Run tests**: `npm test`
3. **Test metrics**: `curl http://localhost:3000/metrics/health`
4. **Onboard pilot**: `./scripts/onboard-pilot.sh merchant_test text`
5. **Import real policy** and test full flow

## 💡 Tips

- Use `--watch` with tests for rapid development
- Check `npm run dev` logs for errors
- Use CLI for quick testing
- Metrics show real-time system health
- Onboarding script validates everything

---

**Server:** http://localhost:3000  
**Status:** ✅ Ready for pilots  
**Tests:** 26 contract tests  
**Docs:** Complete
