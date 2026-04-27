# 🚂 Railway 部署指南

## 为什么选择 Railway？

- ✅ $5 免费额度（够用很久）
- ✅ 不需要信用卡
- ✅ 支持 Node.js 和长时间运行的任务
- ✅ 自动从 GitHub 部署
- ✅ 24/7 运行

---

## 📋 部署步骤

### 步骤 1：注册 Railway

1. 访问：https://railway.app
2. 点击 **"Login"** 或 **"Start a New Project"**
3. 选择 **"Login with GitHub"**
4. 授权 Railway 访问你的 GitHub

### 步骤 2：创建新项目

1. 登录后，点击 **"New Project"**
2. 选择 **"Deploy from GitHub repo"**
3. 找到并选择 **"financial-compliance-monitoring"**
4. Railway 会自动检测到这是一个 Node.js 项目

### 步骤 3：配置服务

Railway 会自动检测，但需要确认配置：

1. 点击部署的服务
2. 进入 **"Settings"** 标签
3. 配置以下内容：

```
Root Directory: backend
Build Command: npm install && npm run build
Start Command: node dist/index.pgboss.js
```

### 步骤 4：添加环境变量

1. 在服务页面，点击 **"Variables"** 标签
2. 点击 **"New Variable"**
3. 添加以下所有变量：

```
NODE_ENV=production
PORT=3000
TZ=Asia/Shanghai

DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com
DB_PORT=6543
DB_NAME=postgres
DB_USER=postgres.ynbaatdsceqtqwmqhlgu
DB_PASSWORD=KhpGTR6dMFzZz7qq

JWT_SECRET=u7uEwPvtAxpLo1GafP/WiQhTpzT+9UDOXy5nmuuQ1fU=
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

**提示**：可以使用 **"RAW Editor"** 批量粘贴所有变量。

### 步骤 5：部署

1. 添加完环境变量后，Railway 会自动重新部署
2. 等待 3-5 分钟完成部署
3. 查看 **"Deployments"** 标签确认状态

### 步骤 6：获取 Railway URL

1. 在服务页面，点击 **"Settings"** 标签
2. 找到 **"Domains"** 部分
3. 点击 **"Generate Domain"**
4. Railway 会生成一个 URL，类似：
   ```
   https://financial-compliance-monitoring-production.up.railway.app
   ```
5. 复制这个 URL

### 步骤 7：配置 Vercel 前端

1. 访问：https://vercel.com/dashboard
2. 选择项目：**financial-compliance-monitoring**
3. 进入 **Settings** → **Environment Variables**
4. 添加或更新：
   ```
   VITE_API_URL=https://your-app.up.railway.app
   ```
   （替换成你的 Railway URL）
5. 保存后，Vercel 会自动重新部署

### 步骤 8：测试应用

1. 访问你的前端：https://financial-compliance-monitoring.vercel.app
2. 应该能看到应用正常运行
3. 测试创建任务等功能

---

## 🔧 Railway 配置文件（可选）

如果 Railway 没有自动检测配置，可以创建 `railway.json`：

```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "cd backend && npm install && npm run build"
  },
  "deploy": {
    "startCommand": "cd backend && node dist/index.pgboss.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

---

## 📊 监控和日志

### 查看日志

1. 在 Railway 服务页面
2. 点击 **"Deployments"** 标签
3. 选择最新的部署
4. 查看实时日志

### 监控资源使用

1. 在项目页面查看 **"Usage"**
2. 可以看到：
   - CPU 使用率
   - 内存使用
   - 网络流量
   - 剩余免费额度

---

## 💰 费用说明

Railway 免费计划：
- ✅ $5 免费额度/月
- ✅ 500 小时执行时间
- ✅ 100GB 出站流量

对于你的应用：
- 预计每月使用 $2-3
- 足够支持中等流量
- 超出后可以升级到 $5/月的 Hobby 计划

---

## 🐛 故障排查

### 部署失败？

1. 查看 **Deployment Logs**
2. 常见问题：
   - 环境变量缺失
   - Build 命令错误
   - Start 命令错误

### 应用无法访问？

1. 检查 Railway 服务状态（应该是绿色）
2. 确认 Domain 已生成
3. 测试后端健康检查：
   ```
   https://your-app.up.railway.app/health
   ```
   应该返回：`{"status":"ok"}`

### 前端无法连接后端？

1. 确认 Vercel 环境变量 `VITE_API_URL` 正确
2. 确认 Railway URL 可以访问
3. 检查浏览器控制台的网络请求

---

## 🎉 完成！

部署成功后，你的应用架构：

```
用户
 ↓
Vercel（前端）
 ↓
Railway（后端）
 ↓
Supabase（数据库）
```

- **前端**：https://financial-compliance-monitoring.vercel.app
- **后端**：https://your-app.up.railway.app
- **数据库**：Supabase (ynbaatdsceqtqwmqhlgu)

---

## 📝 下一步

1. 测试所有功能
2. 监控 Railway 使用情况
3. 如果需要，升级到付费计划

需要帮助？告诉我遇到的问题！
