# 🎉 完全免费部署方案 - 只使用 Supabase

这个方案使用 PostgreSQL 替代 Redis + BullMQ，实现完全免费的部署！

## 架构变化

### 之前（需要 Redis）
```
Backend → PostgreSQL (数据存储)
       → Redis + BullMQ (任务队列)
```

### 现在（只需 PostgreSQL）
```
Backend → PostgreSQL (数据存储 + 任务队列)
          使用 pg-boss 库
```

## 优点

✅ **完全免费** - 只需要 Supabase PostgreSQL（免费 500MB）
✅ **简化架构** - 不需要 Redis 和 Upstash
✅ **更少依赖** - 只需要一个数据库
✅ **事务支持** - 任务队列和数据在同一个数据库中
✅ **更容易部署** - 减少了配置步骤

## 缺点

⚠️ **性能稍低** - PostgreSQL 队列比 Redis 慢（但对大多数场景足够）
⚠️ **数据库负载** - 任务队列会增加数据库负载

---

## 部署步骤

### 第一步：创建 Supabase 项目（5 分钟）

1. 访问 https://supabase.com
2. 创建新项目：`financial-compliance-monitoring`
3. 设置数据库密码并保存
4. 等待项目创建完成（约 2 分钟）
5. 获取连接信息：
   ```
   DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com
   DB_PORT=5432
   DB_NAME=postgres
   DB_USER=postgres
   DB_PASSWORD=你的密码
   ```

### 第二步：安装新依赖（1 分钟）

```bash
cd backend
npm install
```

这会安装 `pg-boss` 替代 `bullmq` 和 `redis`。

### 第三步：运行数据库迁移（2 分钟）

```bash
# 设置环境变量
export DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com
export DB_PORT=5432
export DB_NAME=postgres
export DB_USER=postgres
export DB_PASSWORD=你的Supabase密码

# 运行迁移
npm run migrate
```

pg-boss 会自动创建它需要的表（在 `pgboss` schema 中）。

### 第四步：选择部署平台

现在你可以选择任何支持 Node.js 的平台：

#### 选项 A：Render（完全免费）

```bash
cd ..
./scripts/deploy-render-supabase.sh
```

#### 选项 B：Fly.io（免费且不休眠）

```bash
cd ..
./scripts/deploy-flyio-supabase.sh
```

#### 选项 C：Vercel Serverless（需要改造）

查看 `DEPLOY_VERCEL_SERVERLESS.md`

---

## 环境变量配置

### 只需要这些（不需要 Redis）

```bash
# 基础配置
NODE_ENV=production
PORT=3000
TZ=Asia/Shanghai

# Supabase PostgreSQL（数据 + 队列）
DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=你的密码

# JWT
JWT_SECRET=随机字符串
JWT_EXPIRES_IN=7d

# LLM API
LLM_API_URL=你的URL
LLM_API_KEY=你的Key
LLM_MODEL=claude-sonnet-4
LLM_API_KEY_HEADER=Authorization
LLM_AUTH_PREFIX=Bearer

# 其他
JINA_READER_API_URL=https://r.jina.ai
MAX_PARALLEL_WEBSITES=5
RETRIEVAL_TIMEOUT_MS=30000
ENABLE_WEBSITE_ANALYZER=false
```

**注意**：不再需要 `REDIS_HOST`、`REDIS_PORT`、`REDIS_PASSWORD`！

---

## 代码变化

### 1. package.json

```json
{
  "dependencies": {
    // 移除
    // "bullmq": "^5.0.0",
    // "redis": "^4.6.8"
    
    // 添加
    "pg-boss": "^9.0.3"
  }
}
```

### 2. TaskScheduler

使用新的 `TaskScheduler.pgboss.ts`，它：
- 使用 `pg-boss` 替代 `bullmq`
- 直接连接到 PostgreSQL
- 不需要 Redis

### 3. index.ts

```typescript
// 之前
import { TaskScheduler } from './services/TaskScheduler';
const scheduler = new TaskScheduler({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD
});

// 现在
import { TaskScheduler } from './services/TaskScheduler.pgboss';
const scheduler = new TaskScheduler({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});
await scheduler.start();  // 必须调用 start()
```

---

## 性能对比

| 指标 | Redis + BullMQ | PostgreSQL + pg-boss |
|------|----------------|----------------------|
| 任务入队 | ~1ms | ~5-10ms |
| 任务出队 | ~1ms | ~10-20ms |
| 并发处理 | 很高 | 中等 |
| 持久化 | 可选 | 默认 |
| 事务支持 | 无 | 有 |
| 成本 | $0-5/月 | $0/月 |

**结论**：对于中小型项目，PostgreSQL 队列完全够用！

---

## 监控和维护

### 查看队列状态

在 Supabase Dashboard：
1. 进入 SQL Editor
2. 运行查询：

```sql
-- 查看待处理的任务
SELECT * FROM pgboss.job 
WHERE state = 'created' 
ORDER BY createdon DESC 
LIMIT 10;

-- 查看正在执行的任务
SELECT * FROM pgboss.job 
WHERE state = 'active' 
ORDER BY startedon DESC;

-- 查看失败的任务
SELECT * FROM pgboss.job 
WHERE state = 'failed' 
ORDER BY completedon DESC 
LIMIT 10;

-- 查看队列统计
SELECT 
  state, 
  COUNT(*) as count 
FROM pgboss.job 
GROUP BY state;
```

### 清理旧任务

pg-boss 会自动清理完成的任务（默认 7 天后）。

手动清理：
```sql
-- 删除 30 天前完成的任务
DELETE FROM pgboss.job 
WHERE state = 'completed' 
AND completedon < NOW() - INTERVAL '30 days';
```

---

## 故障排除

### 问题 1：pg-boss 表未创建

**症状**：错误提示 `relation "pgboss.job" does not exist`

**解决方案**：
```bash
# pg-boss 会在第一次启动时自动创建表
# 确保应用启动时调用了 scheduler.start()
```

### 问题 2：任务不执行

**症状**：任务创建了但不执行

**解决方案**：
1. 检查应用是否正在运行
2. 查看日志：`SELECT * FROM pgboss.job WHERE state = 'failed'`
3. 确保调用了 `scheduler.start()`

### 问题 3：数据库连接过多

**症状**：`too many connections`

**解决方案**：
```typescript
// 在 pg-boss 配置中限制连接数
new PgBoss({
  connectionString,
  max: 2,  // 最大连接数
});
```

---

## 迁移指南

如果你已经使用 Redis + BullMQ 部署，迁移步骤：

### 1. 备份数据

```bash
# 导出 PostgreSQL 数据
pg_dump -h aws-0-ap-southeast-1.pooler.supabase.com -U postgres -d postgres > backup.sql
```

### 2. 更新代码

```bash
git pull
cd backend
npm install
```

### 3. 重新部署

```bash
# 使用新的部署脚本
./scripts/deploy-render-supabase.sh
```

### 4. 验证

```bash
curl https://your-app.onrender.com/health
```

---

## 成本对比

### 之前（Redis + BullMQ）
- Supabase PostgreSQL: 免费
- Upstash Redis: 免费（有限制）或 $0.2/10K 命令
- 后端托管: $5-7/月

**总成本**: $5-7/月

### 现在（只用 PostgreSQL）
- Supabase PostgreSQL: 免费
- 后端托管: $0/月（Render 免费层）或 $5/月

**总成本**: $0-5/月

**节省**: $2-7/月 + 简化架构

---

## 下一步

1. **部署后端**：
   ```bash
   ./scripts/deploy-render-supabase.sh
   ```

2. **部署前端**：
   ```bash
   vercel --prod
   ```

3. **测试功能**：
   - 创建任务
   - 手动执行
   - 查看结果
   - 验证定时任务

---

## 总结

使用 PostgreSQL 替代 Redis + BullMQ：

✅ 完全免费（只需 Supabase）
✅ 架构更简单
✅ 配置更少
✅ 性能足够好
✅ 更容易维护

**推荐用于**：
- 个人项目
- 中小型应用
- 预算有限的项目
- 想要简化架构的项目

**不推荐用于**：
- 高并发场景（>1000 任务/分钟）
- 需要极低延迟的场景
- 已有 Redis 基础设施的项目

---

**准备好了吗？** 运行 `./scripts/deploy-render-supabase.sh` 开始部署！🚀
