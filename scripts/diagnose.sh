#!/usr/bin/env bash

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}聚合AI - 诊断脚本${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 检查系统环境
echo -e "${YELLOW}[1/8] 系统信息${NC}"
OS=$(uname -s)
echo -e "  操作系统: ${GREEN}$OS${NC}"
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node -v)
    echo -e "  Node.js:  ${GREEN}$NODE_VERSION${NC}"
else
    echo -e "  Node.js:  ${RED}未安装${NC}"
fi

if command -v npm >/dev/null 2>&1; then
    NPM_VERSION=$(npm -v)
    echo -e "  npm:      ${GREEN}$NPM_VERSION${NC}"
else
    echo -e "  npm:      ${RED}未安装${NC}"
fi

# 检查项目文件
echo ""
echo -e "${YELLOW}[2/8] 项目文件结构${NC}"
if [ -f "$ROOT_DIR/backend/package.json" ]; then
    echo -e "  后端:     ${GREEN}✓${NC}"
else
    echo -e "  后端:     ${RED}✗ 缺少 package.json${NC}"
fi

if [ -f "$ROOT_DIR/frontend/package.json" ]; then
    echo -e "  前端:     ${GREEN}✓${NC}"
else
    echo -e "  前端:     ${RED}✗ 缺少 package.json${NC}"
fi

if [ -d "$ROOT_DIR/backend/dist" ]; then
    echo -e "  后端构建: ${GREEN}✓${NC}"
else
    echo -e "  后端构建: ${RED}✗ 缺少 dist 目录${NC}"
fi

if [ -d "$ROOT_DIR/frontend/dist" ]; then
    echo -e "  前端构建: ${GREEN}✓${NC}"
else
    echo -e "  前端构建: ${RED}✗ 缺少 dist 目录${NC}"
fi

# 检查依赖
echo ""
echo -e "${YELLOW}[3/8] npm 依赖检查${NC}"

cd "$ROOT_DIR/backend" 2>/dev/null || exit 1
if [ -d "node_modules" ]; then
    BACKEND_MODULES=$(find node_modules -mindepth 1 -maxdepth 1 | wc -l)
    echo -e "  后端模块: ${GREEN}✓ ($BACKEND_MODULES 个)${NC}"
else
    echo -e "  后端模块: ${RED}✗ 缺少 node_modules${NC}"
fi

cd "$ROOT_DIR/frontend" 2>/dev/null || exit 1
if [ -d "node_modules" ]; then
    FRONTEND_MODULES=$(find node_modules -mindepth 1 -maxdepth 1 | wc -l)
    echo -e "  前端模块: ${GREEN}✓ ($FRONTEND_MODULES 个)${NC}"
else
    echo -e "  前端模块: ${RED}✗ 缺少 node_modules${NC}"
fi

# 读取配置
echo ""
echo -e "${YELLOW}[4/8] 运行配置${NC}"

# 尝试从 PM2 获取运行信息
if command -v pm2 >/dev/null 2>&1; then
    BACK_PROC=$(pm2 list | grep "ai-chat-backend" | head -1)
    FRONT_PROC=$(pm2 list | grep "ai-chat-frontend" | head -1)
    
    if [ -n "$BACK_PROC" ]; then
        BACK_PORT=$(echo "$BACK_PROC" | grep -oE '[0-9]{4,}' | head -1)
        echo -e "  后端进程: ${GREEN}✓ (端口: $BACK_PORT)${NC}"
    else
        echo -e "  后端进程: ${YELLOW}未运行${NC}"
    fi
    
    if [ -n "$FRONT_PROC" ]; then
        FRONT_PORT=$(echo "$FRONT_PROC" | grep -oE '[0-9]{4,}' | tail -1)
        echo -e "  前端进程: ${GREEN}✓ (端口: $FRONT_PORT)${NC}"
    else
        echo -e "  前端进程: ${YELLOW}未运行${NC}"
    fi
else
    # 尝试从保存的配置文件读取
    if [ -f "$ROOT_DIR/backend.port" ]; then
        BACK_PORT=$(cat "$ROOT_DIR/backend.port")
        echo -e "  后端端口: ${GREEN}$BACK_PORT${NC}"
    fi
    
    if [ -f "$ROOT_DIR/frontend.port" ]; then
        FRONT_PORT=$(cat "$ROOT_DIR/frontend.port")
        echo -e "  前端端口: ${GREEN}$FRONT_PORT${NC}"
    fi
fi

# 检查端口
echo ""
echo -e "${YELLOW}[5/8] 端口占用检查${NC}"

check_port() {
    local port=$1
    if command -v lsof >/dev/null 2>&1; then
        if lsof -i :$port >/dev/null 2>&1; then
            local proc=$(lsof -i :$port | tail -1 | awk '{print $1}')
            echo -e "  端口 $port: ${YELLOW}已占用 ($proc)${NC}"
            return 1
        fi
    elif command -v ss >/dev/null 2>&1; then
        if ss -ltn | grep -q ":$port "; then
            echo -e "  端口 $port: ${YELLOW}已占用${NC}"
            return 1
        fi
    fi
    echo -e "  端口 $port: ${GREEN}✓ 可用${NC}"
    return 0
}

# 检查默认端口
for port in 6555 6556 6557 6558; do
    check_port $port || true
done

# 检查网络连接
echo ""
echo -e "${YELLOW}[6/8] 网络连接测试${NC}"

if [ -n "${BACK_PORT:-}" ]; then
    BACK_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$BACK_PORT/api/models" 2>/dev/null || echo "000")
    if [ "$BACK_STATUS" = "200" ]; then
        echo -e "  后端 API: ${GREEN}✓ (HTTP $BACK_STATUS)${NC}"
    elif [ "$BACK_STATUS" != "000" ]; then
        echo -e "  后端 API: ${YELLOW}⚠ (HTTP $BACK_STATUS)${NC}"
    else
        echo -e "  后端 API: ${RED}✗ 无法连接${NC}"
    fi
fi

if [ -n "${FRONT_PORT:-}" ]; then
    FRONT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$FRONT_PORT/" 2>/dev/null || echo "000")
    if [ "$FRONT_STATUS" = "200" ]; then
        echo -e "  前端页面: ${GREEN}✓ (HTTP $FRONT_STATUS)${NC}"
    elif [ "$FRONT_STATUS" != "000" ]; then
        echo -e "  前端页面: ${YELLOW}⚠ (HTTP $FRONT_STATUS)${NC}"
    else
        echo -e "  前端页面: ${RED}✗ 无法连接${NC}"
    fi
fi

# 检查环境变量
echo ""
echo -e "${YELLOW}[7/8] 环境配置检查${NC}"

if [ -f "$ROOT_DIR/backend/.env" ]; then
    BACK_PORT=$(grep "^PORT" "$ROOT_DIR/backend/.env" | cut -d= -f2)
    ADMIN_TOKEN=$(grep "^ADMIN_TOKEN" "$ROOT_DIR/backend/.env" | cut -d= -f2)
    echo -e "  后端配置: ${GREEN}✓${NC}"
    echo -e "    PORT: $BACK_PORT"
    echo -e "    ADMIN_TOKEN: $(echo $ADMIN_TOKEN | head -c 5)***"
else
    echo -e "  后端配置: ${YELLOW}缺少 .env${NC}"
fi

if [ -f "$ROOT_DIR/frontend/.env" ]; then
    echo -e "  前端配置: ${GREEN}✓${NC}"
    grep "^VITE_" "$ROOT_DIR/frontend/.env" | while read line; do
        echo -e "    $line"
    done
else
    echo -e "  前端配置: ${YELLOW}缺少 .env${NC}"
fi

# 数据目录
echo ""
echo -e "${YELLOW}[8/8] 数据存储检查${NC}"

if [ -d "$ROOT_DIR/backend/data" ]; then
    DATA_SIZE=$(du -sh "$ROOT_DIR/backend/data" 2>/dev/null | cut -f1)
    echo -e "  数据目录: ${GREEN}✓ ($DATA_SIZE)${NC}"
else
    echo -e "  数据目录: ${YELLOW}不存在${NC}"
fi

if [ -d "$ROOT_DIR/backend/logs" ]; then
    LOG_SIZE=$(du -sh "$ROOT_DIR/backend/logs" 2>/dev/null | cut -f1)
    echo -e "  日志目录: ${GREEN}✓ ($LOG_SIZE)${NC}"
else
    echo -e "  日志目录: ${YELLOW}不存在${NC}"
fi

# 总结
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}诊断完成${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}建议:${NC}"
if [ ! -d "$ROOT_DIR/backend/dist" ]; then
    echo -e "  1. 运行: ${GREEN}cd $ROOT_DIR/backend && npm run build${NC}"
fi
if [ ! -d "$ROOT_DIR/frontend/dist" ]; then
    echo -e "  1. 运行: ${GREEN}cd $ROOT_DIR/frontend && npm run build${NC}"
fi
echo -e "  2. 启动: ${GREEN}bash $ROOT_DIR/scripts/deploy.sh${NC}"
echo ""
