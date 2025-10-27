# Deploying to docs.arcanalabs.dev

## Quick Setup

### 1. Push to GitHub

```bash
cd /Users/iankar/CascadeProjects/arcana-returns

# Add mintlify docs
git add mintlify-docs/
git commit -m "Add Mintlify documentation"
git push origin main
```

### 2. Connect Mintlify

1. Go to [mintlify.com/dashboard](https://mintlify.com/dashboard)
2. Click **"Connect Repository"**
3. Select your GitHub repository
4. Choose the `mintlify-docs` folder as the docs directory
5. Click **"Deploy"**

Your docs will be live at: `arcana-returns.mintlify.app`

### 3. Set Up Custom Domain (docs.arcanalabs.dev)

#### In Mintlify Dashboard:

1. Go to **Settings** → **Domain**
2. Add custom domain: `docs.arcanalabs.dev`
3. Mintlify will show you DNS records to add

#### In Your DNS Provider:

Add a CNAME record:
```
Type: CNAME
Name: docs (or @docs if subdomain)
Value: cname.mintlify.com
TTL: Auto or 3600
```

#### Verify:

Wait 5-10 minutes for DNS propagation, then:
```bash
nslookup docs.arcanalabs.dev
# Should point to Mintlify servers
```

Click **"Verify"** in Mintlify dashboard.

## Auto-Deploy on Push

Mintlify automatically deploys when you push to main branch!

```bash
# Make changes to docs
vim mintlify-docs/quickstart.mdx

# Commit and push
git add mintlify-docs/
git commit -m "Update quickstart guide"
git push

# Mintlify auto-deploys in ~30 seconds!
```

## Local Development

```bash
cd mintlify-docs
mintlify dev
```

Opens at `http://localhost:3000`

## Adding More Pages

1. Create MDX file in `mintlify-docs/`
2. Add to navigation in `mint.json`
3. Push to GitHub

Example:
```bash
# Create new guide
echo "# My Guide" > mintlify-docs/guides/my-guide.mdx

# Add to mint.json navigation
# ... edit mint.json ...

# Deploy
git add mintlify-docs/
git commit -m "Add my guide"
git push
```

## Troubleshooting

### Docs not updating?
- Check build status in Mintlify dashboard
- Clear cache: Settings → Clear Cache
- Check for syntax errors in MDX files

### Custom domain not working?
- Verify DNS with `nslookup docs.arcanalabs.dev`
- Wait up to 24 hours for propagation
- Check Mintlify dashboard for verification status

### Build errors?
- Check `mint.json` syntax (must be valid JSON)
- Ensure all pages in navigation exist
- Check MDX frontmatter format

## Support

- Mintlify Docs: [mintlify.com/docs](https://mintlify.com/docs)
- Mintlify Support: support@mintlify.com
- Community: [discord.gg/mintlify](https://discord.gg/mintlify)
