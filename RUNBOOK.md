# Arcana Returns - Incident Response Runbook

## 🚨 Emergency Contacts
- **Owner:** Ian Kar
- **Email:** support@arcanalabs.dev
- **Fly.io Status:** https://status.fly.io
- **GitHub:** https://github.com/iankar8/arcana-returns

---

## Quick Reference Commands

```bash
# Check status
fly status
curl https://arcana-returns-api.fly.dev/health/detailed

# View logs
fly logs
fly logs --app arcana-returns-api | tail -100

# SSH into machine
fly ssh console

# Restart app
fly apps restart arcana-returns-api

# Check backups
aws s3 ls s3://arcana-returns-backups/ | tail -10
```

---

## Common Issues & Fixes

### 🔴 App is Down / Health Check Failing

**Symptoms:**
- https://arcana-returns-api.fly.dev/health returns 500 or timeout
- UptimeRobot alert email

**Diagnosis:**
```bash
fly status
fly logs --app arcana-returns-api | tail -50
```

**Fix:**
```bash
# Quick restart
fly apps restart arcana-returns-api

# If still down, check for errors
fly logs --app arcana-returns-api | grep ERROR

# If database locked
fly ssh console
cd /app/data
ls -lh arcana.db*
# If you see .db-wal or .db-shm files that are large, database might be locked
```

**Escalation:** If restart doesn't work within 5 minutes, check Fly.io status page.

---

### 🟡 Slow Response Times (>2 seconds)

**Symptoms:**
- API requests taking > 2 seconds
- Metrics show high p99 latency

**Diagnosis:**
```bash
# Check system resources
fly ssh console
top
df -h /app/data

# Check database size
cd /app/data
du -h arcana.db
```

**Fix:**
```bash
# Optimize database
fly ssh console
sqlite3 /app/data/arcana.db "VACUUM;"
sqlite3 /app/data/arcana.db "ANALYZE;"

# Clean up old idempotency keys
sqlite3 /app/data/arcana.db "DELETE FROM idempotency_keys WHERE expires_at < datetime('now');"
```

**Prevention:** Schedule monthly VACUUM operations.

---

### 🔵 Database Corruption

**Symptoms:**
- "database disk image is malformed"
- Can't read/write to database
- App crashes on startup

**Fix:**
```bash
# 1. Stop the app immediately
fly apps stop arcana-returns-api

# 2. List available backups
aws s3 ls s3://arcana-returns-backups/ | tail -10

# 3. Restore from backup
./scripts/restore-db.sh arcana_backup_YYYYMMDD_HHMMSS.db.gz

# 4. Follow on-screen instructions to complete restore

# 5. Restart app
fly apps start arcana-returns-api

# 6. Verify
curl https://arcana-returns-api.fly.dev/health/detailed
```

**Post-Incident:** Investigate root cause (disk full? crash during write?).

---

### 🟢 Out of Disk Space

**Symptoms:**
- "No space left on device"
- Can't write to database
- 500 errors on write operations

**Diagnosis:**
```bash
fly ssh console
df -h /app/data
```

**Fix Option 1: Cleanup**
```bash
# Remove old audit logs (>90 days)
sqlite3 /app/data/arcana.db "DELETE FROM decisions WHERE created_at < datetime('now', '-90 days');"
sqlite3 /app/data/arcana.db "DELETE FROM return_tokens WHERE issued_at < datetime('now', '-90 days');"
sqlite3 /app/data/arcana.db "VACUUM;"
```

**Fix Option 2: Expand Volume**
```bash
# List volumes
fly volumes list

# Expand volume (e.g., from 1GB to 2GB)
fly volumes extend <volume-id> --size 2
```

---

### ⚪ Rate Limit Issues

**Symptoms:**
- Merchant getting 429 errors
- Complaints about blocked requests

**Diagnosis:**
```bash
fly ssh console
cd /app
node dist/cli/index.js maintenance rate-limits
```

**Fix:**
```bash
# Reset rate limit for specific merchant
node dist/cli/index.js maintenance reset-rate-limit --merchant <merchant_id>

# Or adjust limits in code if needed
```

---

### ⚪ Webhook Delivery Failures

**Symptoms:**
- Dead letter queue filling up
- Merchant not receiving webhook events

**Diagnosis:**
```bash
fly ssh console
cd /app
node dist/cli/index.js maintenance dlq-stats
```

**Fix:**
```bash
# Retry failed webhooks
node dist/cli/index.js maintenance retry-dlq

# Check specific merchant's webhooks
# (Manual SQL query if needed)
```

---

## Operational Tasks

### Generate API Key for New Merchant

```bash
fly ssh console
cd /app
node dist/cli/index.js keys generate \
  --merchant merchant_NAME \
  --name "Merchant Display Name"

# Copy the API key (starts with sk_)
# Store in 1Password: "Arcana Pilot - [Merchant Name] API Key"
```

---

### Import Policy for Merchant

```bash
fly ssh console
cd /app

# Option 1: From text
node dist/cli/index.js policy import \
  --merchant merchant_NAME \
  --text "30 day returns, no restocking fee, photo evidence required"

# Option 2: From URL (if merchant has policy online)
node dist/cli/index.js policy import \
  --merchant merchant_NAME \
  --url "https://merchant.com/returns-policy"

# Copy the policy_id (starts with plc_)
```

---

### Manual Database Backup

```bash
# From your local machine
fly ssh console

# Inside the machine
cd /app
/app/scripts/backup-db.sh

# Verify backup uploaded
aws s3 ls s3://arcana-returns-backups/ | tail -5
```

---

### Check System Health

```bash
# Quick health check
./scripts/health-check.sh

# Detailed stats
fly ssh console
cd /app
node dist/cli/index.js maintenance stats

# Check specific merchant activity
sqlite3 /app/data/arcana.db "SELECT COUNT(*) FROM return_tokens WHERE merchant_id='merchant_NAME';"
```

---

## Recovery Procedures

### Full System Recovery (Disaster Scenario)

**Step 1: Assess the Situation**
```bash
# Check Fly.io platform status
open https://status.fly.io

# Check app status
fly status

# Review recent deployments
fly releases
```

**Step 2: Attempt Restart**
```bash
fly apps restart arcana-returns-api
```

**Step 3: Check for Corrupted Database**
```bash
fly ssh console
sqlite3 /app/data/arcana.db "PRAGMA integrity_check;"
```

**Step 4: Restore from Backup (if needed)**
```bash
# List backups
aws s3 ls s3://arcana-returns-backups/

# Restore latest
./scripts/restore-db.sh arcana_backup_<latest>.db.gz
```

**Step 5: Rollback Code (if deployment issue)**
```bash
fly releases
fly releases rollback <previous_version>
```

**Step 6: Verify Recovery**
```bash
curl https://arcana-returns-api.fly.dev/health/detailed
./scripts/health-check.sh
```

**Step 7: Notify Stakeholders**
- If downtime > 15 minutes: Email pilot merchants
- If data loss: Immediate call to affected merchants
- Post-mortem within 48 hours

---

### Data Loss Prevention

**Backup Strategy:**
- ✅ Automated daily backups at 2am UTC
- ✅ 90-day retention in S3
- ✅ Versioned backups (can restore any point in time)

**Testing:**
- [ ] Test restore procedure monthly
- [ ] Keep local backup before major changes
- [ ] Verify backup integrity weekly

---

## Monitoring & Alerting

### Health Check Endpoints

```bash
# Basic health (public, no auth)
curl https://arcana-returns-api.fly.dev/health

# Detailed health (requires API key)
curl -H "Authorization: Bearer sk_xxx" \
  https://arcana-returns-api.fly.dev/health/detailed

# Prometheus metrics
curl https://arcana-returns-api.fly.dev/metrics
```

### Log Analysis

```bash
# View live logs
fly logs

# Search for errors
fly logs | grep ERROR

# Search for specific merchant
fly logs | grep "merchant_id.*merchant_NAME"

# Search by trace ID
fly logs | grep "trace_id.*trc_abc123"

# View last hour
fly logs --since 1h
```

### Performance Metrics

```bash
# Check metrics endpoint
curl https://arcana-returns-api.fly.dev/metrics | grep arcana_returns

# Key metrics to watch:
# - arcana_returns_requests_total
# - arcana_returns_request_duration_seconds
# - arcana_returns_errors_total
```

---

## Deployment Procedures

### Deploy New Version

```bash
# 1. Commit changes
git add .
git commit -m "Description of changes"
git push origin main

# 2. Deploy to Fly.io
fly deploy

# 3. Watch logs for issues
fly logs

# 4. Verify health
curl https://arcana-returns-api.fly.dev/health/detailed

# 5. Test a return flow
# (Use test script or manual curl commands)
```

### Rollback Deployment

```bash
# List recent releases
fly releases

# Rollback to previous version
fly releases rollback <version>

# Verify rollback successful
fly logs
curl https://arcana-returns-api.fly.dev/health
```

---

## Escalation Path

1. **Try standard fixes** (see above sections)
2. **Check Fly.io status** → https://status.fly.io
3. **Search Fly.io community** → https://community.fly.io
4. **Review recent changes** → `git log` and `fly releases`
5. **Restore from backup** (if data issue)
6. **Contact Fly.io support** (if platform issue)
7. **Notify pilot merchants** (if outage > 30 min)

---

## Maintenance Schedule

### Daily
- [x] Automated backup at 2am UTC
- [ ] Check health status (automated via UptimeRobot)

### Weekly
- [ ] Review error logs
- [ ] Check database size
- [ ] Review rate limit metrics
- [ ] Pilot merchant check-in

### Monthly
- [ ] VACUUM database
- [ ] Test restore procedure
- [ ] Review and archive old data
- [ ] Security updates (npm audit)

---

## Contact Information

**For Emergencies:**
- Email: support@arcanalabs.dev
- Response Time: 2 hours (M-F 9am-6pm PT)

**For Pilot Merchants:**
- Weekly check-ins: Fridays 2pm PT
- Slack: [To be created per merchant]

---

**Last Updated:** October 27, 2025
**Version:** 0.1.0-pilot
