#!/bin/bash

# Quick fix script to update all API URLs in Mintlify docs

echo "🔧 Fixing API URLs in Mintlify docs..."

# Fix production URL
find . -type f \( -name "*.mdx" -o -name "*.yaml" -o -name "*.md" \) -exec sed -i '' 's|https://api\.arcana\.returns|https://arcana-returns-api.fly.dev|g' {} +

# Fix sandbox URL  
find . -type f \( -name "*.mdx" -o -name "*.yaml" -o -name "*.md" \) -exec sed -i '' 's|https://sandbox-api\.arcana\.returns|https://arcana-returns-api.fly.dev|g' {} +

echo "✅ URLs updated!"
echo ""
echo "Updated in files:"
grep -r "arcana-returns-api.fly.dev" . --include="*.mdx" --include="*.yaml" --include="*.md" -l

echo ""
echo "⚠️  Review changes before committing:"
echo "   git diff"
