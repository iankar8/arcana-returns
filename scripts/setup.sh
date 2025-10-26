#!/bin/bash
set -e

echo "🚀 Arcana Returns - Setup Script"
echo "================================"
echo ""

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "❌ Node.js 20+ required. Current version: $(node -v)"
  exit 1
fi
echo "✓ Node.js version: $(node -v)"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Generate keys if they don't exist
if [ ! -f "keys/private.pem" ]; then
  echo ""
  echo "🔐 Generating Ed25519 signing keys..."
  mkdir -p keys
  openssl genpkey -algorithm ed25519 -out keys/private.pem
  openssl pkey -in keys/private.pem -pubout -out keys/public.pem
  echo "✓ Keys generated in ./keys/"
else
  echo ""
  echo "✓ Signing keys already exist"
fi

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
  echo ""
  echo "📝 Creating .env file..."
  cp .env.example .env
  echo "✓ .env created - please edit with your configuration"
else
  echo ""
  echo "✓ .env file already exists"
fi

# Initialize database
echo ""
echo "🗄️  Initializing database..."
npm run db:migrate

# Create test API key
echo ""
echo "🔑 Creating test API key..."
npm run cli -- keys create --merchant merchant_test --name "Test Key" > /tmp/arcana_key.txt
cat /tmp/arcana_key.txt
echo ""
echo "⚠️  Save the API key above - it won't be shown again!"
echo ""

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Edit .env with your configuration"
echo "  2. Run 'npm run dev' to start the server"
echo "  3. Visit http://localhost:3000/health to verify"
echo ""
