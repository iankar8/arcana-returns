# Arcana Returns - Code Examples

Complete, runnable examples demonstrating the Arcana Returns API.

## Quick Start

### 1. Start the API Server

```bash
# From project root
npm run dev
```

Server will start at `http://localhost:3000`

### 2. Create an API Key

```bash
# From project root
npm run cli -- keys create --merchant merchant_test --name "Example Key"
```

Save the generated API key (starts with `sk_test_...`)

### 3. Import a Sample Policy (Optional)

```bash
# From project root  
npm run cli -- policy import \
  --merchant merchant_test \
  --text "Returns accepted within 30 days. Items must be in original packaging."
```

### 4. Run the Example

```bash
ARCANA_API_KEY=sk_test_your_key_here node examples/complete-return-flow.js
```

---

## Available Examples

### 1. `complete-return-flow.js`

**Full 3-step returns process** from token issuance to commit.

```bash
ARCANA_API_KEY=sk_test_... node examples/complete-return-flow.js
```

**What it demonstrates:**
- ✅ Issue return token with risk scoring
- ✅ Authorize with evidence
- ✅ Commit and receive refund instruction
- ✅ Error handling and trace IDs
- ✅ Audit trail tracking

**Time to complete:** ~5 seconds

### 2. `policy-management.js`

**Policy versioning and comparison** workflow.

```bash
ARCANA_API_KEY=sk_test_... node examples/policy-management.js
```

**What it demonstrates:**
- ✅ Import a policy from text
- ✅ Retrieve policy details
- ✅ Import an updated policy version
- ✅ Compare policy versions (diff)
- ✅ Policy snapshot hashing

**Use case:** Managing policy changes over time, compliance tracking

### 3. `ael-replay-debugging.js`

**Audit & Eval Ledger (AEL)** features for debugging and replay.

```bash
ARCANA_API_KEY=sk_test_... node examples/ael-replay-debugging.js
```

**What it demonstrates:**
- ✅ Create a return decision (logged to AEL)
- ✅ Retrieve decision with Bill of Materials (BOM)
- ✅ Generate replay artifact for time-travel debugging
- ✅ List recent decisions
- ✅ Compare two decisions for A/B testing

**Use case:** Debugging decisions, A/B testing policies, compliance audits

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ARCANA_API_KEY` | **Yes** | - | Your API key (starts with `sk_test_` or `sk_live_`) |
| `ARCANA_BASE_URL` | No | `http://localhost:3000` | API base URL |
| `POLICY_ID` | No | `plc_default` | Policy ID to use for returns |

---

## Common Issues & Solutions

### "API key required"
```bash
❌ Error: ARCANA_API_KEY environment variable required
```

**Solution:** Create an API key first:
```bash
npm run cli -- keys create --merchant merchant_test --name "Test"
```

### "Policy not found"
```bash
API Error: POL-001 - Policy not found
```

**Solution:** Import a policy or use an existing policy ID:
```bash
# Import policy
npm run cli -- policy import --merchant merchant_test --text "Your policy text"

# Or specify existing policy
POLICY_ID=plc_your_policy node examples/complete-return-flow.js
```

### "Connection refused"
```bash
API Error: fetch failed
```

**Solution:** Make sure the API server is running:
```bash
npm run dev
```

### "Invalid token signature"
```bash
API Error: RT-007 - Invalid signature
```

**Solution:** Make sure your API key matches your merchant and hasn't been revoked.

---

## Advanced Usage

### Custom Policy

```bash
ARCANA_API_KEY=sk_test_... \
POLICY_ID=plc_custom_policy \
node examples/complete-return-flow.js
```

### Production Environment

```bash
ARCANA_API_KEY=sk_live_... \
ARCANA_BASE_URL=https://api.arcana.returns \
POLICY_ID=plc_prod_policy \
node examples/complete-return-flow.js
```

---

## Example Output Structure

Each example follows this pattern:

1. **Configuration** - Shows what settings are being used
2. **Step-by-step execution** - Logs each API call with request/response
3. **Results** - Summarizes what happened
4. **Next steps** - Suggests what to try next

Example output sections:
```
📡 POST /returns/token          ← API call
   Request: {...}                ← Request payload
   ✅ Success (200)              ← Response status
   📊 Token Details:             ← Parsed results
```

---

## Writing Your Own Examples

### Basic Template

```javascript
#!/usr/bin/env node

const API_KEY = process.env.ARCANA_API_KEY;
const BASE_URL = process.env.ARCANA_BASE_URL || 'http://localhost:3000';

async function apiRequest(endpoint, method = 'GET', body = null) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : null,
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`API Error: ${data.error?.code} - ${data.error?.message}`);
  }
  
  return data;
}

async function main() {
  console.log('🚀 My Custom Example');
  
  // Your code here
  const result = await apiRequest('/returns/token', 'POST', {
    order_id: 'ord_123',
    // ... rest of payload
  });
  
  console.log('Result:', result);
}

main().catch(console.error);
```

Make it executable:
```bash
chmod +x your-example.js
```

---

## Testing Examples

All examples can be tested against:

1. **Local Development** (default)
   ```bash
   npm run dev  # Start server
   ARCANA_API_KEY=sk_test_... node examples/complete-return-flow.js
   ```

2. **Sandbox Environment**
   ```bash
   ARCANA_BASE_URL=https://sandbox-api.arcana.returns \
   ARCANA_API_KEY=sk_test_... \
   node examples/complete-return-flow.js
   ```

3. **Production** (use with caution!)
   ```bash
   ARCANA_BASE_URL=https://api.arcana.returns \
   ARCANA_API_KEY=sk_live_... \
   node examples/complete-return-flow.js
   ```

---

## Need Help?

- **API Reference:** [docs/api-reference-enhanced.md](../docs/api-reference-enhanced.md)
- **Quick Reference:** [docs/QUICK_REFERENCE_CARD.md](../docs/QUICK_REFERENCE_CARD.md)
- **Support:** Include the `trace_id` from error messages
- **Discord:** https://discord.gg/arcana-dev

---

## Contributing Examples

Have a useful example? Submit a PR!

1. Create your example in `examples/`
2. Add documentation above (## Available Examples)
3. Test it works with both dev and sandbox
4. Include error handling and helpful output
5. Submit PR with description

**Good examples:**
- ✅ Handle errors gracefully
- ✅ Use environment variables for config
- ✅ Include helpful console output
- ✅ Document prerequisites
- ✅ Work out of the box

**Avoid:**
- ❌ Hardcoded API keys
- ❌ Undocumented dependencies
- ❌ Silent failures
- ❌ Production-only examples
