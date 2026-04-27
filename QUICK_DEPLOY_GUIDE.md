# 快速部署指南

## 5 分钟快速部署到 Vercel + Railway + Supabase

### 第一步：准备数据库（Supabase）

1. 访问 https://supabase.com 并登录
2. 创建新项目，记录数据库密码
3. 获取连接信息：Settings → Database → Connection string
4. 本地运行迁移：
   ```bash
   export DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com
   export DB_PASSWORD=your-password
   cd backend && npm run migrate
   ```

### 第二步：准备 Redis（Upstash）

1. 访问 https://upstash.com 并登录
2. 创建 Redis 数据库（选择最近的区域）
3. 记录连接信息：Endpoint 和 Password

### 第三步：部署后端（Railway）

```bash
# 安装 Railway CLI
npm install -g @railway/cli

# 登录
railway login

# 初始化项目
railway init

# 设置环境变量（一次性复制粘贴）
railway variables set \
  NODE_ENV=production \
  PORT=3000 \
  TZ=Asia/Shanghai \
  DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com \
  DB_PORT=5432 \
  DB_NAME=postgres \
  DB_USER=postgres \
  DB_PASSWORD=your-supabase-password \
  REDIS_HOST=your-redis.upstash.io \
  REDIS_PORT=6379 \
  REDIS_PASSWORD=your-upstash-password \
  JWT_SECRET=$(openssl rand -base64 32) \
  LLM_API_URL=your-llm-url \
  LLM_API_KEY=your-llm-key \
  LLM_MODEL=claude-sonnet-4 \
  JINA_READER_API_URL=https://r.jina.ai

# 部署
cd backend && railway up
```

获取后端 URL：Railway Dashboard → Settings → Domains → Generate Domain

### 第四步：部署前端（Vercel）

```bash
# 安装 Vercel CLI
npm install -g vercel

# 登录
vercel login

# 更新 vercel.json 中的后端 URL
# 将 "https://your-backend-url.railway.app" 替换为实际的 Railway URL

# 部署
vercel --prod
```

在 Vercel Dashboard 设置环境变量：
- `VITE_API_BASE_URL`: `https://your-backend-url.railway.app`

### 第五步：验证

1. 访问 Vercel URL
2. 注册账号并登录
3. 创建测试任务
4. 手动执行任务
5. 查看结果

完成！🎉

---

## 详细文档

完整的部署指南请查看：[VERCEL_SUPABASE_DEPLOYMENT.md](./VERCEL_SUPABASE_DEPLOYMENT.md)
