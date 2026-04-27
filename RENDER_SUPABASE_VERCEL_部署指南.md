# 🚀 Render + Supabase + Vercel 完整部署指南

## 📋 部署架构

- **后端**: Render (免费层)
- **数据库**: Supabase PostgreSQL (免费 500MB)
- **任务队列**: pg-boss (使用 PostgreSQL，无需 Redis)
- **前端**: Vercel (免费层)

**总成本**: $0/月 🎉

---

## 第一步：部署 Supabase 数据库 (5 分钟)

### 1.1 创建 Supabase 项目

1. 访问 https://supabase.com
2. 点击 "New Project"
3. 填写项目信息：
   - Name: `financial-compliance-monitoring`
   - Database Password: 设置一个强密码（保存好！）
   - Region: 选择离你最近的区域（如 Singapore）
4. 点击 "Create new project"，等待 2-3 分钟

### 1.2 获取数据库连接信息

1. 在项目 Dashboard，点击左侧 "Settings" → "Database"
2. 找到 "Connection string" 部分
3. 选择 "URI" 模式，复制连接字符串，格式如下：
   ```
   postgresql://postgres:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
   ```

4. 提取以下信息：
   ```
   DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com
   DB_PORT=5432
   DB_NAME=postgres
   DB_USER=postgres
   DB_PASSWORD=[你设置的密码]
   ```

### 1.3 运行数据库迁移

在本地运行迁移脚本：

```bash
# 设置环境变量
export DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com
export DB_PORT=5432
export DB_NAME=postgres
export DB_USER=postgres
export DB_PASSWORD=[你的密码]

# 运行迁移
cd backend
npm install
npm run migrate
```

✅ 看到 "Migration completed successfully" 表示成功！

---

## 第二步：部署后端到 Render (10 分钟)

### 2.1 准备配置信息

生成 JWT Secret：
```bash
openssl rand -base64 32
```

保存输出结果，例如：`IVyGa5HGayEHQesrzZd3lVhdMynDks4vbbQQ/jnYRhI=`

### 2.2 在 Render 创建 Web Service

1. 访问 https://render.com 并登录
2. 点击 "New +" → "Web Service"
3. 连接你的 GitHub 仓库
4. 配置服务：

```
Name: financial-compliance-backend
Region: Singapore (或其他区域)
Branch: main
Root Directory: backend
Runtime: Node
Build Command: npm install && npm run build
Start Command: node dist/index.pgboss.js
Instance Type: Free
```

⚠️ **重要**: Start Command 必须是 `node dist/index.pgboss.js`（使用 pg-boss，不需要 Redis）

### 2.3 添加环境变量

在 Render 的 "Environment" 标签页，点击 "Add Environment Variable"，添加以下变量：

```bash
# 基础配置
NODE_ENV=production
PORT=3000
TZ=Asia/Shanghai

# 数据库配置（从第一步获取）
DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=[你的 Supabase 密码]

# JWT 配置（从 2.1 生成）
JWT_SECRET=[你生成的 JWT Secret]
JWT_EXPIRES_IN=7d

# LLM 配置（根据你的实际情况选择）
# 选项 1: 使用 OpenAI
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4

# 选项 2: 使用自定义 LLM API（如 Webull 内部 API）
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

### 2.4 部署并验证

1. 点击 "Create Web Service"
2. 等待部署完成（约 5-10 分钟）
3. 部署完成后，你会得到一个 URL，例如：
   ```
   https://financial-compliance-backend.onrender.com
   ```

4. 验证部署：
   ```bash
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
     "timestamp": "2024-..."
   }
   ```

✅ 后端部署完成！

---

## 第三步：部署前端到 Vercel (5 分钟)

### 3.1 创建前端环境变量文件

在 `frontend` 目录创建 `.env.production` 文件：

```bash
VITE_API_BASE_URL=https://your-app.onrender.com
```

⚠️ 替换 `your-app.onrender.com` 为你在第二步获得的 Render URL（不要加 `/api` 后缀）

### 3.2 方式一：使用 Vercel CLI 部署

```bash
# 安装 Vercel CLI（如果还没安装）
npm install -g vercel

# 登录
vercel login

# 部署
cd frontend
vercel --prod
```

按照提示操作：
- Set up and deploy? Yes
- Which scope? 选择你的账号
- Link to existing project? No
- Project name? financial-compliance-frontend
- In which directory is your code located? ./
- Want to override the settings? No

### 3.3 方式二：使用 Vercel Dashboard 部署

1. 访问 https://vercel.com 并登录
2. 点击 "Add New..." → "Project"
3. 导入你的 GitHub 仓库
4. 配置项目：

```
Framework Preset: Vite
Root Directory: frontend
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

5. 添加环境变量：
   - Key: `VITE_API_BASE_URL`
   - Value: `https://your-app.onrender.com`

6. 点击 "Deploy"

### 3.4 验证部署

1. 部署完成后，访问 Vercel 提供的 URL
2. 应该能看到登录页面
3. 尝试登录和创建任务

✅ 前端部署完成！

---

## 🎯 部署后检查清单

- [ ] Supabase 数据库创建成功
- [ ] 数据库迁移运行成功
- [ ] Render 后端部署成功
- [ ] 后端健康检查通过 (`/health`)
- [ ] Vercel 前端部署成功
- [ ] 前端可以访问
- [ ] 前端可以连接后端 API
- [ ] 可以登录系统
- [ ] 可以创建测试任务
- [ ] 可以手动执行任务
- [ ] 可以查看执行结果

---

## 🔧 常见问题

### Q1: Render 免费层会休眠吗？

**A**: 是的，15 分钟无活动后会休眠。首次访问需要等待 30-60 秒唤醒。

**解决方案**：
- 使用 [UptimeRobot](https://uptimerobot.com) 等服务定期 ping 你的 API
- 或者升级到 Render 付费层（$7/月）

### Q2: 前端无法连接后端？

**A**: 检查以下几点：
1. `frontend/.env.production` 中的 `VITE_API_BASE_URL` 是否正确
2. Render 后端是否正常运行（访问 `/health` 端点）
3. 浏览器控制台是否有 CORS 错误
4. 重新部署前端（Vercel 会重新构建）

### Q3: 数据库迁移失败？

**A**: 
1. 检查 Supabase 数据库密码是否正确
2. 检查网络连接
3. 在 Supabase Dashboard 的 SQL Editor 中手动运行迁移脚本

### Q4: 如何查看后端日志？

**A**: 在 Render Dashboard 的 "Logs" 标签页可以查看实时日志。

### Q5: 如何监控任务队列？

**A**: 在 Supabase Dashboard 的 SQL Editor 中运行：

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

### Q6: 如何更新环境变量？

**A**: 
- **Render**: 在 Dashboard 的 Environment 标签页修改，保存后会自动重新部署
- **Vercel**: 在 Project Settings → Environment Variables 修改，需要手动重新部署

---

## 📊 性能优化建议

### 1. 防止 Render 休眠

创建一个简单的 cron job 定期访问你的 API：

```bash
# 使用 cron-job.org 或 UptimeRobot
# 每 10 分钟访问一次
curl https://your-app.onrender.com/health
```

### 2. 启用 Vercel Analytics

在 Vercel Dashboard 启用 Analytics 来监控前端性能。

### 3. 配置 CDN 缓存

在 `vercel.json` 中添加缓存配置：

```json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

---

## 🎉 完成！

你的应用现在已经完全部署到云端，完全免费！

**访问地址**：
- 前端: https://your-app.vercel.app
- 后端: https://your-app.onrender.com
- 数据库: Supabase Dashboard

**下一步**：
1. 创建第一个监控任务
2. 测试手动执行
3. 验证定时任务
4. 查看分析结果

祝使用愉快！🚀

---

## 📚 相关文档

- [Render 文档](https://render.com/docs)
- [Supabase 文档](https://supabase.com/docs)
- [Vercel 文档](https://vercel.com/docs)
- [pg-boss 文档](https://github.com/timgit/pg-boss)
