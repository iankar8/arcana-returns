# Deployment Checklist for Arcana Labs Landing

## ✅ Pre-Deployment (Complete)

- [x] Build passes (`npm run build`)
- [x] Email capture integration (Resend)
- [x] All pages created (home, returns, commerce, banking, team)
- [x] Navigation updated across all pages
- [x] Branding updated to "Arcana Labs"
- [x] Careers page removed from navigation
- [x] `.gitignore` configured
- [x] Environment variables templated

## 🚀 Deployment Steps

### 1. Set Up Resend (Email Service)

**Do this first:**
- [ ] Sign up at https://resend.com
- [ ] Add domain: `arcanalabs.dev` (or your domain)
- [ ] Verify domain with DNS records (MX, TXT, DKIM)
- [ ] Create API key (save it securely)
- [ ] Update email addresses in `app/api/waitlist/route.ts`:
  - Line 66: `from: 'waitlist@arcanalabs.dev'`
  - Line 84: `from: 'team@arcanalabs.dev'`

### 2. Configure Environment Variables

**On your deployment platform (Vercel/Netlify/etc), add:**

```
RESEND_API_KEY=re_your_actual_key_here
NOTIFICATION_EMAIL=ian@arcanalabs.dev
```

⚠️ **Important:** Never commit `.env.local` or expose your API keys!

### 3. Deploy to Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# From the landing directory
cd /Users/iankar/CascadeProjects/arcana-returns/landing

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

**During deployment:**
1. Link to existing project or create new one
2. Set environment variables in Vercel dashboard
3. Deploy from `landing` directory (not root)

**Vercel Dashboard:**
- Settings → Environment Variables → Add:
  - `RESEND_API_KEY`
  - `NOTIFICATION_EMAIL`

### 4. Alternative: Deploy to Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# From the landing directory
cd /Users/iankar/CascadeProjects/arcana-returns/landing

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod
```

**Netlify Configuration:**
- Build command: `npm run build`
- Publish directory: `.next`
- Add environment variables in Site Settings

### 5. Post-Deployment Verification

**Test these URLs:**
- [ ] `yourdomain.com` - Home page loads
- [ ] `yourdomain.com/returns` - Returns page loads
- [ ] `yourdomain.com/commerce` - Commerce page loads
- [ ] `yourdomain.com/banking` - Banking page loads
- [ ] `yourdomain.com/team` - Team page loads

**Test email capture:**
- [ ] Go to `/returns` page
- [ ] Scroll to "Get early access" section
- [ ] Submit test email
- [ ] Verify:
  - Success message appears
  - Notification email received (to your NOTIFICATION_EMAIL)
  - Confirmation email received (to submitted email)
  - Email stored in production (check logs or database)

### 6. DNS Setup

**If using custom domain:**

1. Add domain to deployment platform
2. Update DNS records:
   - **Vercel:** Add A record or CNAME
   - **Netlify:** Add CNAME to netlify subdomain

3. Update Resend domain verification
4. Test with `dig yourdomain.com`

### 7. Analytics & Monitoring (Optional)

**Recommended additions:**
- [ ] Google Analytics
- [ ] Vercel Analytics (built-in)
- [ ] Error tracking (Sentry)
- [ ] Uptime monitoring

## 📝 Important Notes

### Email Domains
Current placeholder emails in code:
- `waitlist@arcanalabs.dev`
- `team@arcanalabs.dev`

**Must match your verified Resend domain!**

### Data Storage
Waitlist emails are stored in `data/waitlist.json` on the server. Consider:
- Regular backups
- Moving to database for scale
- Export functionality

### Security
- [x] `.env` files are gitignored
- [x] Personal email (ian@) is private
- [x] API keys are environment variables only
- [ ] Set up rate limiting (if needed)

## 🐛 Troubleshooting

**Build fails:**
```bash
# Clear cache and rebuild
rm -rf .next
npm run build
```

**Emails not sending:**
- Verify RESEND_API_KEY is set
- Check domain is verified in Resend
- Ensure from addresses match verified domain
- Check Resend dashboard logs

**Window is not defined error:**
- Fixed in page.tsx (typeof window check)
- If recurring, add more SSR safety checks

## 🎉 Launch Checklist

Before announcing:
- [ ] All pages load correctly
- [ ] Email capture works end-to-end
- [ ] Mobile responsive (test on phone)
- [ ] SSL certificate active (https)
- [ ] Custom domain connected
- [ ] Team page has correct info
- [ ] Social media preview works (og:image)

## 📊 Post-Launch

Monitor:
- Waitlist signups (`data/waitlist.json`)
- Email delivery (Resend dashboard)
- Site performance (Vercel/Netlify analytics)
- Error logs

Export waitlist data regularly:
```bash
# SSH into server or download from hosting platform
cat data/waitlist.json
```
