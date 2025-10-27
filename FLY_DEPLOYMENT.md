# Deploying Arcana Returns API to Fly.io

## Prerequisites

1. **Install Fly CLI**
   ```bash
   # macOS
   brew install flyctl
   
   # Or download from https://fly.io/docs/hands-on/install-flyctl/
   ```

2. **Sign up / Log in**
   ```bash
   fly auth signup  # First time
   # OR
   fly auth login   # Existing account
   ```

---

## Initial Setup (First Deployment)

### 1. Create the App

```bash
cd /Users/iankar/CascadeProjects/arcana-returns

# Launch the app (this creates it on Fly.io)
fly launch --no-deploy

# When prompted:
# - App name: arcana-returns-api (or your choice)
# - Region: Choose closest to your users (e.g., sjc for San Jose)
# - Would you like to set up a PostgreSQL database? NO
# - Would you like to set up an Upstash Redis database? NO (we can add later)
# - Would you like to deploy now? NO
```

### 2. Create Persistent Volume for SQLite

```bash
# Create volume for database persistence
fly volumes create arcana_data --region sjc --size 1
# Size in GB, 1GB is plenty for SQLite
```

### 3. Set Secrets (Environment Variables)

```bash
# Generate and set JWT secret
fly secrets set JWT_SECRET=$(openssl rand -base64 32)

# Set other required secrets
fly secrets set \
  JWT_ISSUER=arcana \
  JWT_EXPIRY_SECONDS=900 \
  DATABASE_PATH=/app/data/arcana.db

# Optional: Set rate limits
fly secrets set \
  RATE_LIMIT_MAX=1000 \
  RATE_LIMIT_WINDOW_MS=60000
```

### 4. Deploy!

```bash
# Deploy the application
fly deploy

# Watch the deployment
fly logs
```

### 5. Initialize Database

```bash
# SSH into the machine
fly ssh console

# Inside the machine:
cd /app
node dist/db/init.js
exit

# OR use fly ssh to run command directly:
fly ssh console -C "cd /app && node dist/db/init.js"
```

### 6. Verify Deployment

```bash
# Check status
fly status

# Check health
curl https://arcana-returns-api.fly.dev/health

# Check detailed health
curl https://arcana-returns-api.fly.dev/health/detailed

# View logs
fly logs
```

---

## Post-Deployment Setup

### 1. Generate API Keys

```bash
# SSH into the machine
fly ssh console

# Generate API key for test merchant
cd /app
node dist/cli/index.js keys generate --merchant test_merchant

# Copy the API key (starts with sk_)
exit
```

### 2. Create Default Policy

```bash
# Create a simple policy file locally
cat > policy-default.json << 'EOF'
{
  "policy_id": "plc_default_001",
  "name": "Default Return Policy",
  "window_days": 30,
  "restocking_fee_pct": 0,
  "allowed_reasons": ["doesnt_fit", "wrong_item", "damaged"],
  "required_evidence": ["photo_packaging"]
}
EOF

# Copy to fly machine
fly ssh console -C "cat > /app/policy-default.json" < policy-default.json

# Create the policy
fly ssh console -C "cd /app && node dist/cli/index.js policy create --file policy-default.json"
```

### 3. Test the API

```bash
# Set your API key
export API_KEY="sk_your_generated_key"
export API_URL="https://arcana-returns-api.fly.dev"

# Test health
curl $API_URL/health

# Test token endpoint
curl -X POST $API_URL/returns/token \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "ord_test_001",
    "customer_ref": "cust_001",
    "items": [{"sku": "TEST-SKU", "qty": 1, "price_cents": 2999}],
    "reason_code": "doesnt_fit",
    "policy_id": "plc_default_001"
  }'
```

---

## Ongoing Operations

### Scale Up/Down

```bash
# Scale to 2 machines for high availability
fly scale count 2

# Scale to larger VM
fly scale vm shared-cpu-2x --memory 1024

# Scale back down
fly scale count 1
```

### View Logs

```bash
# Stream logs
fly logs

# View specific timeframe
fly logs --since 1h

# Search logs
fly logs | grep ERROR
```

### Database Backup

```bash
# SSH and backup database
fly ssh console

# Inside machine:
cd /app/data
sqlite3 arcana.db ".backup arcana-backup-$(date +%Y%m%d).db"

# Download backup to local machine (from local terminal):
fly ssh sftp get /app/data/arcana-backup-*.db ./backups/
```

### Update Secrets

```bash
# Update a secret
fly secrets set JWT_SECRET=new-secret-value

# List secrets (values hidden)
fly secrets list

# Unset a secret
fly secrets unset SECRET_NAME
```

### Deploy Updates

```bash
# After making code changes
git commit -am "Update: description"

# Deploy new version
fly deploy

# Rollback if needed
fly releases
fly releases rollback <version>
```

### Monitoring

```bash
# Check status
fly status

# Check metrics
fly dashboard  # Opens web dashboard

# Check machine health
fly checks list
```

---

## Maintenance Tasks

### Run CLI Commands

```bash
# Check system stats
fly ssh console -C "cd /app && node dist/cli/index.js maintenance stats"

# Check DLQ
fly ssh console -C "cd /app && node dist/cli/index.js maintenance dlq-stats"

# Retry DLQ
fly ssh console -C "cd /app && node dist/cli/index.js maintenance retry-dlq"

# Cleanup old data
fly ssh console -C "cd /app && node dist/cli/index.js maintenance cleanup-old-events --days 30"
```

### Set Up Cron Jobs (Scheduled Tasks)

Create a simple cron machine:

```bash
# Create a cron script
cat > scripts/cron.sh << 'EOF'
#!/bin/sh
# Run maintenance tasks

# Cleanup idempotency keys (daily)
0 2 * * * cd /app && node dist/cli/index.js maintenance cleanup-idempotency

# Retry DLQ (hourly)
0 * * * * cd /app && node dist/cli/index.js maintenance retry-dlq

# Cleanup old events (weekly)
0 3 * * 0 cd /app && node dist/cli/index.js maintenance cleanup-old-events --days 30
EOF

# Deploy as a separate machine
fly machine run --schedule daily
```

---

## Monitoring & Alerts

### Prometheus Integration

```bash
# Metrics are available at /metrics endpoint
curl https://arcana-returns-api.fly.dev/metrics
```

Add to Prometheus config:
```yaml
scrape_configs:
  - job_name: 'arcana-returns'
    static_configs:
      - targets: ['arcana-returns-api.fly.dev']
    metrics_path: '/metrics'
    scheme: 'https'
```

### Fly.io Monitoring

1. **Dashboard**: https://fly.io/dashboard
2. **Metrics**: Automatic CPU, memory, network
3. **Alerts**: Configure in dashboard

---

## Custom Domain (Optional)

### Add Custom Domain

```bash
# Add your domain
fly certs add api.yourdomain.com

# Follow DNS instructions (add CNAME or A record)
fly certs check api.yourdomain.com
```

Update DNS:
```
CNAME: api.yourdomain.com -> arcana-returns-api.fly.dev
```

---

## Troubleshooting

### App Won't Start

```bash
# Check logs
fly logs

# SSH and debug
fly ssh console
cd /app
node dist/server/index.js  # Run manually to see errors
```

### Database Issues

```bash
# Check volume
fly volumes list

# Check database file
fly ssh console
ls -lh /app/data/arcana.db

# Reinitialize if corrupted
cd /app/data
mv arcana.db arcana.db.old
cd /app
node dist/db/init.js
```

### Performance Issues

```bash
# Check metrics
fly status
fly checks list

# Scale up
fly scale vm shared-cpu-2x --memory 1024
fly scale count 2
```

### Out of Disk Space

```bash
# Check volume usage
fly ssh console -C "df -h /app/data"

# Resize volume
fly volumes extend <volume-id> --size 2
```

---

## Cost Optimization

### Free Tier
- **3 shared-cpu-1x VMs** (256MB RAM each)
- **3GB persistent storage**
- **160GB outbound transfer**

**Arcana API uses:**
- 1 VM (shared-cpu-1x, 512MB) = ~$2/month
- 1GB volume = $0.15/month
- **Total: ~$2.15/month** 💰

### Production Recommendations
- **2 VMs** for high availability: ~$4/month
- **2GB volume** for growth: ~$0.30/month
- **Total: ~$4.30/month** 🎯

**Way cheaper than Heroku ($25/month) or AWS!**

---

## Security Checklist

- [x] HTTPS enforced (automatic with Fly.io)
- [x] Secrets stored in Fly secrets (not in code)
- [ ] Set up IP allowlist if needed
- [ ] Configure firewall rules
- [ ] Enable 2FA on Fly.io account
- [ ] Rotate JWT secret regularly
- [ ] Monitor access logs

---

## Quick Reference

```bash
# Essential commands
fly status              # Check app status
fly logs               # View logs
fly ssh console        # SSH into machine
fly deploy             # Deploy new version
fly secrets set X=Y    # Set environment variable

# Maintenance
fly ssh console -C "cd /app && node dist/cli/index.js maintenance stats"

# Backup database
fly ssh sftp get /app/data/arcana.db ./backups/arcana-$(date +%Y%m%d).db

# Scale
fly scale count 2                              # High availability
fly scale vm shared-cpu-2x --memory 1024      # More power
```

---

## Success! 🎉

Your Arcana Returns API is now live on Fly.io!

**URL:** https://arcana-returns-api.fly.dev

**Next Steps:**
1. ✅ Test all endpoints
2. ✅ Generate API keys for merchants
3. ✅ Set up monitoring
4. ✅ Configure custom domain (optional)
5. ✅ Celebrate! 🚀

---

**Need Help?**
- Fly.io Docs: https://fly.io/docs
- Fly.io Community: https://community.fly.io
- Arcana Support: eng@arcana.dev
