# 🚀 AI Chat App - 聚合多个AI模型的对话平台

一个功能强大的聚合AI平台，支持多个AI模型（Gemini、Claude、DeepSeek 等），具有流式响应、管理面板、metrics 监控等功能。

## ✨ 功能特性

- **多模型支持**: 集成 Gemini、Claude、DeepSeek 等多个 AI 模型
- **流式响应**: 实时显示 AI 回复，无需等待完整响应
- **响应式设计**: 支持桌面、平板、移动设备
- **管理面板**: 实时监控API调用、访客数、错误率等指标
- **自动部署**: 一键从 GitHub 克隆、构建、启动全部服务
- **自定义端口**: 支持任意端口配置（6555+ 推荐）
- **PM2 管理**: 进程自动守护、日志管理、自动重启
- **Nginx 反向代理**: 支持自定义端口的 Nginx 配置
- **Cloudflare 集成**: 完整的 DNS 和代理配置指南

## 🚀 快速开始

### 方式一: 一键部署（推荐）

在服务器上直接运行这个命令，自动完成所有操作：

```bash
# 方式 1: 克隆到特定目录
bash <(curl -fsSL https://raw.githubusercontent.com/youshandebo/ai-chat-app/main/scripts/deploy.sh) /opt/ai-chat

# 方式 2: 使用自定义端口
bash <(curl -fsSL https://raw.githubusercontent.com/youshandebo/ai-chat-app/main/scripts/deploy.sh) /opt/ai-chat 6555 6556

# 方式 3: 已经克隆的项目目录
cd ai-chat-app
bash scripts/deploy.sh
```

### 方式二: 本地开发

```bash
# 1. 克隆项目
git clone https://github.com/youshandebo/ai-chat-app.git
cd ai-chat-app

# 2. 安装依赖
cd backend && npm install && npm run build
cd ../frontend && npm install && npm run build

# 3. 配置环境变量（后端）
cat > backend/.env << 'EOF'
PORT=6555
CORS_ORIGIN=*
ADMIN_TOKEN=fnx081013fnx
RATE_LIMIT_PER_MINUTE=120
NODE_ENV=production
GEMINI_API_KEY=sk-your-key
DEEPSEEK_API_KEY=sk-your-key
EOF

# 4. 启动服务（需要 PM2）
npm install -g pm2
pm2 start backend/dist/server.js --name "backend" --env PORT=6555
cd frontend && npm install express
pm2 start "node server.js" --name "frontend" --env PORT=6556
pm2 save
```

## 📍 访问地址

部署完成后，使用以下地址访问：

| 服务 | 本地地址 | 说明 |
|------|---------|------|
| 前端应用 | `http://localhost:6556` | Web 界面 |
| 后端 API | `http://localhost:6555` | API 端点 |
| 管理面板 | `http://localhost:6556/admin` | 监控和管理 |
| 健康检查 | `http://localhost:6555/api/admin/health` | 后端状态 |

## 🌐 使用 Cloudflare 部署

如果要通过自定义域名访问（如 `yourshandebo.xx.kg`），按照以下步骤操作：

### 1. 配置 Nginx 反向代理（可选）

如果想要所有流量都走 6557 端口的反向代理：

```bash
sudo bash scripts/setup-nginx.sh yourshandebo.xx.kg 6555 6556 6557
```

此后访问地址为：`http://yourshandebo.xx.kg:6557`

### 2. 配置 Cloudflare DNS

在 Cloudflare 中添加 A 记录：

| 类型 | 名称 | 内容 | 状态 |
|------|------|------|------|
| A | yourshandebo.xx.kg | 你的服务器IP | 已代理 ☁️ |

**不需要配置 SSL/TLS**（使用 HTTP 自定义端口）

详见 [CLOUDFLARE_SETUP.md](./CLOUDFLARE_SETUP.md)

## 🔧 环境变量

### 后端 (backend/.env)

```env
# 服务配置
PORT=6555                          # 监听端口
CORS_ORIGIN=*                      # CORS 跨域配置
NODE_ENV=production                # 运行环境
ADMIN_TOKEN=fnx081013fnx           # 管理面板认证 Token

# API 限流
RATE_LIMIT_PER_MINUTE=120          # 每分钟最大请求数

# AI 模型 API Key
GEMINI_API_KEY=sk-your-gemini-key
DEEPSEEK_API_KEY=sk-your-deepseek-key
CLAUDE_API_KEY=sk-your-claude-key
```

### 前端 (frontend/.env)

```env
VITE_BACKEND_BASE=http://localhost:6555
VITE_ADMIN_TOKEN=fnx081013fnx
```

## 📊 PM2 命令

```bash
# 查看所有进程
pm2 list

# 查看实时日志
pm2 log

# 查看特定进程日志
pm2 log ai-chat-backend-6555
pm2 log ai-chat-frontend-6556

# 重启进程
pm2 restart ai-chat-backend-6555
pm2 restart ai-chat-frontend-6556

# 停止所有进程
pm2 stop all

# 删除所有进程
pm2 delete all

# 实时监控
pm2 monit
```

## 🔍 诊断和故障排查

### 运行完整诊断

```bash
bash scripts/diagnose.sh
```

这将检查：
- ✓ Node.js 和 npm 版本
- ✓ 项目结构完整性
- ✓ 依赖安装情况
- ✓ 端口可用性
- ✓ 网络连接
- ✓ PM2 进程状态
- ✓ 后端 API 健康状态
- ✓ 前端访问状态

### 常见问题

#### 无法通过域名访问

```bash
# 1. 检查 DNS 解析
nslookup yourshandebo.xx.kg

# 2. 检查防火墙
sudo ufw status
sudo ufw allow 6555
sudo ufw allow 6556
sudo ufw allow 6557

# 3. 检查 Nginx 状态
sudo systemctl status nginx
sudo systemctl restart nginx

# 4. 查看 Nginx 错误日志
sudo tail -f /var/log/nginx/yourshandebo.xx.kg-error.log

# 5. 测试本地连接
curl http://localhost:6555/api/models
curl http://localhost:6556
```

#### 应用启动缓慢

```bash
# 查看系统资源
top
free -h
df -h

# 增加 PM2 监视内存
pm2 start ... --max-memory-restart 500M

# 查看详细日志
pm2 log --err
```

#### API 超时或限流

修改 `backend/.env`：

```env
RATE_LIMIT_PER_MINUTE=60          # 降低限流
```

然后重启：
```bash
pm2 restart ai-chat-backend-6555
```

## 📈 管理面板

访问 `http://localhost:6556/admin`，输入 Token: `fnx081013fnx`

### 可用功能

- 📊 **查看指标**: 访客数、API 调用数、错误率
- 🔄 **时间范围选择**: 24h / 7d / 30d / 365d
- 🤖 **模型测试**: 测试各个 AI 模型的流式生成
- 🔐 **安全检查**: 后端健康状态检查
- 📝 **配置管理**: 查看和重载模型配置

## 🔐 安全建议

- [ ] 修改 `ADMIN_TOKEN` 为复杂密码
- [ ] 隐藏 `.env` 文件（不要提交到 Git）
- [ ] 定期更新依赖: `npm audit fix`
- [ ] 启用 Cloudflare 防火墙规则
- [ ] 限制 API 调用频率
- [ ] 备份数据目录: `backend/data/`

## 📁 项目结构

```
ai-chat-app/
├── backend/                    # Node.js + Express 后端
│   ├── src/
│   │   ├── server.ts          # 入口文件
│   │   ├── config/            # 配置文件
│   │   ├── routes/            # API 路由
│   │   ├── services/          # 业务逻辑
│   │   └── utils/             # 工具函数
│   ├── dist/                  # 编译输出
│   ├── data/                  # 数据文件（metrics.json）
│   └── package.json
│
├── frontend/                   # React + TypeScript 前端
│   ├── src/
│   │   ├── App.tsx            # 根组件
│   │   ├── components/        # React 组件
│   │   ├── pages/             # 页面
│   │   ├── store/             # 状态管理
│   │   └── types/             # TypeScript 类型
│   ├── dist/                  # 构建输出
│   ├── server.js              # Express 服务器
│   └── package.json
│
├── scripts/                    # 自动化脚本
│   ├── deploy.sh              # 一键部署脚本
│   ├── diagnose.sh            # 诊断脚本
│   ├── setup-nginx.sh         # Nginx 配置脚本
│   └── stop.sh                # 停止脚本
│
└── docs/                       # 文档
    ├── README.md              # 本文件
    ├── DEPLOYMENT_GUIDE.md    # 详细部署指南
    ├── CLOUDFLARE_SETUP.md    # Cloudflare 配置
    └── QUICK_REFERENCE.md     # 快速参考
```

## 🛠️ 技术栈

### 后端
- **Node.js + TypeScript**: 类型安全的服务器
- **Express**: Web 框架
- **PM2**: 进程管理
- **Winston**: 日志管理
- **CORS**: 跨域资源共享

### 前端
- **React 18**: UI 框架
- **TypeScript**: 类型安全
- **Vite**: 极速构建工具
- **Tailwind CSS**: 原子化 CSS
- **Framer Motion**: 动画库
- **Zustand**: 状态管理

### 基础设施
- **Nginx**: 反向代理
- **PM2**: 进程守护
- **Cloudflare**: DNS + CDN
- **自定义端口 (6555+)**: 完全可配置

## 📚 完整文档

- [快速参考](./QUICK_REFERENCE.md) - 常用命令和配置
- [部署指南](./DEPLOYMENT_GUIDE.md) - 详细的部署步骤
- [Cloudflare 配置](./CLOUDFLARE_SETUP.md) - DNS 和代理设置
- [部署完成总结](./DEPLOYMENT_COMPLETE.md) - 检查清单

## 🆘 获取帮助

- 📖 查看文档: 本 README 和 docs/ 目录
- 🐛 报告问题: https://github.com/youshandebo/ai-chat-app/issues
- 💬 讨论: https://github.com/youshandebo/ai-chat-app/discussions

## 📄 许可证

MIT License - 自由使用和修改

## 🎯 下一步

1. **部署应用**: 使用 `bash scripts/deploy.sh` 一键部署
2. **配置 API Key**: 在 `backend/.env` 中添加 AI 模型的 API Key
3. **设置域名**: 配置 Cloudflare DNS（可选）
4. **监控应用**: 访问管理面板监控运行状态
5. **备份数据**: 定期备份 `backend/data/` 目录

---

**祝你使用愉快！** 🎉

如有任何问题，请参考 [部署指南](./DEPLOYMENT_GUIDE.md) 或 [快速参考](./QUICK_REFERENCE.md)
