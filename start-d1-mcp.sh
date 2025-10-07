#!/bin/bash
echo "🗄️  Starting D1 Database MCP Server..."

if [ ! -f .env ]; then
    echo "⚠️  Creating .env from template..."
    cp .env.example .env
    echo "📝 Please edit .env with your Cloudflare credentials:"
    echo "   CLOUDFLARE_ACCOUNT_ID=your-account-id"
    echo "   CLOUDFLARE_API_TOKEN=your-api-token"
    echo "   D1_DEV_DATABASE_ID=your-database-id"
    exit 1
fi

set -a; source .env; set +a

if [ -z "$CLOUDFLARE_ACCOUNT_ID" ] || [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo "❌ Please configure .env file with Cloudflare credentials"
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

if [ ! -d "dist" ] || [ "src/index.ts" -nt "dist/index.js" ]; then
    echo "🔨 Building MCP server..."
    npm run build
fi

echo "✅ Starting D1 Database MCP Server"
npm start
