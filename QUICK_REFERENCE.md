# 快速参考

## 🚀 一键部署

```bash
# 在服务器上运行
curl -fsSL https://raw.githubusercontent.com/youshandebo/ai-chat-app/main/scripts/deploy.sh | bash
```

---

## 📋 所有脚本

| 脚本 | 功能 | 使用方法 |
|------|------|--------|
| `deploy.sh` | 完整部署（clone、构建、启动） | `bash scripts/deploy.sh` |
| `diagnose.sh` | 检查环境和运行状态 | `bash scripts/diagnose.sh` |
| `setup-nginx.sh` | 配置自定义端口的 Nginx | `sudo bash scripts/setup-nginx.sh yourshandebo.xx.kg 6555 6556 6557` |
| `stop.sh` | 停止所有服务 | `bash scripts/stop.sh` |

---

## 📍 端口分配

**所有端口从 6555 开始向上递增，不使用标准 80/443 端口：**

```
6555  → 后端 API 服务
6556  → 前端 Web 应用
6557  → Nginx 反向代理（对外暴露给 Cloudflare）
6558+ → 如果端口被占用则使用后续端口
```

---

## 🌐 访问方式

| 服务 | 本地直连 | 通过 Nginx | 通过 Cloudflare |
|------|---------|----------|----------------|
| 前端 | `http://localhost:6556` | `http://localhost:6557` | `http://yourshandebo.xx.kg:6557` |
| 后端 API | `http://localhost:6555` | `http://localhost:6557/api` | `http://yourshandebo.xx.kg:6557/api` |
| 管理面板 | `http://localhost:6556/admin` | `http://localhost:6557/admin` | `http://yourshandebo.xx.kg:6557/admin` |

---

## 🔧 环境变量

### 后端 (backend/.env)

```env
PORT=6555                          # 后端监听端口
CORS_ORIGIN=*                      # CORS 设置
ADMIN_TOKEN=fnx081013fnx           # 管理面板密钥
RATE_LIMIT_PER_MINUTE=120          # 限流
NODE_ENV=production                # 环境
GEMINI_API_KEY=sk-...              # Gemini API Key
DEEPSEEK_API_KEY=sk-...            # DeepSeek API Key
```

### 前端 (frontend/.env)

```env
VITE_BACKEND_BASE=http://localhost:6555
VITE_ADMIN_TOKEN=fnx081013fnx
```

---

## 🌐 Cloudflare 配置

### 1. DNS 记录

| 类型 | 名称 | 内容 | 状态 |
|------|------|------|------|
| A | yourshandebo.xx.kg | 你的服务器IP | 已代理 ☁️ |

### 2. 不需要 SSL/TLS 配置（使用 HTTP 自定义端口）

### 3. 验证

```bash
nslookup yourshandebo.xx.kg  # 检查 DNS 解析
curl http://yourshandebo.xx.kg:6557  # 测试访问
```

---

## 📊 PM2 命令

```bash
pm2 list                    # 查看进程列表
pm2 log                     # 查看实时日志
pm2 restart ai-chat-backend-6555   # 重启后端
pm2 restart ai-chat-frontend-6556  # 重启前端
pm2 stop all                # 停止所有
pm2 delete all              # 删除所有
pm2 monit                   # 实时监控
```

---

## 🔍 诊断命令

```bash
# 完整诊断
bash scripts/diagnose.sh

# 检查 Nginx
sudo systemctl status nginx

# 检查端口
lsof -i :6555
lsof -i :6556
lsof -i :6557

# 查看日志
tail -f /var/log/nginx/yourshandebo.xx.kg-error.log

# API 测试
curl http://localhost:6555/api/models
curl http://localhost:6555/api/admin/health \
  -H "Authorization: Bearer fnx081013fnx"
```

---

## 🆘 常见问题排查

### 无法通过域名访问

1. ✓ DNS 解析正确？ `nslookup yourshandebo.xx.kg`
2. ✓ 防火墙开放 6557 端口？ `sudo ufw status`
3. ✓ Nginx 运行？ `sudo systemctl status nginx`
4. ✓ 应用运行？ `pm2 list`
5. ✓ 本地端口可访问？ `curl http://localhost:6557`

### 应用启动慢

1. 检查 CPU：`top`
2. 检查内存：`free -h`
3. 查看日志：`pm2 log`
4. 增加超时时间

### API 超时

后端 `.env`:
```env
NODE_ENV=production
RATE_LIMIT_PER_MINUTE=60  # 降低限流
```

### 端口被占用

```bash
# 查看占用进程
lsof -i :6557

# 使用其他端口启动 Nginx
sudo bash scripts/setup-nginx.sh yourshandebo.xx.kg 6555 6556 6558
```

---

## 📈 管理面板

**URL**: `http://yourshandebo.xx.kg:6557/admin` 或 `http://localhost:6557/admin`

**Token**: `fnx081013fnx`

### 功能

- ✓ 查看可用模型
- ✓ 测试流式生成
- ✓ 查看指标统计（24h/7d/30d/365d）
- ✓ API 调用数、错误率、访客数
- ✓ 后台健康检查
- ✓ 模型配置重载

---

## 📝 日志位置

```
后端日志     → backend/dist/server.log (PM2 管理)
前端日志     → frontend/server.log (PM2 管理)
Nginx 访问   → /var/log/nginx/yourshandebo.xx.kg-access.log
Nginx 错误   → /var/log/nginx/yourshandebo.xx.kg-error.log
PM2 日志     → ~/.pm2/logs/
```

---

## 🔐 安全建议

- [ ] 修改 ADMIN_TOKEN 为强密码
- [ ] 定期更新依赖：`npm audit fix`
- [ ] 备份数据目录：`backend/data/`
- [ ] 限制 API 调用频率
- [ ] 隐藏敏感 API 密钥

---

## 🚀 性能优化

```bash
# 启用 Gzip 压缩
# 在 /etc/nginx/nginx.conf 中启用：
gzip on;
gzip_types text/plain application/json;
gzip_min_length 1024;
```

---

## 📞 获取帮助

- 文档: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- Cloudflare 设置: [CLOUDFLARE_SETUP.md](./CLOUDFLARE_SETUP.md)
- 问题报告: https://github.com/youshandebo/ai-chat-app/issues

---

## 🎯 总结

```bash
# 标准三步部署
1. 连接到服务器
   ssh root@your_server_ip

2. 一键部署
   git clone https://github.com/youshandebo/ai-chat-app.git
   cd ai-chat-app
   bash scripts/deploy.sh

3. 配置 Nginx 反向代理（可选）
   sudo bash scripts/setup-nginx.sh yourshandebo.xx.kg 6555 6556 6557

4. 配置 Cloudflare DNS
   A 记录 → 服务器 IP，代理状态：已代理
   访问端口：6557

✓ 完成！访问 http://yourshandebo.xx.kg:6557
```

