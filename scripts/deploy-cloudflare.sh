#!/usr/bin/env bash

# ============================================================================
# AI Chat App - Cloudflare One-Click Deployment Script
# Domain: youshandebo.xx.kg -> Server: 107.173.101.155
# Ports: Backend 6555, Frontend 6556
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
GITHUB_REPO="https://github.com/youshandebo/ai-chat-app.git"
DOMAIN="${DOMAIN:-youshandebo.xx.kg}"
BACK_PORT="${BACK_PORT:-6555}"
FRONT_PORT="${FRONT_PORT:-6556}"
ADMIN_TOKEN="${ADMIN_TOKEN:-fnx081013fnx}"
GEMINI_API_KEY="${GEMINI_API_KEY:-}"

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════╗"
echo "║  🚀 AI Chat Cloudflare Deployment v1.0     ║"
echo "║  Domain: $DOMAIN                     ║"
echo "║  Backend: $BACK_PORT | Frontend: $FRONT_PORT              ║"
echo "╚══════════════════════════════════════════════╝"
echo -e "${NC}"

log_info() { echo -e "${BLUE}[i]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[!]${NC} $1"; }

# Step 1: Check/Install dependencies
log_info "Step 1: Checking system dependencies..."

install_node() {
    if command -v node >/dev/null 2>&1; then
        log_success "Node.js $(node -v) installed"
        return 0
    fi
    
    log_warn "Node.js not found, installing..."
    if command -v apt >/dev/null 2>&1; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt install -y nodejs
    elif command -v yum >/dev/null 2>&1; then
        curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
        sudo yum install -y nodejs
    else
        log_error "Unsupported OS. Please install Node.js manually."
        exit 1
    fi
    log_success "Node.js installed"
}

install_pm2() {
    if command -v pm2 >/dev/null 2>&1; then
        log_success "PM2 $(pm2 -v) installed"
        return 0
    fi
    
    log_warn "PM2 not found, installing..."
    npm install -g pm2 >/dev/null 2>&1
    log_success "PM2 installed"
}

install_node
install_pm2

# Step 2: Clone or update repo
log_info "Step 2: Setting up project..."

if [ -d "ai-chat-app" ]; then
    log_info "Directory exists, updating..."
    cd ai-chat-app
    git pull origin main 2>/dev/null || true
else
    log_info "Cloning from GitHub..."
    git clone "$GITHUB_REPO" ai-chat-app
    cd ai-chat-app
fi

ROOT_DIR=$(pwd)
log_success "Project directory: $ROOT_DIR"

# Step 3: Build backend
log_info "Step 3: Building backend..."
cd "$ROOT_DIR/backend"

npm install --legacy-peer-deps >/dev/null 2>&1
log_success "Backend dependencies installed"

# Create .env file with domain configuration
cat > .env << EOF
PORT=$BACK_PORT
CORS_ORIGIN=https://$DOMAIN
ADMIN_TOKEN=$ADMIN_TOKEN
RATE_LIMIT_PER_MINUTE=120
NODE_ENV=production
GEMINI_API_KEY=$GEMINI_API_KEY
EOF
log_success "Backend .env configured"

npm run build >/dev/null 2>&1
log_success "Backend built"

# Step 4: Build frontend
log_info "Step 4: Building frontend..."
cd "$ROOT_DIR/frontend"

npm install --legacy-peer-deps >/dev/null 2>&1
log_success "Frontend dependencies installed"

# Configure for Cloudflare HTTPS
cat > .env << EOF
VITE_BACKEND_BASE=https://$DOMAIN
VITE_ADMIN_TOKEN=$ADMIN_TOKEN
EOF
log_success "Frontend .env configured"

NODE_OPTIONS="--max-old-space-size=2048" npm run build >/dev/null 2>&1
log_success "Frontend built"

# Create Express server for SPA
cat > server.cjs << 'EOFJS'
const express = require('express');
const path = require('path');
const app = express();

app.use(express.static(path.join(__dirname, 'dist')));
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 6556;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Frontend] Running on http://0.0.0.0:${PORT}`);
});
EOFJS

npm install express >/dev/null 2>&1 || true

# Step 5: Start services with PM2
log_info "Step 5: Starting services..."

pm2 delete ai-chat-backend 2>/dev/null || true
pm2 delete ai-chat-frontend 2>/dev/null || true

cd "$ROOT_DIR/backend"
pm2 start dist/server.js --name ai-chat-backend \
    --env PORT=$BACK_PORT \
    --max-memory-restart 500M >/dev/null 2>&1

cd "$ROOT_DIR/frontend"
pm2 start server.cjs --name ai-chat-frontend \
    --env PORT=$FRONT_PORT \
    --max-memory-restart 300M >/dev/null 2>&1

pm2 save >/dev/null 2>&1
pm2 startup >/dev/null 2>&1 || true

log_success "Services started"

# Step 6: Verify
log_info "Step 6: Verifying deployment..."

sleep 3

if curl -s "http://localhost:$BACK_PORT/api/models" >/dev/null 2>&1; then
    log_success "Backend API responding"
else
    log_warn "Backend may still be starting..."
fi

if curl -s "http://localhost:$FRONT_PORT" >/dev/null 2>&1; then
    log_success "Frontend responding"
else
    log_warn "Frontend may still be starting..."
fi

# Done!
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✓ Deployment Complete!                      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Access URLs:${NC}"
echo -e "  Website:    ${GREEN}https://$DOMAIN${NC}"
echo -e "  Admin:      ${GREEN}https://$DOMAIN/admin${NC}"
echo ""
echo -e "${BLUE}Local URLs (for testing):${NC}"
echo -e "  Frontend:   ${GREEN}http://localhost:$FRONT_PORT${NC}"
echo -e "  Backend:    ${GREEN}http://localhost:$BACK_PORT${NC}"
echo ""
echo -e "${BLUE}Cloudflare Configuration:${NC}"
echo -e "  1. Add A record: ${GREEN}$DOMAIN -> 107.173.101.155${NC}"
echo -e "  2. Proxy status: ${GREEN}Proxied (orange cloud)${NC}"
echo -e "  3. SSL mode:     ${GREEN}Flexible or Full${NC}"
echo ""
echo -e "${BLUE}PM2 Commands:${NC}"
echo -e "  ${GREEN}pm2 list${NC}      - View processes"
echo -e "  ${GREEN}pm2 logs${NC}      - View logs"
echo -e "  ${GREEN}pm2 monit${NC}     - Real-time monitoring"
echo ""
