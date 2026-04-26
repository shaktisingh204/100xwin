#!/bin/bash

echo "🚀 Starting Automatic .env Generation..."

# ---------------------------------------------------------
# 1. newbackend/.env
# ---------------------------------------------------------
echo "📝 Generating newbackend/.env..."
cat << 'EOF' > newbackend/.env
# Server Configuration
PORT=9828
FRONTEND_URL="https://odd69.com"
NEXT_PUBLIC_API_URL="https://api.odd69.com"
ADMIN_API_TOKEN="odd69_admin_secure_token_here"

# Databases
DATABASE_URL="postgresql://100xwins:password123@localhost:5432/100xwins_db?schema=public"
MONGO_URI="mongodb://localhost:27017/zeero_originals"
REDIS_HOST="127.0.0.1"
REDIS_PORT="6379"
REDIS_PASSWORD=""
REDIS_DB="0"

# Authentication
JWT_SECRET="super_secure_jwt_secret"

# Clickhouse Analytics
CLICKHOUSE_URL="http://localhost:8123"
CLICKHOUSE_USER="default"
CLICKHOUSE_PASSWORD=""
CLICKHOUSE_DB="default"

# Turnkey / Diamond Sports API
SPORTS_BASE_URL="https://odd69.com"
SPORTS_API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
SPORTS_FEED_URLS=""
DIAMOND_API_URL="https://diamond-sports-api-d247-sky-exchange-betfair.p.rapidapi.com"
DIAMOND_API_HOST="diamond-sports-api-d247-sky-exchange-betfair.p.rapidapi.com"
DIAMOND_API_KEY=""

# Casino & Aggregators
CASINO_PARTNER_KEY_INR=""
CASINO_PARTNER_KEY_LKR=""

# Huidu Global Casino Integration
HUIDU_AGENCY_UID="ab72cfab44395f7063c6f0c0f05b2325"
HUIDU_AES_KEY="cf847d09b90ae11051a5f09769a96578"
HUIDU_PLAYER_PREFIX="h9f5c4"
HUIDU_BASE_URL="https://jsgame.live"

# Legacy MyZosh API (if still used)
MYZOSH_API_URL="https://staging.myzosh.com/api"
MYZOSH_AGENT_CODE="kuberexch"
MYZOSH_SECRET_KEY=""
MYZOSH_STATIC_TOKEN=""
EOF
echo "✅ newbackend/.env created successfully!"

# ---------------------------------------------------------
# 2. odd69.com/.env
# ---------------------------------------------------------
echo "📝 Generating odd69.com/.env..."
cat << 'EOF' > odd69.com/.env
# API Routing
NEXT_PUBLIC_API_PROXY_URL="http://127.0.0.1:9828"
API_URL="http://127.0.0.1:9828"
NEXT_PUBLIC_API_URL="http://127.0.0.1:9828/api"

# WebSockets
NEXT_PUBLIC_SOCKET_URL="ws://127.0.0.1:9828"
NEXT_PUBLIC_WS_URL="ws://127.0.0.1:9828"

# Admin overrides
NEXT_PUBLIC_ADMIN_API_TOKEN=""
EOF
echo "✅ odd69.com/.env created successfully!"

# ---------------------------------------------------------
# 3. newadmin/.env
# ---------------------------------------------------------
echo "📝 Generating newadmin/.env..."
cat << 'EOF' > newadmin/.env
# API Connectivity
NEXT_PUBLIC_API_URL="http://127.0.0.1:9828/api"
NEXT_PUBLIC_BACKEND_URL="http://127.0.0.1:9828/api"
NEXT_PUBLIC_API_PROXY_URL="http://127.0.0.1:9828"
NEXT_PUBLIC_WEBSITE_URL="https://odd69.com"

# Admin Security Tokens
NEXT_PUBLIC_ADMIN_API_TOKEN="odd69_admin_secure_token_here"
ADMIN_API_TOKEN="odd69_admin_secure_token_here"
ADMIN_SECRET_TOKEN="odd69_admin_secure_token_here"
JWT_SECRET="super_secure_jwt_secret"

# Direct DB Conn for Server Actions
MONGO_URI="mongodb://localhost:27017/zeero_originals"
REDIS_HOST="127.0.0.1"
REDIS_PORT="6379"

# Cloudflare Upload API Keys
CF_ACCOUNT_ID="ae6aabd73c9a3ddfb2f49419c0fbb69a"
CF_IMAGES_TOKEN="QOCM2u9NAgrdxVgaeCIQUYDnLKnuQoeKqjh5oMlU"
EOF
echo "✅ newadmin/.env created successfully!"

echo "\n🎉 All .env files generated!"
echo "Now simply run: npm install / npm run build inside those directories."
