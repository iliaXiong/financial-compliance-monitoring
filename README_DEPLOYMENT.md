# 部署说明

本项目支持部署到 Vercel（前端）+ Railway（后端）+ Supabase（数据库）+ Upstash（Redis）。

## 快速开始

### 方式一：自动部署（推荐）

```bash
# 1. 设置后端环境变量
./scripts/setup-env.sh

# 2. 一键部署前端和后端
./scripts/deploy-all.sh
```

### 方式二：手动部署

详细步骤请查看：[VERCEL_SUPABASE_DEPLOYMENT.md](./VERCEL_SUPABASE_DEPLOYMENT.md)

## 部署架构

```
用户浏览器
    ↓
Vercel (前端)
    ↓ API 请求
Railway (后端)
    ↓
    ├─→ Supabase (PostgreSQL)
    └─→ Upstash (Redis)
```

## 成本估算

- **Vercel**: 免费（100GB 带宽/月）
- **Supabase**: 免费（500MB 数据库）
- **Upstash**: 免费（10K 命令/天）
- **Railway**: $5/月（500 小时运行时间）

**总成本**: $5/月

## 文档索引

1. **[VERCEL_SUPABASE_DEPLOYMENT.md](./VERCEL_SUPABASE_DEPLOYMENT.md)** - 完整的分步部署指南
2. **[QUICK_DEPLOY_GUIDE.md](./QUICK_DEPLOY_GUIDE.md)** - 5 分钟快速部署
3. **[deploy-checklist.md](./deploy-checklist.md)** - 部署检查清单

## 环境变量

### 后端（Railway）

必须配置的环境变量：

```bash
# 数据库
DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com
DB_PASSWORD=your-password

# Redis
REDIS_HOST=your-redis.upstash.io
REDIS_PASSWORD=your-password

# JWT
JWT_SECRET=random-secret

# LLM
LLM_API_URL=your-llm-url
LLM_API_KEY=your-llm-key
```

完整列表请查看：[backend/.env.production.example](./backend/.env.production.example)

### 前端（Vercel）

```bash
VITE_API_BASE_URL=https://your-backend.railway.app
```

## 部署后验证

```bash
# 1. 测试后端健康检查
curl https://your-backend.railway.app/health

# 2. 访问前端
open https://your-frontend.vercel.app

# 3. 查看后端日志
railway logs

# 4. 查看前端日志
vercel logs
```

## 故障排除

常见问题和解决方案请查看：[VERCEL_SUPABASE_DEPLOYMENT.md#故障排除](./VERCEL_SUPABASE_DEPLOYMENT.md#故障排除)

## 支持

如有问题，请：
1. 查看部署文档
2. 检查服务日志
3. 提交 Issue
