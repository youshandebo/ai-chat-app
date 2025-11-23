# 聚合AI - 项目部署指南

## 项目概述

一个现代化的 AI 对话聚合平台，支持多个 AI 模型（Gemini、Claude、DeepSeek等），提供后台管理面板和实时指标监控。

**仓库**: https://github.com/youshandebo/ai-chat-app

---

## 快速开始

### 本地开发

```bash
# 1. 克隆项目
git clone https://github.com/youshandebo/ai-chat-app.git
cd ai-chat-app

# 2. 后端
cd backend
npm install
npm run dev

# 3. 前端（新终端）
cd frontend
npm install
npm run dev

# 访问
# 前端: http://localhost:5173
# 后端: http://localhost:3000
```

### 一键部署到服务器

```bash
# 在服务器上运行
curl -fsSL https://raw.githubusercontent.com/youshandebo/ai-chat-app/main/scripts/deploy.sh | bash

# 或者下载后运行
wget https://raw.githubusercontent.com/youshandebo/ai-chat-app/main/scripts/deploy.sh
bash deploy.sh
```

---

## 部署脚本说明

### 1. **deploy.sh** - 一键部署

自动完成以下步骤：
- 检查环境（Node.js、npm、git）
- 克隆或更新项目
- 安装后端依赖并构建
- 安装前端依赖并构建
- 自动分配可用端口（从 6555 开始）
- 启动 PM2 进程管理
- 运行自动诊断

**使用方法**:

```bash
# 基础用法
bash scripts/deploy.sh

# 自定义端口
BACK_PORT=6555 FRONT_PORT=6556 bash scripts/deploy.sh

# 自定义 admin token
ADMIN_TOKEN=your_secret_token bash scripts/deploy.sh
```

**输出示例**:

```
========================================
聚合AI - 一键部署脚本
========================================

✓ Node.js v20.10.0
✓ npm 10.2.3
✓ 后端端口: 6555
✓ 前端端口: 6556
✓ 后端构建完成
✓ 前端构建完成
✓ 后端已启动
✓ 前端已启动
✓ 后端健康
✓ 前端正常

========================================
✓ 部署完成！
========================================

访问信息:
  前端:     http://localhost:6556
  后端:     http://localhost:6555
  管理面板: http://localhost:6556/admin
  Token:    fnx081013fnx
```

---

### 2. **diagnose.sh** - 诊断检查

检查以下项目：
- 系统信息（OS、Node.js版本）
- 项目文件结构
- npm 依赖安装情况
- 运行配置
- 端口占用情况
- 网络连接状态
- 环境变量配置
- 数据存储

**使用方法**:

```bash
bash scripts/diagnose.sh
```

**输出示例**:

```
========================================
聚合AI - 诊断脚本
========================================

[1/8] 系统信息
  操作系统: Linux
  Node.js:  v20.10.0
  npm:      10.2.3

[2/8] 项目文件结构
  后端:     ✓
  前端:     ✓
  后端构建: ✓
  前端构建: ✓

[3/8] npm 依赖检查
  后端模块: ✓ (450 个)
  前端模块: ✓ (520 个)

... 更多信息 ...

========================================
诊断完成
========================================
```

---

### 3. **setup-nginx.sh** - Nginx 反向代理配置

自动配置 Nginx 反向代理，将 80/443 端口转发到 6555/6556。

**使用方法**:

```bash
# 基础用法（使用默认配置）
sudo bash scripts/setup-nginx.sh

# 自定义域名和端口
sudo bash scripts/setup-nginx.sh yourshandebo.xx.kg 6555 6556
```

**功能**:
- 自动安装 Nginx
- 配置反向代理规则
- 支持 WebSocket
- 配置日志
- 可选 SSL 证书配置（Certbot）
- 防火墙规则配置

**配置完成后**:

```
访问信息:
  域名: http://yourshandebo.xx.kg

日志:
  /var/log/nginx/yourshandebo.xx.kg-access.log
  /var/log/nginx/yourshandebo.xx.kg-error.log

常用命令:
  重启:     sudo systemctl restart nginx
  查看日志: sudo tail -f /var/log/nginx/yourshandebo.xx.kg-access.log
```

---

### 4. **stop.sh** - 停止服务

停止所有运行的服务进程。

```bash
bash scripts/stop.sh
```

---

## 完整部署流程

### 第一步：连接到服务器

```bash
ssh root@your_server_ip
```

### 第二步：运行部署脚本

```bash
# 下载项目
git clone https://github.com/youshandebo/ai-chat-app.git
cd ai-chat-app

# 或者直接运行部署脚本
curl -fsSL https://raw.githubusercontent.com/youshandebo/ai-chat-app/main/scripts/deploy.sh | bash
```

### 第三步：配置 Nginx（如果使用域名）

```bash
# 获取你的服务器公网 IP
curl -s https://api.ipify.org

# 配置 Nginx
sudo bash scripts/setup-nginx.sh yourshandebo.xx.kg 6555 6556

# 如果提示需要 SSL，输入 y，然后配置 SSL 证书
```

### 第四步：在 Cloudflare 配置 DNS

1. 登录 Cloudflare 控制面板
2. 选择你的域名 → **DNS**
3. 编辑 A 记录:
   - **名称**: yourshandebo.xx.kg
   - **内容**: 你的服务器 IP（前一步获取的）
   - **代理状态**: 已代理（橙色云）✓

4. 检查 **SSL/TLS** 设置：
   - 选择 **Full** 或 **Flexible**

### 第五步：验证部署

```bash
# 本地测试
curl http://yourshandebo.xx.kg
curl http://yourshandebo.xx.kg/api/models

# 访问应用
# 前端: http://yourshandebo.xx.kg
# 管理: http://yourshandebo.xx.kg/admin
```

---

## 环境变量配置

### 后端 (.env)

```env
# 服务配置
PORT=6555
NODE_ENV=production
CORS_ORIGIN=*

# Admin 面板
ADMIN_TOKEN=fnx081013fnx

# API 密钥
GEMINI_API_KEY=your_gemini_key
DEEPSEEK_API_KEY=your_deepseek_key
CLAUDE_API_KEY=your_claude_key

# 限流
RATE_LIMIT_PER_MINUTE=120
```

### 前端 (.env)

```env
VITE_BACKEND_BASE=http://localhost:6555
VITE_ADMIN_TOKEN=fnx081013fnx
VITE_APP_TITLE=聚合AI对话
```

---

## 常见问题

### Q1: 无法通过域名访问？

**解决步骤**:

1. 检查 DNS 解析
```bash
nslookup yourshandebo.xx.kg
# 应该指向你的服务器 IP
```

2. 检查防火墙
```bash
sudo ufw status
# 应该允许 80 和 443 端口
```

3. 检查 Nginx
```bash
sudo systemctl status nginx
sudo tail -f /var/log/nginx/yourshandebo.xx.kg-error.log
```

4. 检查应用运行
```bash
pm2 list
pm2 log
```

详见 [CLOUDFLARE_SETUP.md](./CLOUDFLARE_SETUP.md)

### Q2: 如何修改后端 API 地址？

编辑前端 `.env` 文件：

```env
VITE_BACKEND_BASE=http://yourshandebo.xx.kg/api
# 或使用其他地址
VITE_BACKEND_BASE=http://localhost:6555
```

然后重新构建：

```bash
cd frontend
npm run build
pm2 restart ai-chat-frontend-*
```

### Q3: 如何查看运行日志？

```bash
# 查看所有日志
pm2 log

# 查看特定应用日志
pm2 log ai-chat-backend-6555
pm2 log ai-chat-frontend-6556

# 查看 Nginx 日志
sudo tail -f /var/log/nginx/yourshandebo.xx.kg-error.log
```

### Q4: 如何更新代码？

```bash
cd /path/to/ai-chat-app
git pull origin main

# 重新部署
bash scripts/deploy.sh
```

### Q5: 如何添加 API 密钥？

编辑后端 `.env`:

```bash
nano backend/.env
```

添加你的 API 密钥：

```env
GEMINI_API_KEY=sk-...
DEEPSEEK_API_KEY=sk-...
```

然后重启后端：

```bash
pm2 restart ai-chat-backend-6555
```

---

## 性能优化建议

### 1. 启用 Gzip 压缩

编辑 Nginx 配置：

```bash
sudo nano /etc/nginx/nginx.conf
```

确保以下设置存在：

```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript 
           application/x-javascript application/xml+rss 
           application/javascript application/json;
```

### 2. 配置缓存

在 Cloudflare 中：
- **Caching** → **Cache Level**: Cache Everything
- **Browser Cache TTL**: 4 小时

### 3. 启用 HTTP/2

在 Nginx 中：

```nginx
listen 443 ssl http2;
listen [::]:443 ssl http2;
```

### 4. 启用页面规则

在 Cloudflare 中为 `/api/*` 路径：
- 禁用缓存
- 启用 Always Online

---

## 监控和维护

### 监控进程状态

```bash
# 实时监控
pm2 monit

# 查看进程详情
pm2 show ai-chat-backend-6555

# 设置自动重启
pm2 restart ai-chat-backend-6555
```

### 定期更新

```bash
# 每周更新依赖
cd /path/to/ai-chat-app
git pull origin main
bash scripts/deploy.sh
```

### 清理日志

```bash
# 清理 PM2 日志
pm2 flush

# 清理 Nginx 日志（保留 30 天）
sudo find /var/log/nginx -name "*.log" -mtime +30 -delete
```

---

## 性能指标

部署脚本完成后，可以访问管理面板查看：

- **访客统计**: 24小时/一周/一月/一年
- **API 调用数**: 实时监控
- **错误率**: 自动追踪
- **并发人数**: 峰值记录
- **模型列表**: 可用的 AI 模型

访问地址: `http://yourshandebo.xx.kg/admin`

默认 Token: `fnx081013fnx`

---

## 技术栈

- **前端**: React + TypeScript + Vite + Tailwind CSS
- **后端**: Node.js + Express + TypeScript
- **部署**: PM2 + Nginx
- **数据**: JSON 文件存储
- **AI 模型**: Gemini 2.5、Claude、DeepSeek

---

## 贡献

欢迎提交 Issue 和 Pull Request！

---

## 许可证

MIT License

---

## 支持

如有问题，请提交 Issue: https://github.com/youshandebo/ai-chat-app/issues

