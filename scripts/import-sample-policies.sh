#!/bin/bash

# Import Sample Policies Script
# Imports real merchant policies for testing

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

API_URL="${API_URL:-http://localhost:3000}"
NODE_BIN="${NODE_BIN:-/opt/homebrew/opt/node@20/bin}"
export PATH="$NODE_BIN:$PATH"

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Importing Sample Merchant Policies      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

# Check if API key provided
if [ -z "$1" ]; then
    echo -e "${YELLOW}Usage: $0 <api_key>${NC}"
    echo ""
    echo "Example:"
    echo "  $0 sk_8d93d0d571b5b56c1162b1281552d1da6549f4c0e8a5e18cb4af460e500b963a"
    echo ""
    exit 1
fi

API_KEY=$1

# Read policies from JSON
POLICIES_FILE="./examples/sample-policies.json"

if [ ! -f "$POLICIES_FILE" ]; then
    echo -e "${RED}✗ Policies file not found: $POLICIES_FILE${NC}"
    exit 1
fi

# Import each policy
echo -e "${BLUE}Importing policies...${NC}"
echo ""

POLICY_COUNT=$(jq '.policies | length' "$POLICIES_FILE")

for i in $(seq 0 $(($POLICY_COUNT - 1))); do
    MERCHANT_ID=$(jq -r ".policies[$i].merchant_id" "$POLICIES_FILE")
    MERCHANT_NAME=$(jq -r ".policies[$i].merchant_name" "$POLICIES_FILE")
    POLICY_TEXT=$(jq -r ".policies[$i].policy_text" "$POLICIES_FILE")
    
    echo -e "${YELLOW}[$((i+1))/$POLICY_COUNT]${NC} Importing ${BLUE}$MERCHANT_NAME${NC}..."
    
    # Create API key for merchant
    echo -e "  Creating API key..."
    KEY_OUTPUT=$(npm run cli -- keys create --merchant "$MERCHANT_ID" --name "$MERCHANT_NAME Key" 2>&1 | grep "API Key:" | awk '{print $3}')
    
    if [ -z "$KEY_OUTPUT" ]; then
        echo -e "  Using provided API key..."
        MERCHANT_KEY=$API_KEY
    else
        MERCHANT_KEY=$KEY_OUTPUT
        echo -e "  ${GREEN}✓${NC} Key: $MERCHANT_KEY"
    fi
    
    # Import policy
    RESPONSE=$(curl -s -X POST "$API_URL/policy/import" \
        -H "Authorization: Bearer $MERCHANT_KEY" \
        -H "Content-Type: application/json" \
        -d "{
            \"source_type\": \"text\",
            \"source_content\": $(echo "$POLICY_TEXT" | jq -Rs .),
            \"merchant_id\": \"$MERCHANT_ID\"
        }")
    
    POLICY_ID=$(echo "$RESPONSE" | jq -r '.policy_id // empty')
    
    if [ -z "$POLICY_ID" ]; then
        echo -e "  ${RED}✗ Failed to import${NC}"
        echo "$RESPONSE" | jq .
    else
        RETURN_WINDOW=$(echo "$RESPONSE" | jq -r '.policy.return_window_days')
        RESTOCK_FEE=$(echo "$RESPONSE" | jq -r '.policy.restock_fee_pct')
        
        echo -e "  ${GREEN}✓${NC} Policy ID: $POLICY_ID"
        echo -e "  ${GREEN}✓${NC} Return window: ${RETURN_WINDOW} days"
        echo -e "  ${GREEN}✓${NC} Restock fee: ${RESTOCK_FEE}%"
    fi
    
    echo ""
done

echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         Import Complete! ✅                ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Imported $POLICY_COUNT policies${NC}"
echo ""
echo -e "${BLUE}View policies in database:${NC}"
echo "  sqlite3 ./data/arcana.db \"SELECT merchant_id, policy_id, return_window_days, restock_fee_pct FROM policy_snapshots\""
echo ""
echo -e "${BLUE}Test a return:${NC}"
echo "  npm run cli -- returns simulate --order ord_001 --sku TEST --reason doesnt_fit --merchant merchant_amazon"
echo ""
