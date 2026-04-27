# 🚀 Render + Supabase 部署指南

## ✅ 准备工作已完成

所有配置信息已准备就绪，可以立即开始部署！

---

## 📋 配置信息汇总

### Supabase PostgreSQL
```
DB_HOST=db.tzvxumvbucztaaaqlugv.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=KhpGTR6dMFzZz7qq
```

### LLM API（Webull 内部）
```
LLM_API_URL=https://office.webullbroker.com/api/oa-ai/open/chat/completions
LLM_API_KEY=dcb0d1c8-82c7-478f-bd9a-7c3023cac4d8
LLM_MODEL=us.anthropic.claude-sonnet-4-20250514-v1:0
```

### JWT Secret（已生成）
```
JWT_SECRET=IVyGa5HGayEHQesrzZd3lVhdMynDks4vbbQQ/jnYRhI=
```

---

## 🎯 部署步骤

### 第一步：在 Render 创建 Web Service（5 分钟）

1. 访问 https://render.com
2. 点击 **"New +"** → **"Web Service"**
3. 连接你的 GitHub 仓库
4. 配置服务：

```
Name: financial-compliance-backend
Region: Singapore (或其他离你近的区域)
Branch: main
Root Directory: backend
Runtime: Node
Build Command: npm install && npm run build && npm run migrate
Start Command: node dist/index.pgboss.js
Plan: Free
```

⚠️ **重要**：Build Command 包含 `npm run migrate`，会在部署时自动运行数据库迁移！

---

### 第二步：添加环境变量

在 Render 的 "Environment" 标签页，添加以下环境变量：

```bash
NODE_ENV=production
PORT=3000
TZ=Asia/Shanghai

# 数据库配置（Supabase）
DB_HOST=db.tzvxumvbucztaaaqlugv.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=KhpGTR6dMFzZz7qq

# JWT 配置
JWT_SECRET=IVyGa5HGayEHQesrzZd3lVhdMynDks4vbbQQ/jnYRhI=
JWT_EXPIRES_IN=7d

# LLM 配置（Webull 内部 API）
LLM_API_URL=https://office.webullbroker.com/api/oa-ai/open/chat/completions
LLM_API_KEY=dcb0d1c8-82c7-478f-bd9a-7c3023cac4d8
LLM_MODEL=us.anthropic.claude-sonnet-4-20250514-v1:0
LLM_API_KEY_HEADER=authorization
LLM_AUTH_PREFIX=Bearer

# Jina Reader 配置
JINA_READER_API_URL=https://r.jina.ai

# 其他配置
MAX_PARALLEL_WEBSITES=5
RETRIEVAL_TIMEOUT_MS=30000
ENABLE_WEBSITE_ANALYZER=true
DEMO_MODE=false
```

---

### 第三步：部署并验证（5-10 分钟）

1. 点击 **"Create Web Service"**
2. 等待部署完成（Render 会自动构建和部署）
3. 部署完成后，你会得到一个 URL，例如：
   ```
   https://financial-compliance-backend.onrender.com
   ```

4. 验证部署：
   ```bash
   # 健康检查
   curl https://your-app.onrender.com/health
   
   # 应该返回：
   {
     "status": "healthy",
     "services": {
       "database": "up",
       "queue": "pg-boss"
     },
     "timestamp": "2024-..."
   }
   ```

---

## 🎨 前端部署到 Vercel

### 第一步：更新前端配置

在 `frontend/.env.production` 中设置后端 URL：

```bash
VITE_API_URL=https://your-app.onrender.com/api
```

### 第二步：部署到 Vercel

```bash
cd frontend
vercel --prod
```

或者在 Vercel Dashboard 中：
1. 导入 GitHub 仓库
2. 设置 Root Directory: `frontend`
3. 添加环境变量：`VITE_API_URL`
4. 部署

---

## 🔍 部署后检查清单

- [ ] 后端健康检查通过
- [ ] 数据库连接正常
- [ ] pg-boss 队列正常运行
- [ ] 前端可以访问
- [ ] 前端可以连接后端 API
- [ ] 创建测试任务
- [ ] 手动执行任务
- [ ] 查看执行结果

---

## 📊 架构说明

### 使用的服务

1. **Render**（后端）
   - 免费层
   - 自动 HTTPS
   - 自动部署
   - 会在 15 分钟无活动后休眠

2. **Supabase**（数据库 + 队列）
   - PostgreSQL 数据库（500MB 免费）
   - pg-boss 任务队列（使用同一个数据库）
   - 不需要 Redis！

3. **Vercel**（前端）
   - 免费层
   - 全球 CDN
   - 自动部署

### 总成本：$0/月 🎉

---

## 🔧 技术细节

### 为什么不需要 Redis？

我们使用 **pg-boss** 替代了 **BullMQ + Redis**：

- pg-boss 是基于 PostgreSQL 的任务队列
- 直接使用 Supabase 的 PostgreSQL 数据库
- 性能对于中小型项目完全够用
- 架构更简单，配置更少

### 关键文件

- `backend/src/index.pgboss.ts` - 新的入口文件（不需要 Redis）
- `backend/src/services/TaskScheduler.pgboss.ts` - 使用 pg-boss 的任务调度器
- `backend/package.json` - 已移除 `bullmq` 和 `redis` 依赖

---

## ❓ 常见问题

### Q: Render 免费层会休眠吗？

A: 是的，15 分钟无活动后会休眠。首次访问需要等待 30-60 秒唤醒。

**解决方案**：
- 使用 UptimeRobot 等服务定期 ping 你的 API
- 或者升级到 Render 付费层（$7/月）

### Q: 数据库迁移失败怎么办？

A: 不用担心！Build Command 中包含 `npm run migrate`，会在 Render 上自动运行迁移。

### Q: 如何查看日志？

A: 在 Render Dashboard 的 "Logs" 标签页可以查看实时日志。

### Q: 如何监控队列？

A: 在 Supabase Dashboard 的 SQL Editor 中运行：

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

## 🎉 完成！

现在你的应用已经完全部署到云端，完全免费！

**下一步**：
1. 创建第一个监控任务
2. 测试手动执行
3. 验证定时任务
4. 查看分析结果

祝使用愉快！🚀
