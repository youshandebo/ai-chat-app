#!/usr/bin/env bash

# ============================================================================
# AI Chat App - One-Click Complete Deployment Script
# Function: Clone from GitHub -> Auto check environment -> Auto allocate ports -> Build -> Start -> Diagnose
# Usage: bash deploy.sh [install_dir] [BACK_PORT] [FRONT_PORT]
# Example: bash deploy.sh /opt/ai-chat 6555 6556
# ============================================================================

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
GITHUB_REPO="https://github.com/youshandebo/ai-chat-app.git"
INSTALL_DIR="${1:-.}"
BACK_PORT="${2:-}"
FRONT_PORT="${3:-}"
DOMAIN_ARG="${4:-}"
ADMIN_TOKEN="${ADMIN_TOKEN:-your_secure_token}"

# Print banner
print_banner() {
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════╗"
    echo "║   🚀 AI Chat One-Click Deploy v2.0    ║"
    echo "║   Clone → Check → Build → Start       ║"
    echo "╚════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Log functions
log_info() {
    echo -e "${BLUE}[i]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[!]${NC} $1"
}

log_step() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Determine project directory
determine_root_dir() {
    log_step "Step 1/8: Determine project directory"
    
    if [ -f "scripts/deploy.sh" ] && [ -d "backend" ] && [ -d "frontend" ]; then
        log_info "Detected existing project directory"
        ROOT_DIR=$(pwd)
        CLONE_NEEDED=false
    else
        log_info "Need to clone from GitHub"
        
        if [ -d "$INSTALL_DIR/ai-chat-app" ]; then
            log_warn "Directory exists: $INSTALL_DIR/ai-chat-app"
            ROOT_DIR="$INSTALL_DIR/ai-chat-app"
            CLONE_NEEDED=false
            
            # FORCE UPDATE existing directory
            log_info "Updating source code..."
            cd "$ROOT_DIR"
            git fetch --all
            git reset --hard origin/main
            cd ..
        else
            log_info "Clone project to: $INSTALL_DIR/ai-chat-app"
            mkdir -p "$INSTALL_DIR"
            cd "$INSTALL_DIR"
            
            if git clone "$GITHUB_REPO" ai-chat-app 2>&1 | tail -3; then
                ROOT_DIR="$INSTALL_DIR/ai-chat-app"
                CLONE_NEEDED=true
                log_success "Project cloned"
            else
                log_error "Unable to clone project"
                exit 1
            fi
        fi
    fi
    
    FRONT_DIR="$ROOT_DIR/frontend"
    BACK_DIR="$ROOT_DIR/backend"
    DATA_DIR="$BACK_DIR/data"
    
    log_success "Project directory: $ROOT_DIR"
    cd "$ROOT_DIR"
}

# Check environment
check_environment() {
    log_step "Step 2/8: Check system environment"
    
    local missing_deps=()
    
    if ! command -v node >/dev/null 2>&1; then
        missing_deps+=("Node.js")
    fi
    
    if ! command -v npm >/dev/null 2>&1; then
        missing_deps+=("npm")
    fi
    
    if ! command -v git >/dev/null 2>&1; then
        missing_deps+=("git")
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        log_error "Missing required components: ${missing_deps[*]}"
        exit 1
    fi
    
    log_success "Node.js $(node -v)"
    log_success "npm $(npm -v)"
    log_success "git $(git --version | awk '{print $3}')"
}

# Check and install PM2
check_pm2() {
    log_step "Step 3/8: Check PM2 process manager"
    
    if command -v pm2 >/dev/null 2>&1; then
        log_success "PM2 installed ($(pm2 -v))"
    else
        log_warn "PM2 not installed, installing..."
        if sudo npm install -g pm2 >/dev/null 2>&1; then
            log_success "PM2 installed"
        elif npm install -g pm2 >/dev/null 2>&1; then
            log_success "PM2 installed"
        else
            log_error "Unable to install PM2"
            exit 1
        fi
    fi
    
    pm2 update >/dev/null 2>&1 || true
}

# Port detection function
is_port_free() {
    local port=$1
    if command -v lsof >/dev/null 2>&1; then
        ! lsof -i :$port >/dev/null 2>&1
    elif command -v ss >/dev/null 2>&1; then
        ! ss -ltn | grep -q ":$port "
    elif command -v netstat >/dev/null 2>&1; then
        ! netstat -tln | grep -q ":$port "
    else
        return 0
    fi
}

# Auto allocate ports
allocate_ports() {
    log_step "Step 4/8: Allocate service ports"
    
    if [ -z "$BACK_PORT" ] || [ -z "$FRONT_PORT" ]; then
        log_info "Auto scanning available ports (starting from 6555)..."
        
        local p=6555
        local max_port=7000
        
        while [ $p -le $max_port ]; do
            local fp=$((p + 1))
            
            if is_port_free "$p" && is_port_free "$fp"; then
                BACK_PORT="${BACK_PORT:-$p}"
                FRONT_PORT="${FRONT_PORT:-$fp}"
                log_success "Found available port combination"
                break
            fi
            
            p=$((p + 1))
        done
        
        if [ -z "$BACK_PORT" ] || [ -z "$FRONT_PORT" ]; then
            log_error "Unable to find available ports"
            exit 1
        fi
    fi
    
    log_success "Backend port: $BACK_PORT"
    log_success "Frontend port: $FRONT_PORT"
}

# Build backend
build_backend() {
    log_step "Step 5/8: Build backend"
    
    cd "$BACK_DIR"
    log_info "Installing dependencies..."
    
    if npm install --legacy-peer-deps >/dev/null 2>&1; then
        log_success "Dependencies installed"
    else
        npm install
    fi
    
    log_info "Compiling TypeScript..."
    # Use increased memory for TypeScript compilation
    if NODE_OPTIONS="--max-old-space-size=1024" npm run build >/dev/null 2>&1; then
        log_success "Backend build complete"
    else
        log_error "Backend build failed"
        log_info "Check backend/.env configuration"
        exit 1
    fi
}

# Build frontend
build_frontend() {
    log_step "Step 6/8: Build frontend"
    
    cd "$FRONT_DIR"
    
    # FORCE CLEAN BUILD: Remove old artifacts and cache
    log_info "Cleaning old build artifacts and cache..."
    rm -rf dist node_modules/.vite
    
    log_info "Installing dependencies..."
    if npm install --legacy-peer-deps >/dev/null 2>&1; then
        log_success "Dependencies installed"
    else
        npm install
    fi
    
    # FIX: Ensure executables have permission to run
    if [ -d "node_modules/.bin" ]; then
        chmod -R +x node_modules/.bin
    fi
    
    # Detect public IP for frontend API configuration
    local BACKEND_URL="http://localhost:$BACK_PORT"
    if [ -n "$BACKEND_HOST" ]; then
        BACKEND_URL="http://$BACKEND_HOST:$BACK_PORT"
    elif command -v curl >/dev/null 2>&1; then
        local PUBLIC_IP=$(curl -s https://api.ipify.org 2>/dev/null || echo "")
        if [ -n "$PUBLIC_IP" ]; then
            BACKEND_URL="http://$PUBLIC_IP:$BACK_PORT"
        fi
    fi
    
    log_info "Configure environment variables..."
    log_info "Backend URL: $BACKEND_URL"
    cat > .env << EOF
VITE_BACKEND_BASE=$BACKEND_URL
VITE_ADMIN_TOKEN=$ADMIN_TOKEN
EOF
    
    log_info "Build static files..."
    # Increase Node memory limit for builds and SHOW OUTPUT
    if NODE_OPTIONS="--max-old-space-size=4096" npm run build; then
        log_success "Frontend build complete"
        
        # VERIFICATION: Print proof of files
        log_info "Verifying build artifacts:"
        if [ -f "dist/ads.txt" ]; then
            log_success "ads.txt found! Content:"
            cat dist/ads.txt
            echo ""
        else
            log_error "ads.txt NOT found in dist!"
        fi
        
    else
        log_warn "Frontend build failed, retrying with even more memory..."
        if NODE_OPTIONS="--max-old-space-size=6144" npm run build; then
            log_success "Frontend build complete (with increased memory)"
             # VERIFICATION
            if [ -f "dist/ads.txt" ]; then
                log_success "ads.txt found! Content:"
                cat dist/ads.txt
                echo ""
            fi
        else
            log_error "Frontend build failed even with increased memory. Output shown above."
            log_info "Trying alternative build strategy (no minification)..."
            # Try building without minification as last resort
            cat > vite.config.ts.bak << 'EOF_VITE'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    minify: false,
    sourcemap: false,
  }
})
EOF_VITE
            if NODE_OPTIONS="--max-old-space-size=4096" npm run build; then
                log_success "Frontend build complete (with minimal optimization)"
            else
                log_error "Frontend build failed after multiple attempts"
                exit 1
            fi
        fi
    fi
}

# Setup environment
setup_environment() {
    log_step "Step 7/8: Configure runtime environment"
    
    mkdir -p "$DATA_DIR"
    log_info "Data directory: $DATA_DIR"
    
    cd "$BACK_DIR"
    log_info "Configuring backend..."
    cat > .env << EOF
PORT=$BACK_PORT
CORS_ORIGIN=*
ADMIN_TOKEN=$ADMIN_TOKEN
RATE_LIMIT_PER_MINUTE=120
NODE_ENV=production
EOF
    
    cd "$FRONT_DIR"
    log_info "Configure frontend Express server..."
    
    # Ensure server.cjs exists
    if [ ! -f "server.cjs" ]; then
        log_error "server.cjs not found in frontend directory!"
        exit 1
    fi

    log_info "Using existing server.cjs content:"
    cat server.cjs
    
    log_success "Environment configured"
}

# Start services
start_services() {
    log_step "Step 8/8: Start services"
    
    local BACK_NAME="ai-chat-backend-$BACK_PORT"
    local FRONT_NAME="ai-chat-frontend-$FRONT_PORT"
    
    # Delete OLD legacy processes if they exist
    pm2 delete backend 2>/dev/null || true
    pm2 delete ai-chat-frontend 2>/dev/null || true
    pm2 delete ai-chat-backend 2>/dev/null || true
    
    # Delete current version processes
    pm2 delete "$BACK_NAME" 2>/dev/null || true
    pm2 delete "$FRONT_NAME" 2>/dev/null || true
    
    # Force kill any remaining processes on these ports to avoid EADDRINUSE
    kill_port_process $BACK_PORT
    kill_port_process $FRONT_PORT
    
    sleep 2
    
    log_info "Starting backend service..."
    cd "$BACK_DIR"
    
    if pm2 start dist/server.js \
        --name "$BACK_NAME" \
        --env PORT=$BACK_PORT,CORS_ORIGIN='*',NODE_ENV=production,NODE_OPTIONS='--max-old-space-size=1024' \
        --merge-logs \
        --max-memory-restart 500M \
        >/dev/null 2>&1; then
        log_success "Backend started"
    else
        log_error "Backend startup failed"
        exit 1
    fi
    
    log_info "Starting frontend service..."
    cd "$FRONT_DIR"
    
    if pm2 start server.cjs \
        --name "$FRONT_NAME" \
        --env PORT=$FRONT_PORT \
        --merge-logs \
        --max-memory-restart 300M \
        >/dev/null 2>&1; then
        log_success "Frontend started"
    else
        log_error "Frontend startup failed"
        exit 1
    fi
    
    pm2 save >/dev/null 2>&1 || true
    pm2 startup >/dev/null 2>&1 || true
}

# Wait and health check
wait_and_health_check() {
    log_step "Wait for services to start"
    
    local timeout=30
    local elapsed=0
    
    log_info "Checking backend health..."
    while [ $elapsed -lt $timeout ]; do
        if curl -s "http://localhost:$BACK_PORT/api/admin/health" \
            -H "Authorization: Bearer $ADMIN_TOKEN" 2>/dev/null | grep -q "modelsCount"; then
            log_success "Backend health check passed"
            break
        fi
        elapsed=$((elapsed + 1))
        sleep 1
    done
    
    if [ $elapsed -ge $timeout ]; then
        log_warn "Backend startup is slow"
    fi
    
    log_info "Checking frontend..."
    elapsed=0
    while [ $elapsed -lt $timeout ]; do
        local http_code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$FRONT_PORT" 2>/dev/null || echo "000")
        if [ "$http_code" = "200" ]; then
            log_success "Frontend health check passed"
            break
        fi
        elapsed=$((elapsed + 1))
        sleep 1
    done
    
    if [ $elapsed -ge $timeout ]; then
        log_warn "Frontend startup is slow"
    fi
}

# Update Nginx Configuration
update_nginx_config() {
    log_step "Step 9/9: Update Nginx Configuration"

    if [ -d "/etc/nginx/sites-available" ]; then
        log_info "Detected Nginx installation, updating configuration..."
        
        # Determine SERVER_NAME
        if [ -n "$DOMAIN_ARG" ]; then
            SERVER_NAME="$DOMAIN_ARG"
            log_info "Using provided domain: $SERVER_NAME"
        else
            # Try to auto-detect
            SERVER_NAME="localhost"
            # Extract server_name, remove 'server_name', remove ';', remove whitespace
            possible_domains=$(grep -r "server_name" /etc/nginx/sites-enabled/ 2>/dev/null | sed 's/server_name//g' | sed 's/;//g' | xargs -n1 | grep -v "_" | grep -v "localhost" | sort | uniq | head -n 1)
            
            if [ -n "$possible_domains" ]; then
                SERVER_NAME="$possible_domains"
                log_info "Detected existing domain: $SERVER_NAME"
            else
                log_warn "Could not detect domain, defaulting to: $SERVER_NAME"
                log_info "To use a custom domain, run: bash deploy.sh <dir> <back_port> <front_port> <domain>"
            fi
        fi

        # AGGRESSIVE CLEANUP: Remove conflicting configs
        log_info "Cleaning up conflicting Nginx configurations..."
        if [ -f "/etc/nginx/sites-enabled/default" ]; then
            log_warn "Disabling default Nginx config to prevent conflicts"
            rm -f /etc/nginx/sites-enabled/default
        fi
        
        # Disable any OTHER config that uses this domain (except our own)
        if [ "$SERVER_NAME" != "localhost" ]; then
             grep -l "$SERVER_NAME" /etc/nginx/sites-enabled/* 2>/dev/null | while read -r conflict_file; do
                if [ "$(basename "$conflict_file")" != "ai-chat" ]; then
                    log_warn "Found conflicting config: $conflict_file. Disabling it..."
                    mv "$conflict_file" "${conflict_file}.disabled_by_ai_chat"
                fi
            done
        fi

        CONFIG_FILE="/etc/nginx/sites-available/ai-chat"
        
        # Backup existing config
        if [ -f "$CONFIG_FILE" ]; then
            cp "$CONFIG_FILE" "${CONFIG_FILE}.bak_$(date +%s)"
            log_info "Backed up existing Nginx config"
        fi

        # Write new config with PROPERLY ESCAPED VARIABLES
        # We use \ to escape $ so it's written literally to the file for Nginx to use
        sudo bash -c "cat > $CONFIG_FILE << EOF
server {
    listen 80;
    server_name $SERVER_NAME;

    # Frontend Proxy (WebSocket support)
    location / {
        proxy_pass http://127.0.0.1:$FRONT_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\\$host;
        proxy_cache_bypass \\\$http_upgrade;
    }

    # Backend API Proxy
    location /api {
        proxy_pass http://127.0.0.1:$BACK_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
    }
}
EOF"
        
        # DEBUG: Print the generated config
        log_info "Generated Nginx Config:"
        cat "$CONFIG_FILE"
        echo ""

        # Check syntax before linking
        if sudo nginx -t -c /etc/nginx/nginx.conf; then
             # Enable site if not enabled
            if [ ! -L "/etc/nginx/sites-enabled/ai-chat" ]; then
                sudo ln -s "$CONFIG_FILE" /etc/nginx/sites-enabled/ai-chat
                log_success "Enabled Nginx site"
            fi
            
            # FORCE RESTART nginx to apply changes immediately
            if sudo systemctl restart nginx; then
                log_success "Nginx restarted successfully"
            else
                log_error "Failed to restart Nginx"
                exit 1
            fi
        else
            log_error "Nginx configuration syntax invalid, restoring backup..."
            if [ -f "${CONFIG_FILE}.bak_*" ]; then
                # Find latest backup
                LATEST_BACKUP=$(ls -t ${CONFIG_FILE}.bak_* | head -n1)
                if [ -n "$LATEST_BACKUP" ]; then
                    cp "$LATEST_BACKUP" "$CONFIG_FILE"
                    sudo systemctl restart nginx
                fi
            fi
            exit 1
        fi
    else
        log_info "Nginx not detected, skipping configuration update"
    fi
}

# Kill processes on specific ports
kill_port_process() {
    local port=$1
    log_info "Checking port $port..."
    
    # Try using lsof
    if command -v lsof >/dev/null 2>&1; then
        local pid=$(lsof -t -i:$port)
        if [ -n "$pid" ]; then
            log_warn "Killing process $pid on port $port"
            kill -9 $pid 2>/dev/null || true
        fi
    # Fallback to netstat/ss
    elif command -v netstat >/dev/null 2>&1; then
        local pid=$(netstat -nlp | grep ":$port " | awk '{print $7}' | cut -d'/' -f1)
        if [ -n "$pid" ] && [ "$pid" != "-" ]; then
             log_warn "Killing process $pid on port $port"
             kill -9 $pid 2>/dev/null || true
        fi
    else 
        # Last resort: PM2 check
        # This is handled in start_services but extra safety here
        true
    fi
}

# Show completion info
show_completion_info() {
    log_step "Deployment complete"
    
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║ ✓ AI Chat deployed and started!       ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
    echo ""
    
    echo -e "${BLUE}📍 Access URLs:${NC}"
    echo -e "   Frontend App:   ${GREEN}http://localhost:$FRONT_PORT${NC}"
    echo -e "   Backend API:    ${GREEN}http://localhost:$BACK_PORT${NC}"
    echo -e "   Admin Panel:    ${GREEN}http://localhost:$FRONT_PORT/admin${NC}"
    echo ""
    
    echo -e "${BLUE}🔑 Authentication:${NC}"
    echo -e "   Admin Token: ${GREEN}$ADMIN_TOKEN${NC}"
    echo ""
    
    echo -e "${BLUE}📂 Project Directory:${NC}"
    echo -e "   ${GREEN}$ROOT_DIR${NC}"
    echo ""
    
    echo -e "${BLUE}⚙️  PM2 Process:${NC}"
    pm2 list --nostream 2>/dev/null | grep "ai-chat" || pm2 list
    echo ""
    
    echo -e "${BLUE}📝 Common Commands:${NC}"
    echo -e "   ${GREEN}pm2 log${NC}                      # View all logs"
    echo -e "   ${GREEN}pm2 list${NC}                     # View process list"
    echo -e "   ${GREEN}pm2 monit${NC}                    # Real-time monitoring"
    echo -e "   ${GREEN}bash scripts/diagnose.sh${NC}     # Run diagnostics"
    echo -e "   ${GREEN}bash scripts/stop.sh${NC}         # Stop all services"
    echo ""
}

# Main function
main() {
    print_banner
    
    trap 'log_error "Deployment failed!"; exit 1' ERR
    
    determine_root_dir
    check_environment
    check_pm2
    allocate_ports
    build_backend
    build_frontend
    setup_environment
    start_services
    wait_and_health_check
    update_nginx_config
    show_completion_info
}

main "$@"

