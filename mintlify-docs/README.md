# Arcana Returns - Mintlify Documentation

**Status:** Ready to deploy to docs.arcanalabs.dev ✅

## What's Here

This folder contains the Mintlify documentation setup for Arcana Returns API.

```
mintlify-docs/
├── mint.json              # Mintlify configuration
├── openapi.yaml           # OpenAPI 3.1 specification
├── introduction.mdx       # Homepage
├── quickstart.mdx         # Getting started guide
├── authentication.mdx     # Auth documentation
├── DEPLOYMENT.md          # How to deploy
└── README.md              # This file
```

## Quick Start

### Local Preview

```bash
cd mintlify-docs
mintlify dev
```

Opens at `http://localhost:3000`

### Deploy to Production

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete instructions.

**TL;DR:**
1. Push to GitHub
2. Connect repo at [mintlify.com](https://mintlify.com)
3. Set custom domain: `docs.arcanalabs.dev`

## What's Configured

✅ **Navigation** - 4 main sections:
- Get Started (Introduction, Quickstart, Authentication)
- API Reference (Returns, Policy, AEL, Webhooks)
- Integration Guides (Shopify, Stripe)
- Examples (3 working examples)

✅ **OpenAPI Integration** - Auto-generates API reference from `openapi.yaml`

✅ **Branding** - Colors, logo placeholders, social links

✅ **Features** - Code snippets, tabs, accordions, cards, steps

## Next Steps

### 1. Add Logos

Add your logo files:
```
mintlify-docs/
├── logo/
│   ├── dark.svg    # Logo for dark mode
│   └── light.svg   # Logo for light mode
└── favicon.svg     # Favicon
```

### 2. Add More Content

The following pages are referenced in `mint.json` but need to be created:

**Core Concepts:**
- `concepts/returns-flow.mdx`
- `concepts/policy-management.mdx`  
- `concepts/audit-ledger.mdx`

**API Reference Pages:**
(These will auto-generate from openapi.yaml, but you can override with custom MDX)
- `api-reference/returns/*.mdx`
- `api-reference/policy/*.mdx`
- `api-reference/ael/*.mdx`

**Guides:**
- `guides/shopify-integration.mdx` (copy from ../docs/guides/)
- `guides/stripe-integration.mdx`
- `guides/custom-platform.mdx`
- `guides/examples/*.mdx`

### 3. Customize Branding

Edit `mint.json`:
- Update colors to match your brand
- Add your social media links
- Update support email
- Customize navigation structure

### 4. Deploy!

Follow [DEPLOYMENT.md](./DEPLOYMENT.md) to go live at docs.arcanalabs.dev

## Features to Explore

### Code Groups

Show examples in multiple languages:

```mdx
<CodeGroup>
```javascript Node.js
const example = 'code';
```

```python Python
example = 'code'
```
</CodeGroup>
```

### Cards

```mdx
<CardGroup cols={2}>
  <Card title="Title" icon="icon-name" href="/link">
    Description
  </Card>
</CardGroup>
```

### Callouts

```mdx
<Note>This is a note</Note>
<Tip>This is a tip</Tip>
<Warning>This is a warning</Warning>
<Info>This is info</Info>
```

### Steps

```mdx
<Steps>
  <Step title="First Step">Content</Step>
  <Step title="Second Step">Content</Step>
</Steps>
```

## Support

- **Mintlify Docs:** [mintlify.com/docs](https://mintlify.com/docs)
- **Components:** [mintlify.com/docs/content/components](https://mintlify.com/docs/content/components)
- **Discord:** [discord.gg/mintlify](https://discord.gg/mintlify)

## Auto-Deploy

Once connected to GitHub, every push to `main` automatically deploys!

```bash
# Edit docs
vim quickstart.mdx

# Commit and push
git add mintlify-docs/
git commit -m "Update docs"
git push

# Automatically deploys to docs.arcanalabs.dev! 🚀
```
