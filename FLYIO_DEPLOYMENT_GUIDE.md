# 🚀 Fly.io + Supabase 部署指南（完全免费，不休眠）

## ✨ 为什么选择 Fly.io？

- ✅ **完全免费**（3 个免费实例）
- ✅ **不会休眠**（24/7 运行）
- ✅ **无需改造代码**（使用 Docker）
- ✅ **全球 CDN**
- ✅ **自动 HTTPS**

---

## 📦 准备工作

### 1. 安装 Fly.io CLI

**macOS**:
```bash
brew install flyctl
```

**Linux**:
```bash
curl -L https://fly.io/install.sh | sh
```

### 2. 登录 Fly.io
```bash
flyctl auth login
```

---

## 🐳 创建 Dockerfile

我会为你创建一个优化的 Dockerfile。

---

## 🚀 部署步骤

### 第一步：初始化 Fly.io 应用（2 分钟）

```bash
cd backend
flyctl launch --no-deploy
```

配置选项：
- App Name: `financial-compliance-backend`
- Region: `sin` (Singapore) 或 `hkg` (Hong Kong)
- PostgreSQL: `No`（我们用 Supabase）
- Redis: `No`（我们用 pg-boss）

### 第二步：配置环境变量（3 分钟）

```bash
# 数据库配置
flyctl secrets set DB_HOST=db.tzvxumvbucztaaaqlugv.supabase.co
flyctl secrets set DB_PORT=5432
flyctl secrets set DB_NAME=postgres
flyctl secrets set DB_USER=postgres
flyctl secrets set DB_PASSWORD=KhpGTR6dMFzZz7qq

# JWT 配置
flyctl secrets set JWT_SECRET=IVyGa5HGayEHQesrzZd3lVhdMynDks4vbbQQ/jnYRhI=
flyctl secrets set JWT_EXPIRES_IN=7d

# LLM 配置
flyctl secrets set LLM_API_URL=https://office.webullbroker.com/api/oa-ai/open/chat/completions
flyctl secrets set LLM_API_KEY=dcb0d1c8-82c7-478f-bd9a-7c3023cac4d8
flyctl secrets set LLM_MODEL=us.anthropic.claude-sonnet-4-20250514-v1:0
flyctl secrets set LLM_API_KEY_HEADER=authorization
flyctl secrets set LLM_AUTH_PREFIX=Bearer

# 其他配置
flyctl secrets set NODE_ENV=production
flyctl secrets set JINA_READER_API_URL=https://r.jina.ai
flyctl secrets set MAX_PARALLEL_WEBSITES=5
flyctl secrets set RETRIEVAL_TIMEOUT_MS=30000
flyctl secrets set ENABLE_WEBSITE_ANALYZER=true
flyctl secrets set DEMO_MODE=false
```

### 第三步：部署（5 分钟）

```bash
flyctl deploy
```

### 第四步：验证（1 分钟）

```bash
# 查看应用状态
flyctl status

# 查看日志
flyctl logs

# 测试健康检查
curl https://financial-compliance-backend.fly.dev/health
```

---

## 📝 配置文件

### fly.toml
```toml
app = "financial-compliance-backend"
primary_region = "sin"

[build]
  dockerfile = "Dockerfile"

[env]
  PORT = "3000"
  TZ = "Asia/Shanghai"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = false
  auto_start_machines = false
  min_machines_running = 1

[[services]]
  protocol = "tcp"
  internal_port = 3000

  [[services.ports]]
    port = 80
    handlers = ["http"]
    force_https = true

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

  [services.concurrency]
    type = "connections"
    hard_limit = 25
    soft_limit = 20

  [[services.tcp_checks]]
    interval = "15s"
    timeout = "2s"
    grace_period = "5s"

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 256
```

### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# 复制 package.json
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY . .

# 构建
RUN npm run build

# 运行数据库迁移和启动应用
CMD npm run migrate && npm start
```

---

## 🎯 完整部署脚本

我会创建一个自动化脚本帮你完成所有步骤。

---

## 💰 成本说明

### Fly.io 免费层
- ✅ 3 个免费实例（256MB RAM）
- ✅ 3GB 持久化存储
- ✅ 160GB 出站流量/月
- ✅ 完全够用！

### 与 Render 对比

| 特性 | Fly.io | Render |
|------|--------|--------|
| 成本 | 免费 | 免费 |
| 休眠 | 否 | 是（15分钟） |
| 内存 | 256MB | 512MB |
| 启动时间 | 即时 | 30-60秒 |
| 推荐度 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

---

## 🔧 高级配置

### 自动扩展
```toml
[http_service]
  min_machines_running = 1
  max_machines_running = 3
```

### 健康检查
```toml
[[services.http_checks]]
  interval = "10s"
  timeout = "2s"
  grace_period = "5s"
  method = "get"
  path = "/health"
```

---

## 📊 监控和日志

### 查看实时日志
```bash
flyctl logs -a financial-compliance-backend
```

### 查看应用状态
```bash
flyctl status
```

### 查看资源使用
```bash
flyctl vm status
```

---

## 🆘 故障排查

### 部署失败
```bash
# 查看构建日志
flyctl logs --build

# 重新部署
flyctl deploy --force
```

### 应用崩溃
```bash
# 查看日志
flyctl logs

# 重启应用
flyctl apps restart
```

### 数据库连接失败
```bash
# 检查环境变量
flyctl secrets list

# 测试数据库连接
flyctl ssh console
> node -e "require('pg').Pool({...}).query('SELECT 1')"
```

---

## 🎉 完成！

部署完成后，你的应用将：
- ✅ 24/7 运行，不会休眠
- ✅ 自动 HTTPS
- ✅ 全球 CDN
- ✅ 完全免费

**应用 URL**: `https://financial-compliance-backend.fly.dev`

---

## 🚀 下一步

1. 部署前端到 Vercel
2. 更新前端 API URL
3. 测试完整功能

---

## 📚 相关资源

- Fly.io 文档: https://fly.io/docs
- Fly.io 定价: https://fly.io/docs/about/pricing
- Fly.io 状态: https://status.fly.io

---

想要立即开始部署吗？我可以帮你创建所有需要的配置文件！
