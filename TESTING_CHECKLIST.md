# Documentation Testing Checklist

> **Run through this checklist to verify all documentation improvements work correctly**

## ✅ Pre-flight Checks

### 1. GitHub Renders Mermaid Diagrams

- [ ] Open `README.md` on GitHub
- [ ] Verify sequence diagram renders correctly
- [ ] Verify state diagram renders correctly
- [ ] Check that diagrams are visible (not showing as code blocks)

**Expected:** Two beautiful flow diagrams visible in README

### 2. IntelliSense Shows Descriptions

- [ ] Open `src/types/returns.ts` in VS Code
- [ ] Hover over `TokenRequestSchema`
- [ ] Type `TokenRequestSchema.` and check autocomplete
- [ ] Hover over individual fields like `order_id`

**Expected:** Tooltips show the `.describe()` text we added

### 3. Documentation Links Work

- [ ] Open `README.md`
- [ ] Click each link in the "Documentation" section
- [ ] Verify all files exist and open correctly

**Expected:** All links in README work (no 404s)

---

## 🚀 Runnable Example Test

### 1. Start API Server

```bash
cd /Users/iankar/CascadeProjects/arcana-returns
npm run dev
```

**Expected:** Server starts on `http://localhost:3000`

### 2. Create API Key

```bash
npm run cli -- keys create --merchant merchant_test --name "Test Key"
```

**Expected:** Outputs an API key starting with `sk_test_...`  
📝 **Copy the API key** - you'll need it next!

### 3. Import a Test Policy

```bash
npm run cli -- policy import \
  --merchant merchant_test \
  --source-type text \
  --source-content "Returns accepted within 30 days. Items must be in original packaging. Restocking fee: 0%."
```

**Expected:** Outputs a policy ID like `plc_...`  
📝 **Copy the policy ID** if you want to use a specific one

### 4. Run the Example

```bash
ARCANA_API_KEY=sk_test_YOUR_KEY_HERE node examples/complete-return-flow.js
```

**Or with custom policy:**

```bash
ARCANA_API_KEY=sk_test_YOUR_KEY_HERE \
POLICY_ID=plc_YOUR_POLICY_ID \
node examples/complete-return-flow.js
```

**Expected Output:**

```
🚀 Arcana Returns - Complete Return Flow Demo
============================================================

📝 STEP 1: Issuing Return Token
------------------------------------------------------------
📡 POST /returns/token
   ✅ Success (200)

   📊 Token Details:
   • Risk Score: 0.12 (🟢 Low Risk)
   • Required Evidence: photo_packaging
   ...

🎉 RETURN FLOW COMPLETED SUCCESSFULLY!
```

**Test Passes If:**
- ✅ All 3 steps complete successfully
- ✅ No errors occur
- ✅ Output is formatted and readable
- ✅ Trace IDs and audit refs are shown

---

## 📖 Documentation Quality Checks

### 1. API Reference Enhanced

- [ ] Open `docs/api-reference-enhanced.md`
- [ ] Scroll through and verify formatting
- [ ] Check that code blocks render correctly
- [ ] Verify all sections are present:
  - Getting Started
  - Authentication
  - Returns Flow (3 endpoints)
  - Policy Management
  - AEL
  - Webhooks
  - Error Handling
  - SDK Examples

**Expected:** Clean, readable documentation with syntax highlighting

### 2. Quick Reference Card

- [ ] Open `docs/QUICK_REFERENCE_CARD.md`
- [ ] Check tables render correctly
- [ ] Verify emoji render (if viewing on GitHub)
- [ ] Check code snippets are copy-pastable

**Expected:** Clean, scannable cheat sheet

### 3. OpenAPI Spec

- [ ] Open `docs/openapi.yaml`
- [ ] Verify YAML syntax is valid (no red squiggles in editor)
- [ ] Check that it starts with `openapi: 3.1.0`

**Optional:** Validate with online tool:
```bash
# Install redocly CLI globally
npm install -g @redocly/cli

# Validate spec
redocly lint docs/openapi.yaml
```

**Expected:** Valid OpenAPI 3.1 specification

### 4. Examples README

- [ ] Open `examples/README.md`
- [ ] Verify formatting
- [ ] Check code blocks are syntax-highlighted
- [ ] Verify troubleshooting section is clear

---

## 🔍 Type Documentation Checks

### 1. Returns Types

- [ ] Open `src/types/returns.ts` in VS Code
- [ ] Hover over different schemas:
  - `TokenRequestSchema`
  - `TokenResponseSchema`
  - `AuthorizeRequestSchema`
  - `CommitRequestSchema`
- [ ] Verify each field has a description

**Test Individual Fields:**
```typescript
// In a test file or playground, type this:
import { TokenRequestSchema } from './src/types/returns';

const test = TokenRequestSchema.shape.
// ↑ Autocomplete should show all fields with descriptions
```

### 2. Policy Types

- [ ] Open `src/types/policy.ts`
- [ ] Hover over `PolicyGraphSchema`
- [ ] Verify descriptions appear

### 3. AEL Types

- [ ] Open `src/types/ael.ts`
- [ ] Hover over `DecisionSchema`
- [ ] Verify descriptions appear

---

## 📝 Route Documentation Checks

### 1. Returns Routes

- [ ] Open `src/server/routes/returns.ts`
- [ ] Verify JSDoc comments are present above each route
- [ ] Check that comments include:
  - Explanation of what endpoint does
  - Request/response examples
  - Error codes
  - Security notes

**Expected:** Each of the 3 endpoints has comprehensive inline docs

### 2. Code Readability

- [ ] Read through the inline comments
- [ ] Verify they're helpful for a new developer
- [ ] Check that examples in comments match the actual types

---

## 🌐 Interactive Documentation (Optional)

### Install Redocly CLI

```bash
npm install -g @redocly/cli
```

### Preview Docs

```bash
npm run docs:serve
```

**Or manually:**

```bash
redocly preview-docs docs/openapi.yaml
```

**Expected:** Opens browser with interactive API documentation

**Test the Interactive Docs:**
- [ ] Navigate through endpoints
- [ ] Expand request/response examples
- [ ] Check error responses are documented
- [ ] Verify schemas are linked correctly

### Build Static Docs

```bash
npm run docs:build
```

**Expected:** Creates `docs/api-docs.html`

- [ ] Open `docs/api-docs.html` in browser
- [ ] Verify it renders correctly
- [ ] Check all endpoints are present

---

## 🧪 Edge Case Tests

### Test Example with Missing API Key

```bash
node examples/complete-return-flow.js
```

**Expected:**
```
❌ Error: ARCANA_API_KEY environment variable required

Usage:
  ARCANA_API_KEY=sk_test_... node examples/complete-return-flow.js
```

### Test Example with Invalid API Key

```bash
ARCANA_API_KEY=invalid_key node examples/complete-return-flow.js
```

**Expected:**
```
❌ Error occurred:
API Error: AUTH-001 - Invalid API key
```

### Test Example with Non-Existent Policy

```bash
ARCANA_API_KEY=sk_test_YOUR_KEY \
POLICY_ID=plc_nonexistent \
node examples/complete-return-flow.js
```

**Expected:**
```
❌ Error occurred:
API Error: POL-001 - Policy not found
```

---

## 📊 Quality Metrics

### Documentation Completeness

Count these and verify:

- [ ] **API Endpoints Documented:** 15+ endpoints in `api-reference-enhanced.md`
- [ ] **Schemas with Descriptions:** 19 schemas (returns: 8, policy: 6, ael: 5)
- [ ] **Visual Diagrams:** 2 in README (sequence + state)
- [ ] **Runnable Examples:** 1 (complete-return-flow.js)
- [ ] **Documentation Files:** 11 new files created

### File Size Verification

```bash
# Check that docs are substantial
wc -w docs/api-reference-enhanced.md  # Should be ~17,000 words
wc -w docs/API_DOCUMENTATION_GUIDE.md # Should be ~8,000 words
wc -l docs/openapi.yaml               # Should be ~600 lines
```

---

## ✅ Final Checklist

Before marking this complete, verify:

### Documentation Files
- [ ] All 11 new documentation files exist
- [ ] No broken internal links
- [ ] No typos in critical sections
- [ ] Code blocks have correct syntax highlighting

### Code Changes
- [ ] All Zod schemas have `.describe()`
- [ ] Route handlers have inline docs
- [ ] README has visual diagrams
- [ ] package.json has new scripts

### Examples Work
- [ ] Example script runs successfully
- [ ] Error handling works correctly
- [ ] Output is formatted and helpful
- [ ] Environment variables are documented

### Developer Experience
- [ ] IntelliSense shows helpful tooltips
- [ ] Documentation is easy to navigate
- [ ] Quick reference is truly quick
- [ ] Examples are copy-pastable

---

## 🐛 Known Issues

Document any issues found during testing:

### Issue Template

```
**Issue:** [Brief description]
**Location:** [File/section]
**Severity:** [Low/Medium/High]
**Fix:** [How to fix]
```

---

## 📈 Success Criteria

This documentation update is successful if:

✅ New developer can make first API call in <15 minutes  
✅ All endpoints have complete request/response examples  
✅ Error messages tell devs how to fix issues  
✅ Visual diagrams explain the flow  
✅ Code is self-documenting via JSDoc  
✅ Runnable example works out of the box  

---

## 🎉 Sign-Off

When all checks pass:

- **Tested By:** _______________
- **Date:** _______________
- **Issues Found:** _______________
- **Status:** ✅ PASS / ⚠️ PASS WITH ISSUES / ❌ FAIL

---

## 📞 Support

Issues during testing?

- **Check:** `DOCUMENTATION_PROGRESS.md` for known issues
- **Slack:** #developer-docs
- **Email:** docs@arcana.returns

---

_This checklist should take 15-20 minutes to complete_
