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

#### 2. **端口配置问题（重要）**
我们使用 **自定义端口** 而非标准 80/443：
- 后端应用运行在 **6555** 端口
- 前端应用运行在 **6556** 端口
- Nginx 监听 **6557** 端口（用于 Cloudflare 代理）

**通过 Cloudflare 访问**: `http://yourshandebo.xx.kg:6557`

```bash
# 测试连接
curl http://yourshandebo.xx.kg:6557/api/models
```

#### 3. **CORS 配置问题**
编辑后端 `.env`：

```bash
cd backend
nano .env

# 改为允许任何来源
CORS_ORIGIN=*
# 或指定你的域名
CORS_ORIGIN=https://yourshandebo.xx.kg:6557
```

#### 4. **防火墙规则**
```bash
# 开放必要的端口
sudo ufw allow 6555/tcp  # 后端
sudo ufw allow 6556/tcp  # 前端
sudo ufw allow 6557/tcp  # Nginx
```

#### 5. **Cloudflare 防火墙规则**
在 Cloudflare 面板检查：
- **Security > Firewall Rules** - 检查是否有阻止规则
- **Page Rules** - 检查是否有冲突的页面规则
- **Performance** - 检查缓存设置

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

# 如果防火墙未开放所需端口
sudo ufw allow 6555/tcp
sudo ufw allow 6556/tcp
sudo ufw allow 6557/tcp
```

### 第二步：配置 Nginx（可选）

如果要通过自定义端口 6557 访问，需要配置 Nginx：

```bash
# 安装并配置 Nginx
sudo bash scripts/setup-nginx.sh yourshandebo.xx.kg 6555 6556 6557

# 配置参数说明：
# - yourshandebo.xx.kg  : 你的域名
# - 6555                : 后端应用端口
# - 6556                : 前端应用端口
# - 6557                : Nginx 监听端口（对外暴露）
```

### 第三步：在 Cloudflare 配置 DNS

1. 登录 Cloudflare 控制面板
2. 在 **DNS** 标签中：
   - 类型：**A**
   - 名称：**yourshandebo.xx.kg**
   - 内容：**你的服务器公网IP**
   - 代理状态：**已代理（橙色云）** ✓
   - TTL：**自动**

3. 不需要配置 SSL/TLS（我们使用 HTTP 自定义端口）

### 第四步：部署应用

```bash
# 在服务器上部署
cd /opt  # 或其他目录
git clone https://github.com/youshandebo/ai-chat-app.git
cd ai-chat-app

# 运行部署脚本
bash scripts/deploy.sh

# 脚本会自动启动：
# - 后端: http://localhost:6555
# - 前端: http://localhost:6556
```

---

## 测试连接

```bash
# 测试 Cloudflare DNS 解析
nslookup yourshandebo.xx.kg

# 直接连接到本地应用
curl http://localhost:6555/api/models
curl http://localhost:6556

# 通过 Nginx 反向代理访问
curl http://localhost:6557/api/models
curl http://localhost:6557

# 通过 Cloudflare 代理域名访问
curl http://yourshandebo.xx.kg:6557/api/models
curl http://yourshandebo.xx.kg:6557
```

---

## 如果还是无法访问

```bash
# 1. 检查各个应用是否运行
pm2 list

# 2. 检查 Nginx 状态
sudo systemctl status nginx
sudo nginx -t

# 3. 检查应用日志
pm2 log

# 4. 查看 Nginx 错误日志
sudo tail -f /var/log/nginx/yourshandebo.xx.kg-error.log

# 5. 检查防火墙
sudo ufw status verbose

# 6. 检查端口占用
lsof -i :6555
lsof -i :6556
lsof -i :6557

# 7. 测试本地端口连接
curl http://localhost:6555/api/models
curl http://localhost:6556
curl http://localhost:6557
```

---

## 关键检查清单

- [ ] 服务器公网 IP 正确配置在 Cloudflare
- [ ] 后端应用运行在 6555
- [ ] 前端应用运行在 6556
- [ ] Nginx 运行并监听 6557
- [ ] 防火墙已开放 6555/6556/6557 端口
- [ ] CORS 配置为 `*` 或你的域名:端口
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

echo "=== 本地连接测试 ==="
echo "后端 API:"
curl -s http://localhost:6555/api/models | head -5
echo ""
echo "前端:"
curl -s http://localhost:6556 | head -5
echo ""
echo "Nginx:"
curl -s http://localhost:6557 | head -5
```

---

## 端口映射说明

```
互联网 → Cloudflare DNS
         ↓
    yourshandebo.xx.kg:6557
         ↓
    你的服务器:6557 (Nginx)
         ↓
    ┌────────────────┬───────────────┐
    ↓                ↓
localhost:6556    localhost:6555
(前端应用)        (后端 API)
```

---

## 访问地址

| 服务 | 本地直连 | Nginx代理 | Cloudflare代理 |
|------|---------|----------|----------------|
| 前端 | http://localhost:6556 | http://localhost:6557 | http://yourshandebo.xx.kg:6557 |
| 后端 | http://localhost:6555/api | http://localhost:6557/api | http://yourshandebo.xx.kg:6557/api |
| 管理 | http://localhost:6556/admin | http://localhost:6557/admin | http://yourshandebo.xx.kg:6557/admin |

---

## 常见错误

### 错误 1: `Cannot connect to yourshandebo.xx.kg`
- ✓ 检查 DNS 解析：`nslookup yourshandebo.xx.kg`
- ✓ 检查防火墙：`sudo ufw status`
- ✓ 检查应用：`pm2 list`

### 错误 2: `Connection refused on port 6557`
- ✓ Nginx 未运行：`sudo systemctl status nginx`
- ✓ 端口被占用：`lsof -i :6557`
- ✓ 配置错误：`sudo nginx -t`

### 错误 3: `502 Bad Gateway`
- ✓ 后端未运行：`curl http://localhost:6555`
- ✓ 前端未运行：`curl http://localhost:6556`
- ✓ 查看日志：`sudo tail -f /var/log/nginx/yourshandebo.xx.kg-error.log`

---


