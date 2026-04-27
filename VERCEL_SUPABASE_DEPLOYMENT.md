# Vercel + Supabase 部署指南

本指南将帮助你将金融合规监测系统部署到生产环境：
- **前端**: Vercel（免费）
- **数据库**: Supabase PostgreSQL（免费 500MB）
- **缓存/队列**: Upstash Redis（免费 10K 命令/天）
- **后端**: Railway（推荐，$5/月）或 Render（免费层可用）

## 架构说明

```
┌─────────────┐
│   Vercel    │  ← 前端 (React + Vite)
│  (Frontend) │
└──────┬──────┘
       │ API 请求
       ↓
┌─────────────┐
│   Railway   │  ← 后端 (Node.js + Express + BullMQ)
│  (Backend)  │
└──────┬──────┘
       │
       ├─────→ ┌──────────────┐
       │       │   Supabase   │  ← PostgreSQL 数据库
       │       │  (Database)  │
       │       └──────────────┘
       │
       └─────→ ┌──────────────┐
               │   Upstash    │  ← Redis (任务队列)
               │   (Redis)    │
               └──────────────┘
```

## 前置准备

### 1. 注册账号

- [Vercel](https://vercel.com) - 前端托管
- [Supabase](https://supabase.com) - PostgreSQL 数据库
- [Upstash](https://upstash.com) - Redis 服务
- [Railway](https://railway.app) 或 [Render](https://render.com) - 后端托管

### 2. 安装 CLI 工具

```bash
# Vercel CLI
npm install -g vercel

# Railway CLI (如果选择 Railway)
npm install -g @railway/cli

# Supabase CLI (可选，用于数据库迁移)
npm install -g supabase
```

---

## 第一步：部署数据库到 Supabase

### 1. 创建 Supabase 项目

1. 登录 [Supabase Dashboard](https://app.supabase.com)
2. 点击 "New Project"
3. 填写项目信息：
   - **Name**: financial-compliance-monitoring
   - **Database Password**: 设置一个强密码（保存好！）
   - **Region**: 选择离你最近的区域（建议：Singapore 或 Tokyo）
4. 点击 "Create new project"，等待约 2 分钟

### 2. 获取数据库连接信息

在项目 Dashboard 中：
1. 进入 "Settings" → "Database"
2. 找到 "Connection string" 部分
3. 选择 "URI" 模式，复制连接字符串：
   ```
   postgresql://postgres:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
   ```
4. 记录以下信息：
   - **Host**: `aws-0-ap-southeast-1.pooler.supabase.com`
   - **Port**: `5432`
   - **Database**: `postgres`
   - **User**: `postgres`
   - **Password**: 你设置的密码

### 3. 运行数据库迁移

在本地运行迁移脚本，将表结构创建到 Supabase：

```bash
# 设置环境变量
export DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com
export DB_PORT=5432
export DB_NAME=postgres
export DB_USER=postgres
export DB_PASSWORD=your-supabase-password

# 运行迁移
cd backend
npm run migrate
```

### 4. 验证数据库

在 Supabase Dashboard：
1. 进入 "Table Editor"
2. 应该能看到以下表：
   - users
   - tasks
   - executions
   - retrieval_results
   - original_contents
   - summary_documents
   - comparison_reports
   - cross_site_analyses

---

## 第二步：部署 Redis 到 Upstash

### 1. 创建 Redis 数据库

1. 登录 [Upstash Console](https://console.upstash.com)
2. 点击 "Create Database"
3. 填写信息：
   - **Name**: financial-compliance-redis
   - **Type**: Regional
   - **Region**: 选择离你最近的区域
   - **TLS**: 启用
4. 点击 "Create"

### 2. 获取连接信息

在数据库详情页：
1. 找到 "REST API" 部分
2. 记录以下信息：
   - **Endpoint**: `your-redis.upstash.io`
   - **Port**: `6379`
   - **Password**: 显示的密码

---

## 第三步：部署后端到 Railway

### 方式 A：使用 Railway CLI（推荐）

```bash
# 1. 登录 Railway
railway login

# 2. 创建新项目
railway init

# 3. 进入 backend 目录
cd backend

# 4. 设置环境变量
railway variables set NODE_ENV=production
railway variables set PORT=3000
railway variables set TZ=Asia/Shanghai

# 数据库配置
railway variables set DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com
railway variables set DB_PORT=5432
railway variables set DB_NAME=postgres
railway variables set DB_USER=postgres
railway variables set DB_PASSWORD=your-supabase-password

# Redis 配置
railway variables set REDIS_HOST=your-redis.upstash.io
railway variables set REDIS_PORT=6379
railway variables set REDIS_PASSWORD=your-upstash-password

# JWT 配置
railway variables set JWT_SECRET=$(openssl rand -base64 32)
railway variables set JWT_EXPIRES_IN=7d

# LLM 配置
railway variables set LLM_API_URL=your-webull-llm-url
railway variables set LLM_API_KEY=your-webull-llm-key
railway variables set LLM_MODEL=claude-sonnet-4
railway variables set LLM_API_KEY_HEADER=Authorization
railway variables set LLM_AUTH_PREFIX=Bearer

# 其他配置
railway variables set JINA_READER_API_URL=https://r.jina.ai
railway variables set MAX_PARALLEL_WEBSITES=5
railway variables set RETRIEVAL_TIMEOUT_MS=30000
railway variables set ENABLE_WEBSITE_ANALYZER=false

# 5. 部署
railway up
```

### 方式 B：使用 Railway Dashboard

1. 登录 [Railway Dashboard](https://railway.app)
2. 点击 "New Project" → "Deploy from GitHub repo"
3. 连接你的 GitHub 仓库
4. 选择 `backend` 目录作为根目录
5. 在 "Variables" 标签页添加所有环境变量（参考上面的列表）
6. 点击 "Deploy"

### 获取后端 URL

部署完成后：
1. 在 Railway Dashboard 中找到你的服务
2. 进入 "Settings" → "Domains"
3. 点击 "Generate Domain"
4. 记录生成的 URL，例如：`https://your-app.railway.app`

### 验证后端

```bash
# 健康检查
curl https://your-app.railway.app/health

# 应该返回：
# {"status":"ok","timestamp":"..."}
```

---

## 第四步：部署前端到 Vercel

### 1. 更新前端配置

编辑 `frontend/.env.production`：

```bash
VITE_API_BASE_URL=https://your-app.railway.app
```

### 2. 更新 vercel.json

编辑根目录的 `vercel.json`，更新后端 URL：

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://your-app.railway.app/api/:path*"
    }
  ]
}
```

### 3. 部署到 Vercel

#### 方式 A：使用 Vercel CLI

```bash
# 在项目根目录
vercel login
vercel

# 按提示操作：
# - Set up and deploy? Yes
# - Which scope? 选择你的账号
# - Link to existing project? No
# - Project name? financial-compliance-monitoring
# - In which directory is your code located? ./
# - Want to override the settings? No

# 部署到生产环境
vercel --prod
```

#### 方式 B：使用 Vercel Dashboard

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 "Add New..." → "Project"
3. 导入你的 Git 仓库
4. 配置项目：
   - **Framework Preset**: Vite
   - **Root Directory**: `./`（保持默认）
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Output Directory**: `frontend/dist`
5. 添加环境变量：
   - `VITE_API_BASE_URL`: `https://your-app.railway.app`
6. 点击 "Deploy"

### 4. 配置自定义域名（可选）

在 Vercel Dashboard：
1. 进入项目 → "Settings" → "Domains"
2. 添加你的域名
3. 按照提示配置 DNS 记录

---

## 第五步：验证部署

### 1. 测试前端

访问你的 Vercel URL：`https://your-app.vercel.app`

- 应该能看到登录页面
- 界面样式正常显示

### 2. 测试后端连接

1. 在前端注册一个账号
2. 登录系统
3. 创建一个测试任务
4. 手动执行任务
5. 查看执行结果

### 3. 测试定时任务

1. 创建一个每日任务
2. 等待任务自动执行（或手动触发）
3. 检查 Railway 日志：
   ```bash
   railway logs
   ```

---

## 环境变量总结

### Vercel (Frontend)

| 变量名 | 值 |
|--------|-----|
| `VITE_API_BASE_URL` | `https://your-app.railway.app` |

### Railway (Backend)

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `NODE_ENV` | `production` | 运行环境 |
| `PORT` | `3000` | 服务端口 |
| `TZ` | `Asia/Shanghai` | 时区 |
| `DB_HOST` | `aws-0-ap-southeast-1.pooler.supabase.com` | Supabase 数据库地址 |
| `DB_PORT` | `5432` | 数据库端口 |
| `DB_NAME` | `postgres` | 数据库名称 |
| `DB_USER` | `postgres` | 数据库用户 |
| `DB_PASSWORD` | `your-password` | Supabase 数据库密码 |
| `REDIS_HOST` | `your-redis.upstash.io` | Upstash Redis 地址 |
| `REDIS_PORT` | `6379` | Redis 端口 |
| `REDIS_PASSWORD` | `your-password` | Upstash Redis 密码 |
| `JWT_SECRET` | `random-string` | JWT 密钥（使用强随机字符串） |
| `JWT_EXPIRES_IN` | `7d` | JWT 过期时间 |
| `LLM_API_URL` | `your-url` | Webull LLM API 地址 |
| `LLM_API_KEY` | `your-key` | Webull LLM API 密钥 |
| `LLM_MODEL` | `claude-sonnet-4` | LLM 模型 |
| `JINA_READER_API_URL` | `https://r.jina.ai` | Jina Reader API |
| `MAX_PARALLEL_WEBSITES` | `5` | 最大并行网站数 |
| `RETRIEVAL_TIMEOUT_MS` | `30000` | 检索超时时间 |

---

## 成本估算

### 免费层

- **Vercel**: 免费（100GB 带宽/月）
- **Supabase**: 免费（500MB 数据库，无限 API 请求）
- **Upstash**: 免费（10K 命令/天，256MB 存储）
- **Railway**: $5/月（500 小时运行时间）

### 总成本

- **最低**: $5/月（Railway）
- **推荐**: $5-10/月（取决于使用量）

---

## 故障排除

### 问题 1：前端无法连接后端

**症状**: 前端显示网络错误

**解决方案**:
1. 检查 `VITE_API_BASE_URL` 是否正确
2. 确认后端服务正在运行：`curl https://your-app.railway.app/health`
3. 检查 Railway 日志：`railway logs`
4. 确认 CORS 配置正确（后端应该允许 Vercel 域名）

### 问题 2：数据库连接失败

**症状**: 后端日志显示数据库连接错误

**解决方案**:
1. 检查 Supabase 数据库是否在线
2. 验证数据库连接信息是否正确
3. 确认 Supabase 防火墙允许 Railway IP
4. 测试连接：
   ```bash
   psql "postgresql://postgres:password@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
   ```

### 问题 3：Redis 连接失败

**症状**: 任务队列不工作

**解决方案**:
1. 检查 Upstash Redis 是否在线
2. 验证 Redis 连接信息
3. 确认 TLS 配置正确
4. 测试连接：
   ```bash
   redis-cli -h your-redis.upstash.io -p 6379 -a your-password --tls
   ```

### 问题 4：任务不自动执行

**症状**: 定时任务没有按计划执行

**解决方案**:
1. 检查 Railway 服务是否持续运行（不要使用 Serverless 模式）
2. 查看 BullMQ Worker 日志
3. 确认时区设置正确（`TZ=Asia/Shanghai`）
4. 检查 Redis 连接是否稳定

### 问题 5：LLM API 调用失败

**症状**: 总结生成失败

**解决方案**:
1. 验证 LLM API 配置是否正确
2. 检查 API 密钥是否有效
3. 确认 Railway 可以访问 Webull 内部 API
4. 查看详细错误日志

---

## 监控和维护

### 1. 日志查看

```bash
# Railway 日志
railway logs --tail

# Vercel 日志
vercel logs
```

### 2. 数据库监控

在 Supabase Dashboard：
- "Database" → "Usage" 查看存储使用情况
- "Database" → "Logs" 查看查询日志

### 3. Redis 监控

在 Upstash Console：
- 查看命令使用量
- 监控内存使用

### 4. 性能优化

- 定期清理旧的执行记录
- 优化数据库查询（添加索引）
- 调整 BullMQ 并发设置
- 使用 CDN 加速前端资源

---

## 安全建议

1. **定期更新依赖**
   ```bash
   npm audit
   npm update
   ```

2. **使用强密码**
   - 数据库密码至少 16 字符
   - JWT Secret 使用随机生成的字符串

3. **启用 HTTPS**
   - Vercel 和 Railway 默认启用
   - 确保所有 API 调用使用 HTTPS

4. **限制数据库访问**
   - 在 Supabase 中配置 IP 白名单（如果需要）
   - 使用只读用户进行查询操作

5. **监控异常活动**
   - 设置 Sentry 或其他错误追踪服务
   - 配置告警通知

---

## 下一步

部署完成后，你可以：

1. **配置自定义域名**
   - 在 Vercel 添加你的域名
   - 配置 DNS 记录

2. **设置 CI/CD**
   - Vercel 和 Railway 都支持 Git 自动部署
   - 推送到 main 分支自动触发部署

3. **添加监控**
   - 集成 Sentry 进行错误追踪
   - 使用 Uptime Robot 监控服务可用性

4. **优化性能**
   - 启用 Vercel Edge Network
   - 配置缓存策略
   - 优化数据库查询

---

## 支持

如有问题，请：
- 查看 Railway/Vercel/Supabase 官方文档
- 检查服务状态页面
- 查看项目日志进行调试

祝部署顺利！🚀
