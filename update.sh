#!/bin/bash

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

# ========== 备份关键文件 ==========
echo -e "${YELLOW}[0/5] 备份配置和数据...${NC}"
BACKUP_DIR=$(mktemp -d)
cp "$APP_DIR/backend/.env" "$BACKUP_DIR/.env" 2>/dev/null || true
cp -r "$APP_DIR/backend/data" "$BACKUP_DIR/data" 2>/dev/null || true
echo -e "${GREEN}  ✓ 备份完成${NC}"
echo ""

# ========== 拉取最新代码 ==========
echo -e "${YELLOW}[1/5] 拉取最新代码...${NC}"
cd "$APP_DIR"
if ! git pull origin main; then
    echo -e "${RED}  ✗ git pull 失败${NC}"
    exit 1
fi
echo -e "${GREEN}  ✓ 代码已更新${NC}"
echo ""

# ========== 构建前端 ==========
echo -e "${YELLOW}[2/5] 构建前端...${NC}"
cd "$APP_DIR/frontend"
rm -rf dist
if ! npm install --production=false; then
    echo -e "${RED}  ✗ 前端依赖安装失败${NC}"
    exit 1
fi
if ! npm run build; then
    echo -e "${RED}  ✗ 前端构建失败${NC}"
    exit 1
fi
echo -e "${GREEN}  ✓ 前端构建完成${NC}"
echo ""

# ========== 构建后端 ==========
echo -e "${YELLOW}[3/5] 构建后端...${NC}"
cd "$APP_DIR/backend"
if ! npm install; then
    echo -e "${RED}  ✗ 后端依赖安装失败${NC}"
    exit 1
fi
if ! npm run build; then
    echo -e "${RED}  ✗ 后端构建失败${NC}"
    exit 1
fi
echo -e "${GREEN}  ✓ 后端构建完成${NC}"
echo ""

# ========== 恢复备份 ==========
echo -e "${YELLOW}[4/5] 恢复配置和数据...${NC}"
cp "$BACKUP_DIR/.env" "$APP_DIR/backend/.env" 2>/dev/null || true
cp -r "$BACKUP_DIR/data/"* "$APP_DIR/backend/data/" 2>/dev/null || true
mkdir -p "$APP_DIR/backend/data"
rm -rf "$BACKUP_DIR"
echo -e "${GREEN}  ✓ 配置和数据已恢复${NC}"
echo ""

# ========== 重启服务 ==========
echo -e "${YELLOW}[5/5] 重启服务...${NC}"
cd "$APP_DIR"
pm2 delete all 2>/dev/null
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
