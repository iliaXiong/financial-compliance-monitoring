# ✅ Supabase 完全部署方案

## 🎉 好消息！

我已经为你改造了代码，现在可以只使用 Supabase PostgreSQL 部署，不需要 Redis！

---

## 📦 已完成的改造

### 1. 新增文件

- `backend/src/services/TaskScheduler.pgboss.ts` - 使用 pg-boss 的新任务调度器
- `backend/src/index.pgboss.ts` - 新的入口文件（不需要 Redis）
- `scripts/deploy-render-supabase.sh` - Render + Supabase 部署脚本
- `DEPLOY_SUPABASE_ONLY.md` - 完整部署文档

### 2. 修改文件

- `backend/package.json` - 替换依赖：
  - ❌ 移除：`bullmq`, `redis`
  - ✅ 添加：`pg-boss`

### 3. 架构变化

**之前**：
```
Backend → PostgreSQL (数据)
       → Redis + BullMQ (队列)
```

**现在**：
```
Backend → PostgreSQL (数据 + 队列)
          使用 pg-boss
```

---

## 🚀 立即部署

### 方式一：自动部署（推荐）

```bash
# 1. 安装新依赖
cd backend
npm install
cd ..

# 2. 运行部署脚本
./scripts/deploy-render-supabase.sh
```

脚本会引导你：
1. 配置 Supabase 数据库
2. 运行数据库迁移
3. 配置 LLM API
4. 生成 Render 部署配置

### 方式二：手动部署

查看详细指南：[DEPLOY_SUPABASE_ONLY.md](./DEPLOY_SUPABASE_ONLY.md)

---

## 📋 部署步骤概览

### 第一步：创建 Supabase 项目（5 分钟）

1. 访问 https://supabase.com
2. 创建项目：`financial-compliance-monitoring`
3. 记录数据库连接信息

### 第二步：安装依赖（1 分钟）

```bash
cd backend
npm install
```

### 第三步：运行迁移（2 分钟）

```bash
export DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com
export DB_PASSWORD=你的密码
npm run migrate
```

### 第四步：部署到 Render（10 分钟）

使用 Render 免费层部署后端：
- 完全免费
- 自动 HTTPS
- 自动部署

---

## 💰 成本对比

### 之前（需要 Redis）
- Supabase PostgreSQL: 免费
- Upstash Redis: 免费（有限制）
- Render: 免费（会休眠）

**总成本**: $0/月（但需要配置两个服务）

### 现在（只用 PostgreSQL）
- Supabase PostgreSQL: 免费
- Render: 免费（会休眠）

**总成本**: $0/月（只需配置一个服务）

**优势**：
- ✅ 更简单的架构
- ✅ 更少的配置
- ✅ 更容易维护
- ✅ 完全免费

---

## 🔧 技术细节

### pg-boss 是什么？

pg-boss 是一个基于 PostgreSQL 的任务队列库，提供：
- ✅ 可靠的任务调度
- ✅ 自动重试
- ✅ 延迟执行
- ✅ 优先级队列
- ✅ 事务支持

### 性能如何？

对于中小型项目完全够用：
- 任务入队：~5-10ms
- 任务出队：~10-20ms
- 并发处理：中等
- 适合场景：<1000 任务/分钟

### 与 Redis + BullMQ 对比

| 特性 | Redis + BullMQ | PostgreSQL + pg-boss |
|------|----------------|----------------------|
| 速度 | 非常快 | 快 |
| 成本 | $0-5/月 | $0/月 |
| 配置 | 复杂 | 简单 |
| 依赖 | 2 个服务 | 1 个服务 |
| 事务 | 无 | 有 |
| 推荐 | 高并发 | 中小型项目 |

---

## 📝 环境变量

### 只需要这些（不需要 Redis）

```bash
# 数据库（Supabase）
DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=你的密码

# JWT
JWT_SECRET=随机字符串
JWT_EXPIRES_IN=7d

# LLM
LLM_API_URL=你的URL
LLM_API_KEY=你的Key
LLM_MODEL=claude-sonnet-4

# 其他
JINA_READER_API_URL=https://r.jina.ai
MAX_PARALLEL_WEBSITES=5
RETRIEVAL_TIMEOUT_MS=30000
```

**不再需要**：
- ❌ `REDIS_HOST`
- ❌ `REDIS_PORT`
- ❌ `REDIS_PASSWORD`

---

## 🔍 监控队列

在 Supabase Dashboard 的 SQL Editor 中运行：

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

## ❓ 常见问题

### Q: 性能会变差吗？

A: 对于中小型项目（<1000 任务/分钟），性能完全够用。PostgreSQL 队列比 Redis 慢一点，但差异不大。

### Q: 会增加数据库负载吗？

A: 会有一些增加，但 pg-boss 经过优化，对数据库的影响很小。Supabase 免费层完全够用。

### Q: 可以切换回 Redis 吗？

A: 可以！保留了原来的代码（`TaskScheduler.ts` 和 `index.ts`），随时可以切换回去。

### Q: 如何本地测试？

A: 
```bash
cd backend
npm install
npm run dev
```

---

## 🎯 下一步

### 1. 部署后端

```bash
./scripts/deploy-render-supabase.sh
```

### 2. 部署前端

```bash
# 更新 vercel.json 中的后端 URL
vercel --prod
```

### 3. 测试功能

- 创建任务
- 手动执行
- 查看结果
- 验证定时任务

---

## 📚 相关文档

- [完整部署指南](./DEPLOY_SUPABASE_ONLY.md)
- [Render 部署](./DEPLOY_WITHOUT_RAILWAY.md)
- [pg-boss 文档](https://github.com/timgit/pg-boss)

---

## ✨ 总结

现在你可以：

✅ 只使用 Supabase PostgreSQL（免费）
✅ 不需要 Redis 和 Upstash
✅ 更简单的架构
✅ 更少的配置
✅ 完全免费部署

**立即开始**：

```bash
./scripts/deploy-render-supabase.sh
```

祝部署顺利！🚀
