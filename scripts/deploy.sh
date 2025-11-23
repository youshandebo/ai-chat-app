#!/usr/bin/env bash
set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
FRONT_DIR="$ROOT_DIR/frontend"
BACK_DIR="$ROOT_DIR/backend"
DATA_DIR="$BACK_DIR/data"

BACK_PORT="${BACK_PORT:-}"
FRONT_PORT="${FRONT_PORT:-}"
ADMIN_TOKEN="${ADMIN_TOKEN:-fnx081013fnx}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}聚合AI - 一键部署脚本${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 检查环境
echo -e "${YELLOW}[1/6] 检查环境...${NC}"

if ! command -v node >/dev/null 2>&1; then
    echo -e "${RED}✗ Node.js 未安装${NC}"
    exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
    echo -e "${RED}✗ npm 未安装${NC}"
    exit 1
fi

if ! command -v git >/dev/null 2>&1; then
    echo -e "${RED}✗ git 未安装${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js $(node -v)${NC}"
echo -e "${GREEN}✓ npm $(npm -v)${NC}"

# 端口检测
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

if [ -z "$BACK_PORT" ] || [ -z "$FRONT_PORT" ]; then
    p=6555
    echo -e "${YELLOW}  寻找可用端口...${NC}"
    while true; do
        fp=$((p + 1))
        if is_port_free "$p" && is_port_free "$fp"; then
            BACK_PORT="${BACK_PORT:-$p}"
            FRONT_PORT="${FRONT_PORT:-$fp}"
            break
        fi
        p=$((p + 1))
        if [ $p -gt 7000 ]; then
            echo -e "${RED}✗ 无法找到可用端口${NC}"
            exit 1
        fi
    done
fi

echo -e "${GREEN}✓ 后端端口: $BACK_PORT${NC}"
echo -e "${GREEN}✓ 前端端口: $FRONT_PORT${NC}"

# 构建
echo ""
echo -e "${YELLOW}[2/6] 构建后端...${NC}"
cd "$BACK_DIR"
npm install --legacy-peer-deps >/dev/null 2>&1 || npm install
npm run build 2>&1 | grep -E "(✓|✗|error)" || echo -e "${GREEN}✓ 后端构建完成${NC}"

echo ""
echo -e "${YELLOW}[3/6] 构建前端...${NC}"
cd "$FRONT_DIR"
npm install --legacy-peer-deps >/dev/null 2>&1 || npm install

cat > .env << EOF
VITE_BACKEND_BASE=http://localhost:$BACK_PORT
VITE_ADMIN_TOKEN=$ADMIN_TOKEN
EOF

npm run build 2>&1 | grep -E "(✓|✗|error)" || echo -e "${GREEN}✓ 前端构建完成${NC}"

# 配置环境
echo ""
echo -e "${YELLOW}[4/6] 配置环境...${NC}"
mkdir -p "$DATA_DIR"

cd "$BACK_DIR"
cat > .env << EOF
PORT=$BACK_PORT
CORS_ORIGIN=*
ADMIN_TOKEN=$ADMIN_TOKEN
RATE_LIMIT_PER_MINUTE=120
NODE_ENV=production
EOF
echo -e "${GREEN}✓ 后端配置完成${NC}"

# 检查 PM2
if ! command -v pm2 >/dev/null 2>&1; then
    echo -e "${YELLOW}  安装 PM2...${NC}"
    sudo npm install -g pm2 >/dev/null 2>&1 || npm install -g pm2
fi

# 启动服务
echo ""
echo -e "${YELLOW}[5/6] 启动服务...${NC}"

BACK_NAME="ai-chat-backend-$BACK_PORT"
FRONT_NAME="ai-chat-frontend-$FRONT_PORT"

cd "$BACK_DIR"
PORT="$BACK_PORT" CORS_ORIGIN="*" pm2 start "npm start" --name "$BACK_NAME" --update-env 2>&1 | grep -E "(started|restarted)" || true
echo -e "${GREEN}✓ 后端已启动${NC}"

cd "$FRONT_DIR"
cat > server.js << 'EOFJS'
const express = require('express');
const path = require('path');
const app = express();
app.use(express.static('dist'));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Frontend running on port ${PORT}`);
});
EOFJS

npm install express >/dev/null 2>&1 || true
PORT="$FRONT_PORT" pm2 start "node server.js" --name "$FRONT_NAME" --update-env 2>&1 | grep -E "(started|restarted)" || true
echo -e "${GREEN}✓ 前端已启动${NC}"

pm2 save >/dev/null 2>&1 || true

# 诊断
echo ""
echo -e "${YELLOW}[6/6] 运行诊断...${NC}"
sleep 2

BACKEND_STATUS=$(curl -s "http://localhost:$BACK_PORT/api/admin/health" \
  -H "Authorization: Bearer $ADMIN_TOKEN" 2>/dev/null | grep -o "modelsCount" || echo "FAIL")

if [ "$BACKEND_STATUS" != "FAIL" ]; then
    echo -e "${GREEN}✓ 后端健康${NC}"
else
    echo -e "${YELLOW}⚠ 后端启动中...${NC}"
fi

FRONTEND_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$FRONT_PORT" 2>/dev/null || echo "000")
if [ "$FRONTEND_CODE" = "200" ]; then
    echo -e "${GREEN}✓ 前端正常${NC}"
else
    echo -e "${YELLOW}⚠ 前端启动中 (HTTP $FRONTEND_CODE)${NC}"
fi

# 显示结果
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ 部署完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}访问信息:${NC}"
echo -e "  前端:     ${GREEN}http://localhost:$FRONT_PORT${NC}"
echo -e "  后端:     ${GREEN}http://localhost:$BACK_PORT${NC}"
echo -e "  管理面板: ${GREEN}http://localhost:$FRONT_PORT/admin${NC}"
echo -e "  Token:    ${GREEN}$ADMIN_TOKEN${NC}"
echo ""
echo -e "${BLUE}PM2 进程:${NC}"
pm2 list | grep -E "(ai-chat|Name)"
echo ""
echo -e "${BLUE}常用命令:${NC}"
echo -e "  查看日志:   ${GREEN}pm2 log${NC}"
echo -e "  查看进程:   ${GREEN}pm2 list${NC}"
echo -e "  重启后端:   ${GREEN}pm2 restart $BACK_NAME${NC}"
echo -e "  重启前端:   ${GREEN}pm2 restart $FRONT_NAME${NC}"
echo -e "  停止所有:   ${GREEN}pm2 stop all${NC}"
echo ""
