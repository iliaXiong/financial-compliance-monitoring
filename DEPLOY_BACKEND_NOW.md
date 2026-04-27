# 🚀 立即部署后端 - 分步指南

跟随这个指南，15 分钟内完成后端部署。

---

## 第一步：创建 Supabase 数据库（5 分钟）

### 1.1 注册并创建项目

1. 访问 https://supabase.com
2. 点击 "Start your project"
3. 使用 GitHub 账号登录（推荐）或邮箱注册
4. 点击 "New Project"

### 1.2 配置项目

填写以下信息：
- **Name**: `financial-compliance-monitoring`
- **Database Password**: 设置一个强密码（至少 16 字符）
  ```
  建议使用密码生成器：
  openssl rand -base64 24
  ```
  **⚠️ 重要：立即保存这个密码！**
  
- **Region**: 选择 `Singapore` 或 `Tokyo`（离中国最近）
- **Pricing Plan**: Free（默认）

点击 "Create new project"，等待约 2 分钟。

### 1.3 获取数据库连接信息

项目创建完成后：

1. 进入项目 Dashboard
2. 点击左侧 "Settings" → "Database"
3. 找到 "Connection string" 部分
4. 选择 "URI" 模式
5. 复制连接字符串（类似这样）：
   ```
   postgresql://postgres:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
   ```

6. 记录以下信息（后面会用到）：
   ```
   DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com
   DB_PORT=5432
   DB_NAME=postgres
   DB_USER=postgres
   DB_PASSWORD=你设置的密码
   ```

✅ **Supabase 数据库创建完成！**

---

## 第二步：创建 Upstash Redis（3 分钟）

### 2.1 注册并创建数据库

1. 访问 https://upstash.com
2. 使用 GitHub 账号登录或邮箱注册
3. 点击 "Create Database"

### 2.2 配置数据库

填写以下信息：
- **Name**: `financial-compliance-redis`
- **Type**: Regional（默认）
- **Region**: 选择 `ap-southeast-1` (Singapore) 或 `ap-northeast-1` (Tokyo)
- **TLS**: 启用（默认）
- **Eviction**: 选择 `noeviction`（推荐）

点击 "Create"。

### 2.3 获取连接信息

数据库创建完成后：

1. 在数据库详情页，找到 "REST API" 部分
2. 记录以下信息：
   ```
   REDIS_HOST=your-redis-xxxxx.upstash.io
   REDIS_PORT=6379
   REDIS_PASSWORD=显示的密码（点击眼睛图标查看）
   ```

✅ **Upstash Redis 创建完成！**

---

## 第三步：运行数据库迁移（2 分钟）

现在需要在 Supabase 数据库中创建表结构。

### 3.1 设置环境变量

在项目根目录打开终端，运行：

```bash
# 设置 Supabase 连接信息（替换为你的实际值）
export DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com
export DB_PORT=5432
export DB_NAME=postgres
export DB_USER=postgres
export DB_PASSWORD=你的Supabase密码
```

### 3.2 运行迁移脚本

```bash
# 进入 backend 目录
cd backend

# 安装依赖（如果还没安装）
npm install

# 运行数据库迁移
npm run migrate
```

你应该看到类似这样的输出：
```
✅ Creating table: users
✅ Creating table: tasks
✅ Creating table: executions
✅ Creating table: retrieval_results
✅ Creating table: original_contents
✅ Creating table: summary_documents
✅ Creating table: comparison_reports
✅ Creating table: cross_site_analyses
✅ All migrations completed successfully!
```

### 3.3 验证表已创建

1. 回到 Supabase Dashboard
2. 点击左侧 "Table Editor"
3. 应该能看到 8 个表：
   - users
   - tasks
   - executions
   - retrieval_results
   - original_contents
   - summary_documents
   - comparison_reports
   - cross_site_analyses

✅ **数据库迁移完成！**

```bash
# 返回项目根目录
cd ..
```

---

## 第四步：部署后端到 Railway（10 分钟）

### 4.1 安装 Railway CLI

```bash
# 安装 Railway CLI
npm install -g @railway/cli

# 验证安装
railway --version
```

### 4.2 登录 Railway

```bash
railway login
```

这会打开浏览器，使用 GitHub 账号登录。

### 4.3 创建 Railway 项目

```bash
# 初始化项目
railway init

# 按提示操作：
# - Project name: financial-compliance-backend
# - 选择 "Empty Project"
```

### 4.4 配置环境变量

现在我们需要设置所有环境变量。我准备了一个交互式脚本：

```bash
# 运行配置脚本
./scripts/setup-env.sh
```

脚本会提示你输入：
1. Supabase 数据库信息（第一步获取的）
2. Upstash Redis 信息（第二步获取的）
3. LLM API 配置（Webull 内部 API）

**或者手动设置环境变量：**

```bash
# 基础配置
railway variables set NODE_ENV=production
railway variables set PORT=3000
railway variables set TZ=Asia/Shanghai

# Supabase 数据库配置
railway variables set DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com
railway variables set DB_PORT=5432
railway variables set DB_NAME=postgres
railway variables set DB_USER=postgres
railway variables set DB_PASSWORD=你的Supabase密码

# Upstash Redis 配置
railway variables set REDIS_HOST=your-redis.upstash.io
railway variables set REDIS_PORT=6379
railway variables set REDIS_PASSWORD=你的Upstash密码

# JWT 配置（生成随机密钥）
railway variables set JWT_SECRET=$(openssl rand -base64 32)
railway variables set JWT_EXPIRES_IN=7d

# LLM API 配置（Webull 内部 Claude）
railway variables set LLM_API_URL=你的Webull-LLM-URL
railway variables set LLM_API_KEY=你的Webull-LLM-Key
railway variables set LLM_MODEL=claude-sonnet-4
railway variables set LLM_API_KEY_HEADER=Authorization
railway variables set LLM_AUTH_PREFIX=Bearer

# 其他配置
railway variables set JINA_READER_API_URL=https://r.jina.ai
railway variables set MAX_PARALLEL_WEBSITES=5
railway variables set RETRIEVAL_TIMEOUT_MS=30000
railway variables set ENABLE_WEBSITE_ANALYZER=false
railway variables set DEMO_MODE=false
```

### 4.5 部署后端

```bash
# 进入 backend 目录
cd backend

# 部署到 Railway
railway up

# 等待部署完成（约 2-3 分钟）
```

你会看到类似这样的输出：
```
✓ Building...
✓ Deploying...
✓ Success! Deployed to Railway
```

### 4.6 生成域名

```bash
# 在 Railway Dashboard 生成域名
railway domain
```

或者在网页操作：
1. 访问 https://railway.app/dashboard
2. 选择你的项目
3. 点击 "Settings" → "Domains"
4. 点击 "Generate Domain"
5. 记录生成的 URL，例如：`https://financial-compliance-backend-production.up.railway.app`

### 4.7 验证后端部署

```bash
# 测试健康检查（替换为你的实际 URL）
curl https://your-app.railway.app/health

# 应该返回：
# {"status":"ok","timestamp":"2024-..."}
```

✅ **后端部署完成！**

---

## 第五步：检查部署状态（2 分钟）

运行部署检查脚本：

```bash
# 返回项目根目录
cd ..

# 运行检查脚本
./scripts/check-deployment.sh
```

按提示输入你的 Railway 后端 URL。

---

## 🎉 完成！

你的后端已成功部署到：
- **数据库**: Supabase PostgreSQL（免费 500MB）
- **缓存**: Upstash Redis（免费 10K 命令/天）
- **后端**: Railway（$5/月）

### 📝 记录重要信息

请将以下信息保存到安全的地方：

```
# Supabase
DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com
DB_PASSWORD=你的密码

# Upstash
REDIS_HOST=your-redis.upstash.io
REDIS_PASSWORD=你的密码

# Railway
后端 URL=https://your-app.railway.app
JWT_SECRET=自动生成的密钥

# LLM
LLM_API_URL=你的URL
LLM_API_KEY=你的Key
```

### 🔍 查看日志

```bash
# 查看后端日志
railway logs --tail

# 查看最近 100 行
railway logs --tail 100
```

### 🔄 更新部署

```bash
# 修改代码后重新部署
cd backend
railway up
```

---

## 下一步：部署前端

现在后端已经部署完成，你可以：

1. **部署前端到 Vercel**：
   ```bash
   # 更新 vercel.json 中的后端 URL
   # 然后运行
   vercel --prod
   ```

2. **测试后端 API**：
   ```bash
   # 注册用户
   curl -X POST https://your-app.railway.app/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password123","name":"Test User"}'
   ```

3. **查看完整部署指南**：
   - [部署前端](./VERCEL_SUPABASE_DEPLOYMENT.md#第四步部署前端到-vercel)
   - [部署检查清单](./deploy-checklist.md)

---

## ❓ 遇到问题？

### 数据库连接失败

```bash
# 测试数据库连接
psql "postgresql://postgres:password@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
```

### Redis 连接失败

```bash
# 测试 Redis 连接
redis-cli -h your-redis.upstash.io -p 6379 -a your-password --tls
```

### Railway 部署失败

```bash
# 查看详细日志
railway logs

# 检查环境变量
railway variables
```

### 查看故障排除指南

[VERCEL_SUPABASE_DEPLOYMENT.md#故障排除](./VERCEL_SUPABASE_DEPLOYMENT.md#故障排除)

---

**祝部署顺利！** 🚀
