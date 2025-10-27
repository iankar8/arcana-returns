# 🚀 Pilot Launch Checklist

## Status: Pre-Launch Setup Complete

**Date Started:** October 27, 2025  
**Target Launch:** This week  
**Version:** v0.1.0-pilot

---

## ✅ Completed Tasks

### Day 1: GitHub & Monitoring (Completed)

- [x] **Git repository configured**
  - Repo: https://github.com/iankar8/arcana-returns
  - Branch: main
  - All code pushed

- [x] **Version tagged**
  - Tag: v0.1.0-pilot
  - Pushed to GitHub
  - Ready for reference

- [x] **Scripts created**
  - ✅ `scripts/health-check.sh` - Daily health monitoring
  - ✅ `scripts/backup-db.sh` - Database backup automation
  - ✅ `scripts/restore-db.sh` - Disaster recovery

- [x] **Documentation created**
  - ✅ `RUNBOOK.md` - Incident response procedures
  - ✅ `PILOT_ONBOARDING.md` - Merchant onboarding guide
  - ✅ `PILOT_LAUNCH_CHECKLIST.md` - This file

---

## 🔶 Manual Tasks Required (You Must Do These)

### Priority 1: Monitoring Setup (30 minutes)

#### A. UptimeRobot (Recommended - Free)
1. Go to https://uptimerobot.com
2. Create free account
3. Add monitor:
   - **Type:** HTTP(s)
   - **URL:** `https://arcana-returns-api.fly.dev/health`
   - **Name:** Arcana Returns API
   - **Interval:** 5 minutes
   - **Alert Contacts:** Your email
4. Test alert by temporarily stopping the app

#### B. Fly.io Alerts
```bash
# Set up crash alerts
fly alerts create \
  --check health \
  --threshold 2 \
  --email your-email@example.com

# List configured alerts
fly alerts list
```

**Why:** You need to know immediately if the system goes down.

---

### Priority 2: Backup Infrastructure (1-2 hours)

#### A. Create AWS S3 Bucket (or Backblaze B2)

**Option 1: AWS S3 (Standard)**
1. Go to https://console.aws.amazon.com/s3
2. Create bucket: `arcana-returns-backups`
3. Region: `us-west-2` (or closest to Fly.io)
4. Enable versioning
5. Create IAM user with S3 write access
6. Save access key + secret key

**Option 2: Backblaze B2 (Cheaper)**
1. Go to https://www.backblaze.com/b2
2. Create bucket: `arcana-returns-backups`
3. Generate application key
4. Cost: ~$0.005/GB vs AWS $0.023/GB

#### B. Configure Fly.io Secrets
```bash
# Set AWS credentials
fly secrets set \
  AWS_ACCESS_KEY_ID=your-access-key-here \
  AWS_SECRET_ACCESS_KEY=your-secret-key-here \
  AWS_DEFAULT_REGION=us-west-2 \
  BACKUP_S3_BUCKET=s3://arcana-returns-backups
```

#### C. Test Backup Manually
```bash
# SSH into Fly.io
fly ssh console

# Run backup script
cd /app
./scripts/backup-db.sh

# Verify uploaded
aws s3 ls s3://arcana-returns-backups/
```

#### D. Schedule Daily Backups
Add to your Dockerfile or create a cron job:
```bash
# Add to crontab (runs at 2am UTC daily)
0 2 * * * /app/scripts/backup-db.sh
```

**Why:** Backups are your disaster recovery plan. Test them before you need them.

---

### Priority 3: Generate Pilot Credentials (30 minutes)

#### A. Generate API Key
```bash
# SSH into Fly.io
fly ssh console

# Generate key for first pilot merchant
cd /app
node dist/cli/index.js keys generate \
  --merchant pilot_merchant_001 \
  --name "Pilot Merchant #1"

# Output will be:
# API Key: sk_xxxxxxxxxxxxx
# Merchant ID: pilot_merchant_001
```

**Save this securely!** Store in 1Password or similar:
- Title: "Arcana Pilot - Merchant 001"
- API Key: sk_xxxxx
- Merchant ID: pilot_merchant_001
- Created: [date]

#### B. Import Default Policy
```bash
# Still in fly ssh console
node dist/cli/index.js policy import \
  --merchant pilot_merchant_001 \
  --text "Returns accepted within 30 days of purchase. Items must be in original packaging with tags attached. Free returns via prepaid label. No restocking fee for standard items. Electronics have 14-day window. Photo of packaging required for all returns."

# Output will be:
# Policy ID: plc_xxxxxxxxxxxxx
```

**Save this too:**
- Policy ID: plc_xxxxx
- Merchant: pilot_merchant_001

---

### Priority 4: End-to-End Test (15 minutes)

Run through the complete flow yourself:

```bash
# Set environment variables
export API_KEY="sk_xxxxx"  # From step above
export POLICY_ID="plc_xxxxx"  # From step above
export API_URL="https://arcana-returns-api.fly.dev"

# 1. Health check
curl $API_URL/health

# 2. Issue token
RESPONSE=$(curl -s -X POST $API_URL/returns/token \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"order_id\": \"test_$(date +%s)\",
    \"customer_ref\": \"test_customer\",
    \"items\": [{\"sku\": \"TEST-SKU\", \"qty\": 1, \"price_cents\": 2999}],
    \"reason_code\": \"doesnt_fit\",
    \"policy_id\": \"$POLICY_ID\"
  }")

echo $RESPONSE | jq '.'

# Extract return token
RETURN_TOKEN=$(echo $RESPONSE | jq -r '.return_token')

# 3. Authorize
curl -X POST $API_URL/returns/authorize \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"return_token\": \"$RETURN_TOKEN\",
    \"evidence\": [{
      \"type\": \"photo_packaging\",
      \"url\": \"https://picsum.photos/800/600\"
    }]
  }" | jq '.'

# 4. Commit
curl -X POST $API_URL/returns/commit \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"return_token\": \"$RETURN_TOKEN\",
    \"receipt_event\": {
      \"type\": \"scan\",
      \"carrier\": \"UPS\",
      \"ts\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
    }
  }" | jq '.'
```

**Expected Results:**
- All commands return 200 OK
- No errors in logs
- Decision is "approve"
- Refund instruction is "instant"

---

## 📋 Pre-Launch Checklist

Before sending credentials to pilot merchant:

### System Health
- [ ] API is responding: `curl https://arcana-returns-api.fly.dev/health`
- [ ] Detailed health shows all green: `/health/detailed`
- [ ] No errors in logs: `fly logs | grep ERROR`
- [ ] Database is healthy: `fly ssh console` → `sqlite3 /app/data/arcana.db "PRAGMA integrity_check;"`

### Monitoring
- [ ] UptimeRobot monitoring configured and green
- [ ] Fly.io alerts configured
- [ ] Email alerts tested and working
- [ ] Health check script works: `./scripts/health-check.sh`

### Backups
- [ ] S3 bucket created
- [ ] AWS credentials configured in Fly.io secrets
- [ ] Manual backup tested successfully
- [ ] Backup appears in S3: `aws s3 ls s3://arcana-returns-backups/`
- [ ] Restore procedure tested (optional but recommended)
- [ ] Daily backup cron scheduled

### Credentials
- [ ] API key generated for pilot merchant
- [ ] Default policy imported
- [ ] Credentials saved securely (1Password, etc.)
- [ ] Test credentials work with curl commands

### Testing
- [ ] Complete return flow tested (token → authorize → commit)
- [ ] All three endpoints return success
- [ ] No errors logged during test
- [ ] Data appears correctly in database

### Documentation
- [ ] RUNBOOK.md reviewed and accurate
- [ ] PILOT_ONBOARDING.md ready to send
- [ ] Contact information filled in
- [ ] Emergency procedures understood

---

## 🚀 Launch Day Procedure

### Step 1: Final Health Check (5 minutes)
```bash
./scripts/health-check.sh
fly status
fly logs | tail -50
```

### Step 2: Prepare Pilot Package (10 minutes)

Create a secure document with:
```markdown
# Arcana Returns API - Your Pilot Credentials

**API Base URL:** https://arcana-returns-api.fly.dev
**API Key:** sk_xxxxxxxxxxxxx
**Policy ID:** plc_xxxxxxxxxxxxx
**Merchant ID:** pilot_merchant_001

**Support Email:** support@arcanalabs.dev
**Emergency Contact:** [Your phone]

**Documentation:**
- Pilot Onboarding: [Attach PILOT_ONBOARDING.md]
- Quickstart Guide: [Link to QUICKSTART.md]
- API Reference: [Link to docs]

**Next Steps:**
1. Test health check (see onboarding doc)
2. Schedule integration kickoff call
3. Process first test return
```

### Step 3: Send to Pilot Merchant

**Email Template:**
```
Subject: Arcana Returns API - Your Pilot Access is Ready 🚀

Hi [Merchant Name],

Great news! Your Arcana Returns API pilot access is ready.

**What's Included:**
- Full API access with dedicated credentials
- 90-day pilot period (no cost)
- Direct support (2-hour response time)
- Weekly check-in calls

**Getting Started:**
1. Review the attached onboarding document
2. Test the health check command
3. Schedule our integration kickoff call

**Support:**
Email: support@arcanalabs.dev
Response time: <2 hours (M-F 9am-6pm PT)

Let's schedule our first call this week to get you set up.

Looking forward to working with you!

Best,
[Your Name]

Attachments:
- Pilot Onboarding Guide
- API Credentials (secure)
```

### Step 4: Schedule Kickoff Call (30 minutes)

Agenda:
1. Walkthrough of API (15 min)
2. Integration planning (10 min)
3. Q&A (5 min)

### Step 5: Monitor First Week Closely

- Check health daily
- Review logs for errors
- Respond to questions quickly
- Schedule first feedback call (Friday)

---

## 📊 Success Metrics

Track these during pilot:

### Technical
- **Uptime:** Target >99%
- **Latency:** p95 <500ms, p99 <1s
- **Error rate:** <1%
- **Response time:** Support <2 hours

### Business
- **Returns processed:** 50-100 in 90 days
- **Fraud caught:** Track false positive rate
- **Time saved:** vs manual process
- **Merchant NPS:** Target >8

---

## 🆘 Emergency Contacts

**If something goes wrong:**

1. **Check logs:** `fly logs`
2. **Restart app:** `fly apps restart`
3. **Review runbook:** See RUNBOOK.md
4. **Contact Fly.io:** status.fly.io (if platform issue)
5. **Notify merchant:** If downtime >15 min

---

## 📝 Weekly Checklist

Every week during pilot:

- [ ] Check system health (`./scripts/health-check.sh`)
- [ ] Review error logs
- [ ] Verify backups ran successfully
- [ ] Pilot merchant check-in call (Friday 2pm)
- [ ] Update this checklist with learnings

---

## 🎯 Next Steps After Launch

**Week 1:**
- Monitor closely
- Fix any bugs immediately
- Gather initial feedback

**Week 2-4:**
- Add requested features
- Optimize based on usage patterns
- Consider onboarding merchant #2

**Month 2-3:**
- Scale to 3-5 merchants
- Build self-service features
- Prepare for production launch

---

## ✅ Sign-Off

Before launching, confirm:

- [ ] I have tested the full return flow
- [ ] Backups are configured and tested
- [ ] Monitoring alerts are working
- [ ] I know how to respond to incidents (RUNBOOK.md)
- [ ] Pilot credentials are generated and secured
- [ ] I'm ready to support a pilot merchant

**Launch Date:** _______________

**Signed:** _______________

---

**Good luck with your pilot! 🚀**

*You've built something great. Now let's prove it with real merchants.*
