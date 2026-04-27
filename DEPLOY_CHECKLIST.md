# ✅ 部署检查清单

## 📦 准备工作

- [x] 代码改造完成（使用 pg-boss 替代 BullMQ）
- [x] 安装新依赖（pg-boss）
- [x] Supabase 项目已创建
- [x] 数据库连接信息已获取
- [x] JWT Secret 已生成
- [x] LLM API 配置已获取

---

## 🚀 部署步骤

### 1️⃣ 部署后端到 Render

#### 1.1 创建 Web Service
- [ ] 访问 https://render.com
- [ ] 点击 "New +" → "Web Service"
- [ ] 连接 GitHub 仓库

#### 1.2 配置服务
```
Name: financial-compliance-backend
Region: Singapore
Branch: main
Root Directory: backend
Runtime: Node
Build Command: npm install && npm run build && npm run migrate
Start Command: node dist/index.pgboss.js
Plan: Free
```

#### 1.3 添加环境变量
复制以下内容到 Render 的 "Environment" 标签页：

```bash
NODE_ENV=production
PORT=3000
TZ=Asia/Shanghai
DB_HOST=db.tzvxumvbucztaaaqlugv.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=KhpGTR6dMFzZz7qq
JWT_SECRET=IVyGa5HGayEHQesrzZd3lVhdMynDks4vbbQQ/jnYRhI=
JWT_EXPIRES_IN=7d
LLM_API_URL=https://office.webullbroker.com/api/oa-ai/open/chat/completions
LLM_API_KEY=dcb0d1c8-82c7-478f-bd9a-7c3023cac4d8
LLM_MODEL=us.anthropic.claude-sonnet-4-20250514-v1:0
LLM_API_KEY_HEADER=authorization
LLM_AUTH_PREFIX=Bearer
JINA_READER_API_URL=https://r.jina.ai
MAX_PARALLEL_WEBSITES=5
RETRIEVAL_TIMEOUT_MS=30000
ENABLE_WEBSITE_ANALYZER=true
DEMO_MODE=false
```

#### 1.4 部署
- [ ] 点击 "Create Web Service"
- [ ] 等待部署完成（5-10 分钟）
- [ ] 记录后端 URL：`https://________.onrender.com`

#### 1.5 验证后端
```bash
# 替换为你的实际 URL
curl https://your-app.onrender.com/health
```

预期响应：
```json
{
  "status": "healthy",
  "services": {
    "database": "up",
    "queue": "pg-boss"
  }
}
```

---

### 2️⃣ 部署前端到 Vercel

#### 2.1 更新前端配置
- [ ] 创建 `frontend/.env.production` 文件
- [ ] 添加内容：
```bash
VITE_API_URL=https://your-app.onrender.com/api
```

#### 2.2 部署到 Vercel
选择以下方式之一：

**方式 A：命令行部署**
```bash
cd frontend
vercel --prod
```

**方式 B：Vercel Dashboard**
- [ ] 访问 https://vercel.com
- [ ] 导入 GitHub 仓库
- [ ] 设置 Root Directory: `frontend`
- [ ] 添加环境变量：`VITE_API_URL=https://your-app.onrender.com/api`
- [ ] 点击 "Deploy"

#### 2.3 验证前端
- [ ] 访问 Vercel 提供的 URL
- [ ] 检查页面是否正常加载
- [ ] 打开浏览器控制台，检查是否有错误

---

### 3️⃣ 端到端测试

#### 3.1 创建测试任务
- [ ] 在前端创建一个新任务
- [ ] 设置目标网站和关键词
- [ ] 保存任务

#### 3.2 手动执行任务
- [ ] 点击"立即执行"按钮
- [ ] 等待执行完成（可能需要 1-2 分钟）
- [ ] 检查执行状态

#### 3.3 查看结果
- [ ] 查看"检索结果"
- [ ] 查看"分析总结"
- [ ] 查看"机构对比"（如果有多个网站）

#### 3.4 测试定时任务
- [ ] 创建一个定时任务（例如：每天执行）
- [ ] 等待下次执行时间
- [ ] 验证任务是否自动执行

---

## 🔍 故障排查

### 后端问题

#### 健康检查失败
```bash
# 检查 Render 日志
# 在 Render Dashboard → Logs 查看错误信息
```

常见问题：
- 数据库连接失败：检查 DB_HOST 和 DB_PASSWORD
- 迁移失败：检查 Build Command 是否包含 `npm run migrate`
- 端口错误：确保 PORT=3000

#### 任务执行失败
```bash
# 在 Supabase SQL Editor 中查询
SELECT * FROM executions 
WHERE status = 'failed' 
ORDER BY start_time DESC 
LIMIT 5;
```

### 前端问题

#### 无法连接后端
- 检查 `VITE_API_URL` 是否正确
- 检查浏览器控制台的网络请求
- 确认后端 CORS 配置正确

#### 页面加载缓慢
- Render 免费层会在 15 分钟无活动后休眠
- 首次访问需要等待 30-60 秒唤醒

---

## 📊 监控和维护

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

-- 查看失败的任务
SELECT * FROM pgboss.job 
WHERE state = 'failed' 
ORDER BY createdon DESC 
LIMIT 10;
```

### 查看执行历史
```sql
-- 最近的执行记录
SELECT 
  e.id,
  e.task_id,
  e.status,
  e.start_time,
  e.end_time,
  e.error_message
FROM executions e
ORDER BY e.start_time DESC
LIMIT 20;
```

### 设置 Uptime 监控
为了防止 Render 休眠，可以使用 UptimeRobot：

1. 访问 https://uptimerobot.com
2. 创建免费账号
3. 添加监控：
   - Monitor Type: HTTP(s)
   - URL: `https://your-app.onrender.com/health`
   - Monitoring Interval: 5 minutes

---

## 🎉 完成！

恭喜！你的应用已经成功部署到云端！

**部署信息汇总**：
- 后端 URL: `https://________.onrender.com`
- 前端 URL: `https://________.vercel.app`
- 数据库: Supabase PostgreSQL
- 队列: pg-boss (PostgreSQL)
- 总成本: $0/月

**下一步**：
1. 分享给团队成员
2. 设置 Uptime 监控
3. 定期检查执行日志
4. 根据需要调整任务配置

祝使用愉快！🚀
