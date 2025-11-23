#!/usr/bin/env bash

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}聚合AI - 停止脚本${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 使用 PM2 停止
if command -v pm2 >/dev/null 2>&1; then
    echo -e "${YELLOW}使用 PM2 停止所有进程...${NC}"
    pm2 stop all 2>/dev/null || true
    echo -e "${GREEN}✓ 所有进程已停止${NC}"
else
    # 手动停止
    echo -e "${YELLOW}手动停止进程...${NC}"
    
    # 查找并杀死后端进程
    if [ -f "$ROOT_DIR/backend.pid" ]; then
        PID=$(cat "$ROOT_DIR/backend.pid")
        if kill -0 $PID 2>/dev/null; then
            kill $PID
            echo -e "${GREEN}✓ 后端进程已停止 (PID: $PID)${NC}"
        fi
    fi
    
    # 查找并杀死前端进程
    if [ -f "$ROOT_DIR/frontend.pid" ]; then
        PID=$(cat "$ROOT_DIR/frontend.pid")
        if kill -0 $PID 2>/dev/null; then
            kill $PID
            echo -e "${GREEN}✓ 前端进程已停止 (PID: $PID)${NC}"
        fi
    fi
fi

echo ""
echo -e "${BLUE}进程状态:${NC}"
if command -v pm2 >/dev/null 2>&1; then
    pm2 list | grep -E "(ai-chat|Name)" || echo -e "${YELLOW}  无 PM2 进程运行${NC}"
else
    echo -e "${GREEN}✓ 手动停止完成${NC}"
fi

echo ""
