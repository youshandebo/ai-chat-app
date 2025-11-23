# Cloudflare 配置指南

## 问题分析

你使用 Cloudflare 代理域名后无法通过域名访问应用，可能原因：

### 常见原因及解决方案

#### 1. **源服务器IP不正确**
- 你的截图显示IP是 `107.173.101.155`
- 检查这个IP是否是你的实际服务器公网IP
- 如果不对，需要更新 Cloudflare DNS 记录

```bash
# 查看实际公网IP
curl -s https://api.ipify.org
```

#### 2. **端口不开放**
- 你提到使用端口 6555+ 
- 如果 Cloudflare 代理指向的是标准 HTTP/HTTPS 端口（80/443）
- 需要在服务器上配置反向代理，将 80/443 转发到 6555/6556

```bash
# 使用 Nginx 反向代理
sudo apt update
sudo apt install nginx -y

# 编辑配置
sudo nano /etc/nginx/sites-available/default

# 添加反向代理配置：
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    
    server_name yourshandebo.xx.kg;
    
    location / {
        proxy_pass http://localhost:6555;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /api {
        proxy_pass http://localhost:6556;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# 测试配置
sudo nginx -t

# 启动 Nginx
sudo systemctl restart nginx
```

#### 3. **Cloudflare 防火墙规则**
在 Cloudflare 面板检查：
- **Security > Firewall Rules** - 检查是否有阻止规则
- **Page Rules** - 检查是否有冲突的页面规则
- **Performance** - 检查缓存设置

#### 4. **SSL/TLS 配置不匹配**
在 Cloudflare SSL/TLS 设置中：
- 如果选了 "Full (strict)"，源服务器必须有有效的 HTTPS 证书
- 建议选 "Flexible" 或 "Full"

```bash
# 获取免费 SSL 证书
sudo apt install certbot python3-certbot-nginx -y
sudo certbot certonly -d yourshandebo.xx.kg --standalone
```

#### 5. **CORS 配置问题**
编辑后端 `.env`：

```bash
cd backend
nano .env

# 改为允许任何来源
CORS_ORIGIN=*
# 或指定你的域名
CORS_ORIGIN=https://yourshandebo.xx.kg
```

---

## 完整部署流程（推荐）

### 第一步：确认你的服务器配置

```bash
# 1. 查看服务器公网IP
curl -s https://api.ipify.org

# 2. 检查已占用端口
lsof -i -P -n | grep LISTEN

# 3. 查看防火墙
sudo ufw status

# 如果防火墙未开放 80 和 443 端口
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 6555/tcp
sudo ufw allow 6556/tcp
```

### 第二步：配置 Nginx 反向代理

```bash
# 安装 Nginx
sudo apt update
sudo apt install nginx -y

# 创建配置文件
sudo tee /etc/nginx/sites-available/yourshandebo.xx.kg > /dev/null << 'EOF'
upstream backend {
    server localhost:6555;
}

upstream frontend {
    server localhost:6556;
}

server {
    listen 80;
    listen [::]:80;
    server_name yourshandebo.xx.kg;
    
    # 重定向到 HTTPS（如果有 SSL）
    # return 301 https://$server_name$request_uri;
    
    # 前端应用
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # 后端 API
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF

# 启用配置
sudo ln -sf /etc/nginx/sites-available/yourshandebo.xx.kg /etc/nginx/sites-enabled/

# 删除默认配置
sudo rm -f /etc/nginx/sites-enabled/default

# 测试配置
sudo nginx -t

# 启动 Nginx
sudo systemctl restart nginx
```

### 第三步：配置 HTTPS（可选但推荐）

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx -y

# 获取证书
sudo certbot --nginx -d yourshandebo.xx.kg

# 自动续期
sudo systemctl enable certbot.timer
```

### 第四步：在 Cloudflare 配置域名解析

1. 登录 Cloudflare 控制面板
2. 选择你的域名
3. 在 **DNS** 标签中：
   - 类型：**A**
   - 名称：**yourshandebo.xx.kg** （或子域如 app）
   - 内容：**你的服务器公网IP**（查看前面的 curl 命令结果）
   - 代理状态：**已代理（橙色云）** ✓
   - TTL：**自动**

4. 检查 **SSL/TLS** 设置：
   - 选择 **Full** 或 **Flexible**（取决于是否配置了 HTTPS）

### 第五步：部署应用

```bash
# 在服务器上部署
cd /opt  # 或其他目录
git clone https://github.com/youshandebo/ai-chat-app.git
cd ai-chat-app

# 运行部署脚本
bash scripts/deploy.sh

# 部署脚本会自动：
# - 检查依赖
# - 构建后端 (端口 6555)
# - 构建前端 (端口 6556)
# - 启动 PM2 进程
```

---

## 测试连接

```bash
# 测试 Cloudflare DNS 解析
nslookup yourshandebo.xx.kg

# 测试 HTTP 连接
curl -v http://yourshandebo.xx.kg

# 测试后端 API
curl http://yourshandebo.xx.kg/api/models

# 监控日志
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

---

## 如果还是无法访问

```bash
# 1. 检查 Nginx 状态
sudo systemctl status nginx

# 2. 查看 Nginx 错误日志
sudo tail -f /var/log/nginx/error.log

# 3. 检查应用是否运行
pm2 list

# 4. 查看应用日志
pm2 log

# 5. 直接访问本地端口
curl http://localhost:6555/api/models
curl http://localhost:6556

# 6. 测试防火墙
sudo ufw status verbose
```

---

## 关键检查清单

- [ ] 服务器公网 IP 正确配置在 Cloudflare
- [ ] Nginx 反向代理已启动
- [ ] 防火墙已开放 80/443 端口
- [ ] 应用已启动在 6555/6556
- [ ] CORS 配置为 `*` 或你的域名
- [ ] Cloudflare SSL/TLS 设置为 Full 或 Flexible
- [ ] DNS 记录指向正确的 IP
- [ ] 在 Cloudflare 控制面板检查无防火墙规则阻止

---

## 快速诊断命令

```bash
#!/bin/bash
echo "=== 系统信息 ==="
uname -a
echo ""

echo "=== 公网 IP ==="
curl -s https://api.ipify.org
echo ""

echo "=== 监听端口 ==="
netstat -ltn | grep LISTEN
echo ""

echo "=== Nginx 状态 ==="
sudo systemctl status nginx --no-pager
echo ""

echo "=== PM2 进程 ==="
pm2 list
echo ""

echo "=== DNS 解析 ==="
nslookup yourshandebo.xx.kg
echo ""

echo "=== 连接测试 ==="
curl -v http://yourshandebo.xx.kg | head -20
```

---

## 问题排查树

```
能通过 IP 直接访问? 
├─ 是 → 问题在 DNS/Cloudflare
│   ├─ 检查 DNS 解析
│   ├─ 检查 Cloudflare 防火墙规则
│   └─ 检查 Cloudflare 页面规则
│
└─ 否 → 问题在服务器/应用
    ├─ 检查 Nginx 是否运行
    ├─ 检查应用是否运行
    ├─ 检查防火墙端口规则
    └─ 检查应用日志错误
```
