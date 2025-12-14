#!/usr/bin/env bash

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}自定义端口映射配置脚本${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 检查权限
if [ "$EUID" -ne 0 ]; then 
   echo -e "${RED}✗ 此脚本需要 root 权限${NC}"
   exit 1
fi

# 参数
DOMAIN="${1:-yourshandebo.xx.kg}"
BACKEND_PORT="${2:-6555}"
FRONTEND_PORT="${3:-6556}"
LISTEN_PORT="${4:-6557}"

echo -e "${YELLOW}配置信息:${NC}"
echo -e "  域名:       ${GREEN}$DOMAIN${NC}"
echo -e "  后端端口:   ${GREEN}$BACKEND_PORT${NC}"
echo -e "  前端端口:   ${GREEN}$FRONTEND_PORT${NC}"
echo -e "  监听端口:   ${GREEN}$LISTEN_PORT${NC}"
echo ""

# 安装 Nginx
echo -e "${YELLOW}[1/4] 安装 Nginx...${NC}"
if ! command -v nginx >/dev/null 2>&1; then
    apt update >/dev/null 2>&1
    apt install -y nginx >/dev/null 2>&1
    echo -e "${GREEN}✓ Nginx 已安装${NC}"
else
    echo -e "${GREEN}✓ Nginx 已存在${NC}"
fi

# 创建配置文件
echo -e "${YELLOW}[2/4] 创建配置文件...${NC}"

mkdir -p /etc/nginx/sites-available
mkdir -p /etc/nginx/sites-enabled

cat > /etc/nginx/sites-available/$DOMAIN << EOF
# 后端上游服务
upstream backend {
    server localhost:$BACKEND_PORT;
    keepalive 32;
}

# 前端上游服务
upstream frontend {
    server localhost:$FRONTEND_PORT;
    keepalive 32;
}

# HTTP 服务器配置 - 自定义端口
server {
    listen $LISTEN_PORT;
    listen [::]:$LISTEN_PORT;
    server_name $DOMAIN www.$DOMAIN;
    
    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/rss+xml application/atom+xml image/svg+xml;
    
    # 前端应用
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        
        # Keep-alive
        proxy_set_header Connection "";
        
        # 请求头
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$server_name;
        
        # WebSocket 支持
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "Upgrade";
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # 缓冲设置
        proxy_buffering off;
    }
    
    # 后端 API 路由
    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        
        # Keep-alive
        proxy_set_header Connection "";
        
        # 请求头
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$server_name;
        
        # WebSocket 支持
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "Upgrade";
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
        
        # 缓冲设置
        proxy_buffering off;
    }
    
    # 健康检查端点
    location /health {
        access_log off;
        return 200 "ok\n";
        add_header Content-Type text/plain;
    }
    
    # 日志配置
    access_log /var/log/nginx/$DOMAIN-access.log combined buffer=32k flush=5s;
    error_log /var/log/nginx/$DOMAIN-error.log warn;
}
EOF

echo -e "${GREEN}✓ 配置文件已创建${NC}"

# 启用配置
echo -e "${YELLOW}[3/4] 启用配置...${NC}"

# 删除默认配置
rm -f /etc/nginx/sites-enabled/default

# 创建软链接
ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/

# 测试配置
echo -e "${BLUE}  测试 Nginx 配置...${NC}"
if nginx -t 2>&1 | grep -q "successful"; then
    echo -e "${GREEN}✓ 配置测试通过${NC}"
else
    echo -e "${RED}✗ 配置测试失败${NC}"
    nginx -t
    exit 1
fi

# 启动 Nginx
echo -e "${YELLOW}[4/4] 启动 Nginx...${NC}"
systemctl restart nginx
systemctl enable nginx

if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✓ Nginx 已启动${NC}"
else
    echo -e "${RED}✗ Nginx 启动失败${NC}"
    systemctl status nginx --no-pager
    exit 1
fi

# 防火墙规则
echo -e "${YELLOW}开放防火墙端口...${NC}"
if command -v ufw >/dev/null 2>&1; then
    ufw allow $LISTEN_PORT/tcp 2>/dev/null || true
    ufw allow $BACKEND_PORT/tcp 2>/dev/null || true
    ufw allow $FRONTEND_PORT/tcp 2>/dev/null || true
    echo -e "${GREEN}✓ 防火墙规则已更新${NC}"
fi

# 显示总结
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ 端口映射配置完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

echo -e "${BLUE}访问信息:${NC}"
echo -e "  通过 Nginx:  ${GREEN}http://$DOMAIN:$LISTEN_PORT${NC}"
echo -e "  后端直连:    ${GREEN}http://localhost:$BACKEND_PORT/api${NC}"
echo -e "  前端直连:    ${GREEN}http://localhost:$FRONTEND_PORT${NC}"
echo -e "  日志:        ${GREEN}/var/log/nginx/$DOMAIN-*.log${NC}"
echo ""

echo -e "${BLUE}常用命令:${NC}"
echo -e "  重启:     ${GREEN}sudo systemctl restart nginx${NC}"
echo -e "  停止:     ${GREEN}sudo systemctl stop nginx${NC}"
echo -e "  查看日志: ${GREEN}sudo tail -f /var/log/nginx/$DOMAIN-access.log${NC}"
echo -e "  检查配置: ${GREEN}sudo nginx -t${NC}"
echo ""

echo -e "${BLUE}通过 Cloudflare 访问:${NC}"
echo -e "  1. 登录 Cloudflare 控制面板"
echo -e "  2. DNS → A 记录"
echo -e "  3. 配置:"
echo -e "     名称: $DOMAIN"
echo -e "     内容: $(curl -s https://api.ipify.org)"
echo -e "     代理: 已代理 (橙色云)"
echo -e "  4. 访问: ${GREEN}http://$DOMAIN:$LISTEN_PORT${NC}"
echo ""
