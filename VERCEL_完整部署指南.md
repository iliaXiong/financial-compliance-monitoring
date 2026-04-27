# Vercel + Supabase 完整部署指南

## 架构说明

```
Vercel（前端 + 后端）
├─ 前端：React 应用
└─ 后端：API Routes（Serverless）
    └─ 连接 Supabase 数据库
```

## ✅ 已完成

- ✅ 数据库迁移（Supabase）
- ✅ 代码推送到 GitHub
- ✅ 配置文件准备

## 🚀 部署步骤

### 步骤 1：安装 Vercel CLI

在终端运行：

```bash
npm install -g vercel
```

### 步骤 2：登录 Vercel

```bash
vercel login
```

选择登录方式（推荐使用 GitHub）。

### 步骤 3：部署项目

在项目根目录运行：

```bash
vercel
```

Vercel CLI 会询问一些问题：

```
? Set up and deploy "~/Desktop/金融合规监测工具0319"? [Y/n] y
? Which scope do you want to deploy to? [选择你的账号]
? Link to existing project? [N/y] n
? What's your project's name? financial-compliance-monitoring
? In which directory is your code located? ./
```

### 步骤 4：配置环境变量

部署完成后，需要添加环境变量：

#### 方法 1：通过 CLI

```bash
vercel env add DB_HOST
# 输入: aws-0-ap-southeast-1.pooler.supabase.com

vercel env add DB_PORT
# 输入: 6543

vercel env add DB_NAME
# 输入: postgres

vercel env add DB_USER
# 输入: postgres.ynbaatdsceqtqwmqhlgu

vercel env add DB_PASSWORD
# 输入: KhpGTR6dMFzZz7qq

vercel env add JWT_SECRET
# 输入: u7uEwPvtAxpLo1GafP/WiQhTpzT+9UDOXy5nmuuQ1fU=

vercel env add LLM_API_URL
# 输入: https://office.webullbroker.com/api/oa-ai/open/chat/completions

vercel env add LLM_API_KEY
# 输入: dcb0d1c8-82c7-478f-bd9a-7c3023cac4d8

vercel env add LLM_MODEL
# 输入: us.anthropic.claude-sonnet-4-20250514-v1:0
```

#### 方法 2：通过 Dashboard（更简单）

1. 访问：https://vercel.com/dashboard
2. 选择你的项目
3. 点击 **Settings** → **Environment Variables**
4. 添加以下变量：

```
NODE_ENV=production
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

### 步骤 5：重新部署

添加环境变量后，重新部署：

```bash
vercel --prod
```

## 🎉 完成！

部署成功后，Vercel 会给你两个 URL：

- **Production**: `https://financial-compliance-monitoring.vercel.app`
- **Preview**: `https://financial-compliance-monitoring-xxx.vercel.app`

访问 Production URL 即可使用你的应用！

## 📝 注意事项

### Vercel Serverless 限制

Vercel 的 Serverless Functions 有一些限制：

1. **执行时间限制**：
   - 免费版：10 秒
   - Pro 版：60 秒

2. **内存限制**：
   - 免费版：1024 MB
   - Pro 版：3008 MB

3. **不支持长时间运行的任务**：
   - pg-boss 后台任务调度可能无法正常工作
   - 需要使用 Vercel Cron Jobs 替代

### 解决方案

如果遇到超时问题，可以：

1. **使用 Vercel Cron Jobs** 替代 pg-boss
2. **优化任务执行时间**
3. **升级到 Pro 版**（$20/月）

## 🔧 故障排查

### 部署失败？

查看部署日志：
```bash
vercel logs
```

或在 Dashboard 中查看：
https://vercel.com/dashboard → 选择项目 → Deployments → 点击失败的部署

### 数据库连接失败？

1. 检查环境变量是否正确
2. 确认 Supabase 项目状态是 Active
3. 测试连接：访问 `https://your-app.vercel.app/api/health`

### 前端无法访问后端？

检查 `frontend/src/services/api.ts` 中的 API URL 配置。

## 📚 相关文档

- Vercel 文档：https://vercel.com/docs
- Vercel Serverless Functions：https://vercel.com/docs/functions
- Vercel Cron Jobs：https://vercel.com/docs/cron-jobs

---

**现在就开始部署**：

```bash
npm install -g vercel
vercel login
vercel
```
