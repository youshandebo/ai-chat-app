#!/bin/bash
set -e

# ========== 配置 ==========
APP_DIR="$(cd "$(dirname "$0")" && pwd)"

# ========== 颜色 ==========
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   聚合AI · 一键更新脚本 (v2.1)${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# ========== 检查环境 ==========
cd "$APP_DIR"

if [ ! -d ".git" ]; then
    echo -e "${RED}[错误] 当前目录不是 git 仓库${NC}"
    exit 1
fi

# ========== 拉取最新代码 ==========
echo -e "${YELLOW}[1/4] 拉取最新代码...${NC}"
git pull origin main
echo -e "${GREEN}  ✓ 代码已更新${NC}"
echo ""

# ========== 构建前端 ==========
echo -e "${YELLOW}[2/4] 构建前端...${NC}"
cd "$APP_DIR/frontend"
rm -rf dist
npm install --production=false
npm run build
echo -e "${GREEN}  ✓ 前端构建完成${NC}"
echo ""

# ========== 构建后端 ==========
echo -e "${YELLOW}[3/4] 构建后端...${NC}"
cd "$APP_DIR/backend"
npm install
npm run build
echo -e "${GREEN}  ✓ 后端构建完成${NC}"
echo ""

# ========== 重启服务 ==========
echo -e "${YELLOW}[4/4] 重启服务...${NC}"
cd "$APP_DIR"
pm2 delete all 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
echo -e "${GREEN}  ✓ 服务已重启${NC}"
echo ""

# ========== 完成 ==========
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   更新完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
pm2 list
