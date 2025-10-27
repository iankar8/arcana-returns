#!/bin/bash
# Daily health check - run via cron or manually

API_URL="https://arcana-returns-api.fly.dev"

echo "=== Arcana Returns Health Check ==="
echo "Date: $(date)"
echo ""

# 1. Basic health
echo "Checking /health..."
HEALTH=$(curl -s $API_URL/health)
echo "$HEALTH"
echo ""

# 2. Detailed health
echo "Checking /health/detailed..."
DETAILED=$(curl -s $API_URL/health/detailed)
echo "$DETAILED" | jq '.' 2>/dev/null || echo "$DETAILED"
echo ""

# 3. Check if it's actually working
STATUS=$(echo $HEALTH | jq -r '.status' 2>/dev/null)
if [ "$STATUS" != "ok" ]; then
    echo "⚠️  ALERT: Health check failed!"
    echo "Status: $STATUS"
    exit 1
fi

echo "✅ All checks passed!"
echo "=== Check Complete ==="
