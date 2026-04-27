# 🚀 部署命令速查

## 已完成

✅ 依赖已安装（pg-boss）

---

## 快速命令

### 1. 生成 JWT Secret

```bash
openssl rand -base64 32
```

### 2. 运行数据库迁移

```bash
# 设置环境变量（替换为你的实际值）
export DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com
export DB_PORT=5432
export DB_NAME=postgres
export DB_USER=postgres
export DB_PASSWORD=你的Supabase密码

# 运行迁移
npm run migrate --prefix backend
```

### 3. 本地测试

```bash
# 在 backend 目录
npm run dev --prefix backend
```

### 4. 部署到 Vercel

```bash
vercel --prod
```

---

## Render 环境变量模板

复制以下内容到 Render Dashboard（替换实际值）：

```bash
NODE_ENV=production
PORT=3000
TZ=Asia/Shanghai

DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=你的密码

JWT_SECRET=生成的随机字符串
JWT_EXPIRES_IN=7d

LLM_API_URL=你的URL
LLM_API_KEY=你的Key
LLM_MODEL=claude-sonnet-4
LLM_API_KEY_HEADER=Authorization
LLM_AUTH_PREFIX=Bearer

JINA_READER_API_URL=https://r.jina.ai
MAX_PARALLEL_WEBSITES=5
RETRIEVAL_TIMEOUT_MS=30000
ENABLE_WEBSITE_ANALYZER=false
DEMO_MODE=false
```

---

## 重要配置

### Render Build Command
```
npm install && npm run build
```

### Render Start Command
```
node dist/index.pgboss.js
```

**注意**：必须是 `index.pgboss.js`，不是 `index.js`！

---

## 验证命令

```bash
# 测试后端健康检查
curl https://your-app.onrender.com/health

# 测试数据库连接
psql "postgresql://postgres:password@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"

# 查看 Render 日志
# 在 Render Dashboard → Logs

# 查看 Vercel 日志
vercel logs
```

---

## SQL 查询（在 Supabase Dashboard）

```sql
-- 查看所有表
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- 查看 pg-boss 任务
SELECT * FROM pgboss.job 
ORDER BY createdon DESC 
LIMIT 10;

-- 查看队列统计
SELECT state, COUNT(*) 
FROM pgboss.job 
GROUP BY state;
```

---

## 故障排除

### 问题：数据库迁移失败

```bash
# 检查连接
psql "postgresql://postgres:password@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres" -c "SELECT 1"
```

### 问题：Render 部署失败

检查：
1. Build Command 是否正确
2. Start Command 是否是 `node dist/index.pgboss.js`
3. 环境变量是否都设置了

### 问题：前端无法连接后端

检查：
1. `vercel.json` 中的后端 URL
2. Render 服务是否在运行
3. 浏览器控制台的错误信息

---

**准备好了吗？** 查看 [DEPLOY_NOW.md](./DEPLOY_NOW.md) 开始部署！
