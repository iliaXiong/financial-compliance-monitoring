# 🚀 立即部署 - 分步指南

## ✅ 第一步：依赖已安装

pg-boss 和其他依赖已经安装完成！

---

## 📋 第二步：创建 Supabase 项目

### 1. 访问 Supabase

打开浏览器，访问：https://supabase.com

### 2. 登录/注册

- 使用 GitHub 账号登录（推荐）
- 或使用邮箱注册

### 3. 创建新项目

点击 "New Project"，填写：

- **Organization**: 选择你的组织（或创建新的）
- **Name**: `financial-compliance-monitoring`
- **Database Password**: 设置一个强密码
  ```bash
  # 可以用这个命令生成：
  openssl rand -base64 24
  ```
  **⚠️ 重要：立即保存这个密码！**
  
- **Region**: 选择 `Singapore` 或 `Tokyo`（离中国最近）
- **Pricing Plan**: Free（默认）

点击 "Create new project"，等待约 2 分钟。

### 4. 获取连接信息

项目创建完成后：

1. 点击左侧 "Settings" → "Database"
2. 找到 "Connection string" 部分
3. 选择 "URI" 模式
4. 你会看到类似这样的连接字符串：
   ```
   postgresql://postgres:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
   ```

5. 记录以下信息：
   ```
   DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com
   DB_PORT=5432
   DB_NAME=postgres
   DB_USER=postgres
   DB_PASSWORD=你刚才设置的密码
   ```

---

## 📋 第三步：运行数据库迁移

在终端运行以下命令（替换为你的实际值）：

```bash
# 设置环境变量
export DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com
export DB_PORT=5432
export DB_NAME=postgres
export DB_USER=postgres
export DB_PASSWORD=你的Supabase密码

# 运行迁移
npm run migrate --prefix backend
```

你应该看到类似这样的输出：
```
✅ Creating table: users
✅ Creating table: tasks
✅ Creating table: executions
...
✅ All migrations completed successfully!
```

### 验证迁移

1. 回到 Supabase Dashboard
2. 点击左侧 "Table Editor"
3. 应该能看到 8 个表 + pgboss schema

---

## 📋 第四步：准备 LLM API 配置

你需要准备 Webull 内部 LLM API 的配置：

```
LLM_API_URL=你的Webull-LLM-URL
LLM_API_KEY=你的Webull-LLM-Key
LLM_MODEL=claude-sonnet-4
```

---

## 📋 第五步：部署到 Render

### 1. 访问 Render

打开浏览器，访问：https://render.com

### 2. 登录/注册

使用 GitHub 账号登录（推荐）

### 3. 创建 Web Service

1. 点击 "New +" → "Web Service"
2. 连接你的 GitHub 仓库
3. 选择你的项目仓库

### 4. 配置服务

填写以下信息：

- **Name**: `financial-compliance-backend`
- **Region**: `Singapore`
- **Branch**: `main`
- **Root Directory**: `backend`
- **Runtime**: `Node`
- **Build Command**: 
  ```
  npm install && npm run build
  ```
- **Start Command**: 
  ```
  node dist/index.pgboss.js
  ```
- **Plan**: `Free`

### 5. 添加环境变量

点击 "Advanced" → "Add Environment Variable"

复制以下内容（替换为你的实际值）：

```bash
NODE_ENV=production
PORT=3000
TZ=Asia/Shanghai

# Supabase 数据库
DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=你的Supabase密码

# JWT（生成一个随机字符串）
JWT_SECRET=你可以运行 openssl rand -base64 32 生成
JWT_EXPIRES_IN=7d

# LLM API
LLM_API_URL=你的Webull-LLM-URL
LLM_API_KEY=你的Webull-LLM-Key
LLM_MODEL=claude-sonnet-4
LLM_API_KEY_HEADER=Authorization
LLM_AUTH_PREFIX=Bearer

# 其他配置
JINA_READER_API_URL=https://r.jina.ai
MAX_PARALLEL_WEBSITES=5
RETRIEVAL_TIMEOUT_MS=30000
ENABLE_WEBSITE_ANALYZER=false
DEMO_MODE=false
```

### 6. 创建服务

点击 "Create Web Service"

等待部署完成（约 5 分钟）

### 7. 获取 URL

部署完成后，Render 会提供一个 URL：
```
https://financial-compliance-backend.onrender.com
```

---

## 📋 第六步：验证部署

### 测试后端

```bash
# 替换为你的实际 URL
curl https://your-app.onrender.com/health
```

应该返回：
```json
{
  "status": "healthy",
  "services": {
    "database": "up",
    "queue": "pg-boss"
  },
  "timestamp": "..."
}
```

---

## 📋 第七步：部署前端到 Vercel

### 1. 更新前端配置

编辑 `vercel.json`，将后端 URL 替换为你的 Render URL：

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://your-app.onrender.com/api/:path*"
    }
  ]
}
```

### 2. 部署到 Vercel

```bash
# 安装 Vercel CLI（如果还没安装）
npm install -g vercel

# 登录
vercel login

# 部署
vercel --prod
```

### 3. 设置环境变量

在 Vercel Dashboard：
- 进入项目 → Settings → Environment Variables
- 添加：
  ```
  VITE_API_BASE_URL=https://your-app.onrender.com
  ```

---

## 🎉 完成！

你的系统现在已经部署完成：

- ✅ 数据库：Supabase PostgreSQL（免费）
- ✅ 任务队列：pg-boss（使用 PostgreSQL）
- ✅ 后端：Render（免费）
- ✅ 前端：Vercel（免费）

**总成本**: $0/月

---

## 🔍 下一步

### 测试功能

1. 访问你的 Vercel URL
2. 注册账号并登录
3. 创建测试任务
4. 手动执行任务
5. 查看结果

### 监控

```bash
# 查看 Render 日志
# 在 Render Dashboard → Logs

# 查看 Vercel 日志
vercel logs
```

### 查看队列状态

在 Supabase Dashboard → SQL Editor：

```sql
-- 查看待处理的任务
SELECT * FROM pgboss.job 
WHERE state = 'created' 
ORDER BY createdon DESC 
LIMIT 10;

-- 查看队列统计
SELECT state, COUNT(*) 
FROM pgboss.job 
GROUP BY state;
```

---

## ❓ 遇到问题？

### 数据库连接失败

```bash
# 测试连接
psql "postgresql://postgres:password@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
```

### 后端启动失败

查看 Render 日志，常见问题：
- 环境变量配置错误
- 数据库连接失败
- Start Command 错误（应该是 `node dist/index.pgboss.js`）

### 前端无法连接后端

- 检查 `vercel.json` 中的后端 URL
- 检查 Render 服务是否在运行
- 检查 CORS 配置

---

**祝部署顺利！** 🚀

如有问题，查看：
- [完整文档](./DEPLOY_SUPABASE_COMPLETE.md)
- [技术细节](./DEPLOY_SUPABASE_ONLY.md)
