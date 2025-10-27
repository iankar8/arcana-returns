#!/bin/bash

# Arcana Returns - Pilot Onboarding Script
# Automates merchant setup, policy import, and validation

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-http://localhost:3000}"
NODE_BIN="${NODE_BIN:-/opt/homebrew/opt/node@20/bin}"
export PATH="$NODE_BIN:$PATH"

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Arcana Returns - Pilot Onboarding       ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo ""

# Check arguments
if [ "$#" -lt 2 ]; then
    echo -e "${RED}Usage: $0 <merchant_id> <policy_source> [policy_url]${NC}"
    echo ""
    echo "Examples:"
    echo "  $0 merchant_nordstrom text"
    echo "  $0 merchant_zappos url https://zappos.com/returns"
    echo ""
    exit 1
fi

MERCHANT_ID=$1
POLICY_SOURCE=$2
POLICY_URL=$3

echo -e "${YELLOW}Merchant ID:${NC} $MERCHANT_ID"
echo -e "${YELLOW}Policy Source:${NC} $POLICY_SOURCE"
if [ -n "$POLICY_URL" ]; then
    echo -e "${YELLOW}Policy URL:${NC} $POLICY_URL"
fi
echo ""

# Step 1: Create API Key
echo -e "${BLUE}[1/6]${NC} Creating API key..."
API_KEY_OUTPUT=$(npm run cli -- keys create --merchant "$MERCHANT_ID" --name "Pilot Key" 2>&1 | grep "API Key:" | awk '{print $3}')

if [ -z "$API_KEY_OUTPUT" ]; then
    echo -e "${RED}✗ Failed to create API key${NC}"
    exit 1
fi

API_KEY=$API_KEY_OUTPUT
echo -e "${GREEN}✓ API Key created${NC}"
echo -e "${YELLOW}  Key:${NC} $API_KEY"
echo ""

# Save API key to file
mkdir -p ./data/pilots
echo "$API_KEY" > "./data/pilots/${MERCHANT_ID}_api_key.txt"
echo -e "${GREEN}✓ API key saved to ./data/pilots/${MERCHANT_ID}_api_key.txt${NC}"
echo ""

# Step 2: Import Policy
echo -e "${BLUE}[2/6]${NC} Importing return policy..."

if [ "$POLICY_SOURCE" = "text" ]; then
    # Prompt for policy text
    echo -e "${YELLOW}Enter return policy text (press Ctrl+D when done):${NC}"
    POLICY_TEXT=$(cat)
    
    POLICY_RESPONSE=$(curl -s -X POST "$API_URL/policy/import" \
        -H "Authorization: Bearer $API_KEY" \
        -H "Content-Type: application/json" \
        -d "{
            \"source_type\": \"text\",
            \"source_content\": $(echo "$POLICY_TEXT" | jq -Rs .),
            \"merchant_id\": \"$MERCHANT_ID\"
        }")
elif [ "$POLICY_SOURCE" = "url" ]; then
    if [ -z "$POLICY_URL" ]; then
        echo -e "${RED}✗ Policy URL required for url source${NC}"
        exit 1
    fi
    
    POLICY_RESPONSE=$(curl -s -X POST "$API_URL/policy/import" \
        -H "Authorization: Bearer $API_KEY" \
        -H "Content-Type: application/json" \
        -d "{
            \"source_type\": \"url\",
            \"source_url\": \"$POLICY_URL\",
            \"merchant_id\": \"$MERCHANT_ID\"
        }")
else
    echo -e "${RED}✗ Invalid policy source. Use 'text' or 'url'${NC}"
    exit 1
fi

POLICY_ID=$(echo "$POLICY_RESPONSE" | jq -r '.policy_id // empty')

if [ -z "$POLICY_ID" ]; then
    echo -e "${RED}✗ Failed to import policy${NC}"
    echo "$POLICY_RESPONSE" | jq .
    exit 1
fi

echo -e "${GREEN}✓ Policy imported${NC}"
echo -e "${YELLOW}  Policy ID:${NC} $POLICY_ID"
echo ""

# Save policy info
echo "$POLICY_RESPONSE" > "./data/pilots/${MERCHANT_ID}_policy.json"

# Step 3: Test Return Token Issuance
echo -e "${BLUE}[3/6]${NC} Testing return token issuance..."

TOKEN_RESPONSE=$(curl -s -X POST "$API_URL/returns/token" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d "{
        \"order_id\": \"test_order_001\",
        \"customer_ref\": \"test_customer_001\",
        \"items\": [{
            \"sku\": \"TEST-SKU-001\",
            \"qty\": 1,
            \"price_cents\": 2999,
            \"name\": \"Test Product\"
        }],
        \"reason_code\": \"doesnt_fit\",
        \"policy_id\": \"$POLICY_ID\"
    }")

RETURN_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.return_token // empty')
TRACE_ID=$(echo "$TOKEN_RESPONSE" | jq -r '.trace_id // empty')

if [ -z "$RETURN_TOKEN" ]; then
    echo -e "${RED}✗ Failed to issue return token${NC}"
    echo "$TOKEN_RESPONSE" | jq .
    exit 1
fi

echo -e "${GREEN}✓ Return token issued${NC}"
echo -e "${YELLOW}  Trace ID:${NC} $TRACE_ID"
echo ""

# Step 4: Test Authorization
echo -e "${BLUE}[4/6]${NC} Testing return authorization..."

AUTH_RESPONSE=$(curl -s -X POST "$API_URL/returns/authorize" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d "{
        \"return_token\": \"$RETURN_TOKEN\",
        \"evidence\": [{
            \"type\": \"photo_packaging\",
            \"url\": \"https://example.com/test-photo.jpg\"
        }],
        \"dropoff_choice\": \"mail_in\"
    }")

DECISION=$(echo "$AUTH_RESPONSE" | jq -r '.decision // empty')

if [ -z "$DECISION" ]; then
    echo -e "${RED}✗ Failed to authorize return${NC}"
    echo "$AUTH_RESPONSE" | jq .
    exit 1
fi

echo -e "${GREEN}✓ Return authorized${NC}"
echo -e "${YELLOW}  Decision:${NC} $DECISION"
echo ""

# Step 5: Test Commit
echo -e "${BLUE}[5/6]${NC} Testing return commit..."

COMMIT_RESPONSE=$(curl -s -X POST "$API_URL/returns/commit" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d "{
        \"return_token\": \"$RETURN_TOKEN\",
        \"receipt_event\": {
            \"type\": \"scan\",
            \"carrier\": \"UPS\",
            \"ts\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"
        }
    }")

REFUND_INSTRUCTION=$(echo "$COMMIT_RESPONSE" | jq -r '.refund_instruction // empty')

if [ -z "$REFUND_INSTRUCTION" ]; then
    echo -e "${RED}✗ Failed to commit return${NC}"
    echo "$COMMIT_RESPONSE" | jq .
    exit 1
fi

echo -e "${GREEN}✓ Return committed${NC}"
echo -e "${YELLOW}  Refund:${NC} $REFUND_INSTRUCTION"
echo ""

# Step 6: Generate Onboarding Report
echo -e "${BLUE}[6/6]${NC} Generating onboarding report..."

REPORT_FILE="./data/pilots/${MERCHANT_ID}_onboarding_report.md"

cat > "$REPORT_FILE" << EOF
# Pilot Onboarding Report

**Merchant:** $MERCHANT_ID  
**Date:** $(date)  
**Status:** ✅ Complete

## Configuration

- **API Key:** \`$API_KEY\`
- **Policy ID:** \`$POLICY_ID\`
- **API URL:** $API_URL

## Test Results

### ✅ Return Token Issuance
- **Trace ID:** $TRACE_ID
- **Risk Score:** $(echo "$TOKEN_RESPONSE" | jq -r '.risk_score')
- **Required Evidence:** $(echo "$TOKEN_RESPONSE" | jq -r '.required_evidence | join(", ")')

### ✅ Authorization
- **Decision:** $DECISION
- **Explanations:** $(echo "$AUTH_RESPONSE" | jq -r '.explanations | join(", ")')

### ✅ Commit
- **Refund Instruction:** $REFUND_INSTRUCTION

## Next Steps

1. **Integration Testing**
   - Set up Shopify webhook forwarding (if applicable)
   - Configure Stripe metadata contract
   - Test with real orders

2. **Monitoring**
   - View metrics: \`curl $API_URL/metrics/merchant/$MERCHANT_ID -H "Authorization: Bearer $API_KEY"\`
   - Check health: \`curl $API_URL/metrics/health\`

3. **CLI Commands**
   \`\`\`bash
   # View recent decisions
   npm run cli -- returns list --merchant $MERCHANT_ID
   
   # Simulate a return
   npm run cli -- returns simulate --order ord_001 --sku TEST --reason doesnt_fit --merchant $MERCHANT_ID --policy $POLICY_ID
   
   # Export replay bundle
   npm run cli -- replay export --decision <decision_id> --out replay.json
   \`\`\`

## Support

For issues or questions, check:
- API logs: \`npm run dev\` output
- Database: \`./data/arcana.db\`
- Documentation: \`./docs/\`

---
Generated by Arcana Returns Pilot Onboarding Script
EOF

echo -e "${GREEN}✓ Report generated: $REPORT_FILE${NC}"
echo ""

# Summary
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         Onboarding Complete! ✅            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Summary:${NC}"
echo -e "  • Merchant ID: ${GREEN}$MERCHANT_ID${NC}"
echo -e "  • API Key: ${GREEN}$API_KEY${NC}"
echo -e "  • Policy ID: ${GREEN}$POLICY_ID${NC}"
echo -e "  • Test Trace: ${GREEN}$TRACE_ID${NC}"
echo ""
echo -e "${YELLOW}Files Created:${NC}"
echo -e "  • ./data/pilots/${MERCHANT_ID}_api_key.txt"
echo -e "  • ./data/pilots/${MERCHANT_ID}_policy.json"
echo -e "  • ./data/pilots/${MERCHANT_ID}_onboarding_report.md"
echo ""
echo -e "${BLUE}Next: Review the onboarding report and begin integration testing${NC}"
echo ""
