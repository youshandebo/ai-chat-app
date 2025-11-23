#!/usr/bin/env bash

# ============================================================================
# Recovery Script - Fix Frontend Build Failure
# 用于修复前端构建失败的问题
# 使用方法: bash fix-frontend-build.sh
# ============================================================================

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

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

# Find project directory
find_project_dir() {
    log_step "Step 1: Find project directory"
    
    # Try common locations
    for dir in /opt/ai-chat/ai-chat-app /opt/ai-chat-app /root/ai-chat-app ~/ai-chat-app ./ai-chat-app .; do
        if [ -d "$dir" ] && [ -f "$dir/frontend/package.json" ]; then
            PROJECT_DIR="$dir"
            log_success "Found project: $PROJECT_DIR"
            return 0
        fi
    done
    
    log_error "Project directory not found"
    log_info "Please specify project directory:"
    log_info "  bash fix-frontend-build.sh /path/to/ai-chat-app"
    exit 1
}

# Check system resources
check_resources() {
    log_step "Step 2: Check system resources"
    
    local memory=$(free -m | awk 'NR==2 {print $7}')
    local disk=$(df "$PROJECT_DIR" | awk 'NR==2 {print $4}')
    
    log_info "Available memory: ${memory}MB"
    log_info "Available disk: ${disk}KB"
    
    if [ "$memory" -lt 500 ]; then
        log_warn "Low memory (${memory}MB), may cause build failures"
        log_info "Consider increasing swap or available memory"
    fi
    
    if [ "$disk" -lt 500000 ]; then
        log_warn "Low disk space (${disk}KB)"
    fi
}

# Clean previous builds
clean_builds() {
    log_step "Step 3: Clean previous builds"
    
    cd "$PROJECT_DIR"
    
    log_info "Cleaning node_modules and cache..."
    rm -rf frontend/node_modules
    rm -rf frontend/dist
    rm -rf frontend/.cache
    
    log_info "Cleaning npm cache..."
    npm cache clean --force >/dev/null 2>&1 || true
    
    log_success "Cleanup complete"
}

# Clear swap
optimize_system() {
    log_step "Step 4: Optimize system for build"
    
    log_info "Syncing filesystem..."
    sync >/dev/null 2>&1 || true
    
    log_info "Clearing caches..."
    echo 1 | tee /proc/sys/vm/drop_caches >/dev/null 2>&1 || true
    
    log_success "System optimized"
}

# Rebuild frontend
rebuild_frontend() {
    log_step "Step 5: Rebuild frontend"
    
    cd "$PROJECT_DIR/frontend"
    
    log_info "Installing dependencies (this may take a few minutes)..."
    if npm install --legacy-peer-deps >/dev/null 2>&1; then
        log_success "Dependencies installed"
    else
        log_error "Dependency installation failed"
        exit 1
    fi
    
    log_info "Building with increased memory (2048MB)..."
    if NODE_OPTIONS="--max-old-space-size=2048" npm run build; then
        log_success "Frontend build complete!"
        return 0
    fi
    
    log_warn "Build with 2048MB failed, trying 3072MB..."
    if NODE_OPTIONS="--max-old-space-size=3072" npm run build; then
        log_success "Frontend build complete with 3072MB!"
        return 0
    fi
    
    log_warn "Standard build failed, trying without minification..."
    if [ -f "vite.config.ts" ]; then
        # Create minimal config
        cat > vite.config.ts << 'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    minify: false,
    sourcemap: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 5000,
  }
})
EOF
        
        if NODE_OPTIONS="--max-old-space-size=1024" npm run build; then
            log_success "Frontend build complete without minification!"
            return 0
        fi
    fi
    
    log_error "All build attempts failed"
    return 1
}

# Restart services
restart_services() {
    log_step "Step 6: Restart services"
    
    if command -v pm2 >/dev/null 2>&1; then
        log_info "Restarting PM2 services..."
        pm2 restart all >/dev/null 2>&1 || true
        log_success "Services restarted"
    else
        log_warn "PM2 not found, skipping service restart"
    fi
}

# Verify build
verify_build() {
    log_step "Step 7: Verify build"
    
    if [ -f "$PROJECT_DIR/frontend/dist/index.html" ]; then
        local size=$(du -sh "$PROJECT_DIR/frontend/dist" | awk '{print $1}')
        log_success "Frontend dist folder created ($size)"
        
        if [ -d "$PROJECT_DIR/frontend/dist" ]; then
            local files=$(find "$PROJECT_DIR/frontend/dist" -type f | wc -l)
            log_success "Build contains $files files"
        fi
        
        return 0
    else
        log_error "Frontend dist folder not found"
        return 1
    fi
}

# Main execution
main() {
    log_info "AI Chat App - Frontend Build Recovery Tool"
    echo ""
    
    # Use provided directory or find it
    if [ -n "$1" ]; then
        PROJECT_DIR="$1"
        if [ ! -d "$PROJECT_DIR" ]; then
            log_error "Directory not found: $PROJECT_DIR"
            exit 1
        fi
        log_success "Using project: $PROJECT_DIR"
    else
        find_project_dir
    fi
    
    check_resources
    clean_builds
    optimize_system
    
    if rebuild_frontend; then
        verify_build && {
            log_step "Recovery Complete"
            echo ""
            echo -e "${GREEN}✓ Frontend build successful!${NC}"
            echo ""
            echo "Next steps:"
            echo "1. If services are running, they will auto-reload"
            echo "2. Visit: http://localhost:6558 (or your configured port)"
            echo ""
        }
    else
        log_step "Recovery Failed"
        echo ""
        echo -e "${RED}✗ Unable to build frontend${NC}"
        echo ""
        echo "Troubleshooting steps:"
        echo "1. Check system memory: free -m"
        echo "2. Check disk space: df -h"
        echo "3. View build logs: npm run build (manually in frontend dir)"
        echo "4. Check Node version: node -v (should be 18+)"
        echo ""
        exit 1
    fi
}

# Execute
main "$@"
