# 部署方案: Vercel + Railway + Supabase

**推荐方案**: 前端Vercel + 后端Railway + 数据库Supabase  
**状态**: ✅ 代码已推送，准备部署

---

## 为什么选择这个方案？

### Vercel的限制
- ❌ Serverless Functions无状态
- ❌ 执行时间限制（10-60秒）
- ❌ 不支持任务队列
- ❌ 不支持长时间运行的任务
- ❌ 冷启动延迟

### Railway的优势
- ✅ 持久运行的后端服务
- ✅ 支持任务队列（pg-boss）
- ✅ 支持长时间任务
- ✅ 免费500小时/月
- ✅ 自动从GitHub部署

---

## 快速部署（3步）

### 步骤1: 部署后端到Railway ⭐

**方法A: 使用GitHub集成（推荐）**

1. 访问 https://railway.app
2. 点击 "New Project"
3. 选择 "Deploy from GitHub repo"
4. 选择仓库: `financial-compliance-monitoring`
5. 配置服务:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `node dist/index.pgboss.js`

6. 添加环境变量:

```bash
# 基础配置
NODE_ENV=production
PORT=3000

# 数据库配置（从Supabase获取）
DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=你的Supabase密码

# 阶段一优化配置 ⭐ 新增
DEBUG_MODE=true
MAX_CHUNKS_PER_KEYWORD=30
CHUNK_MAX_SIZE=500
CHUNK_MIN_SIZE=100
CHUNK_OVERLAP=50

# LLM配置
LLM_API_URL=https://office.webullbroker.com/api/oa-ai/open/chat/completions
LLM_API_KEY=dcb0d1c8-82c7-478f-bd9a-7c3023cac4d8
LLM_MODEL=us.anthropic.claude-sonnet-4-20250514-v1:0
LLM_API_KEY_HEADER=authorization
LLM_AUTH_PREFIX=Bearer

# JWT配置
JWT_SECRET=你的JWT密钥（使用 openssl rand -base64 32 生成）
JWT_EXPIRES_IN=7d

# 其他配置
JINA_READER_API_URL=https://r.jina.ai
MAX_PARALLEL_WEBSITES=5
RETRIEVAL_TIMEOUT_MS=30000
ENABLE_WEBSITE_ANALYZER=false
```

7. 点击 "Deploy"
8. 等待部署完成（约3-5分钟）
9. 复制Railway提供的URL（例如: `https://your-app.railway.app`）

**方法B: 使用Railway CLI**

```bash
# 安装Railway CLI
npm install -g @railway/cli

# 登录
railway login

# 初始化项目
railway init

# 部署
railway up

# 配置环境变量
railway variables set DB_HOST=your-supabase-host
railway variables set DB_PASSWORD=your-password
# ... 其他变量
```

### 步骤2: 部署前端到Vercel

1. 创建前端环境变量文件:

```bash
# frontend/.env.production
VITE_API_BASE_URL=https://your-app.railway.app
```

2. 部署到Vercel:

```bash
cd frontend

# 安装Vercel CLI（如果没有）
npm install -g vercel

# 登录
vercel login

# 部署到生产环境
vercel --prod
```

3. 或者使用Vercel Dashboard:
   - 访问 https://vercel.com
   - 导入GitHub仓库
   - 配置:
     - **Root Directory**: `frontend`
     - **Framework Preset**: Vite
     - **Build Command**: `npm run build`
     - **Output Directory**: `dist`
   - 添加环境变量: `VITE_API_BASE_URL`
   - 部署

### 步骤3: 验证部署

```bash
# 检查后端
curl https://your-app.railway.app/health

# 预期响应
{
  "status": "healthy",
  "services": {
    "database": "up",
    "queue": "pg-boss"
  },
  "optimization": {
    "stage1": "enabled",
    "features": [
      "SimpleRetriever",
      "DebugLogger",
      "OptimizedLLMSearch",
      "ReferenceValidation"
    ]
  }
}

# 访问前端
open https://your-app.vercel.app
```

---

## 验证阶段一优化

### 1. 检查Railway日志

在Railway Dashboard → Logs，查找：

```
✓ Server started on port 3000
✓ Database connected
✓ pg-boss started
✓ [ContentRetriever] Using optimized LLM search
```

### 2. 创建测试任务

在前端创建一个测试任务，然后查看Railway日志中的debug信息：

```
========== DEBUG INFO ==========
{
  "keyword": "example",
  "chunking": {
    "totalChunks": 5,
    "avgChunkSize": 250
  },
  "retrieval": {
    "retrievedChunks": 5,
    "topScore": 0.85
  },
  "llmCall": {
    "totalTokens": 1396,
    "cost": 0.008784
  },
  "llmAnswer": {
    "found": true,
    "confidence": 0.9
  },
  "validation": {
    "quotedSentenceValid": true,
    "sourceUrlValid": true
  }
}
================================
```

### 3. 验证性能指标

- [ ] Token使用 <1,500
- [ ] 成本 <$0.01
- [ ] 响应时间 <5秒
- [ ] 引用验证通过

---

## 成本估算

### 免费额度

| 服务 | 免费额度 | 成本 |
|------|---------|------|
| Vercel | 100GB带宽/月 | $0 |
| Railway | 500小时/月 | $0 |
| Supabase | 500MB存储 | $0 |
| **总计** | | **$0/月** |

### 超出免费额度后

| 服务 | 付费价格 |
|------|---------|
| Vercel Pro | $20/月 |
| Railway | $5/月起 |
| Supabase Pro | $25/月 |

---

## 故障排查

### 问题1: Railway构建失败

**检查**:
- Railway Dashboard → Deployments → Build Logs

**常见原因**:
- 依赖安装失败
- TypeScript编译错误
- 内存不足

**解决**:
```bash
# 本地测试构建
cd backend
npm install
npm run build

# 如果成功，问题可能在Railway配置
```

### 问题2: 数据库连接失败

**检查**:
- Railway Dashboard → Variables
- 确认DB_HOST, DB_PASSWORD等变量正确

**解决**:
```bash
# 在Supabase Dashboard获取正确的连接信息
# Settings → Database → Connection string
```

### 问题3: Debug信息未显示

**检查**:
- Railway Dashboard → Variables
- 确认DEBUG_MODE=true

**解决**:
```bash
# 在Railway Dashboard添加环境变量
DEBUG_MODE=true

# 重新部署
```

---

## 监控和维护

### Railway监控

1. 访问 Railway Dashboard
2. 查看 Metrics 标签页
3. 监控:
   - CPU使用率
   - 内存使用率
   - 请求数
   - 响应时间

### 日志查看

```bash
# 使用Railway CLI
railway logs

# 或在Railway Dashboard → Logs
```

### 自动重启

Railway会自动重启崩溃的服务，配置在railway.json:
```json
{
  "deploy": {
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

---

## 下一步

### 立即行动
1. [ ] 部署后端到Railway
2. [ ] 配置环境变量
3. [ ] 部署前端到Vercel
4. [ ] 验证部署
5. [ ] 创建测试任务

### 短期行动
1. [ ] 收集性能数据
2. [ ] 分析debug信息
3. [ ] 对比优化前后
4. [ ] 调整配置参数

### 中期行动
1. [ ] 持续监控指标
2. [ ] 收集用户反馈
3. [ ] 性能调优
4. [ ] 准备生产环境

---

## 快速命令

```bash
# 使用自动化脚本
./快速部署-Vercel-Railway.sh

# 或手动部署
cd frontend && vercel --prod
railway up

# 验证
curl https://your-app.railway.app/health
```

---

## 相关文档

- [快速部署-Vercel-Railway.sh](./快速部署-Vercel-Railway.sh) - 自动化部署脚本
- [阶段一优化快速参考.md](./阶段一优化快速参考.md) - 功能参考
- [端到端测试报告.md](./端到端测试报告.md) - 测试报告

---

**创建时间**: 2026-04-30  
**状态**: ✅ 准备部署  
**推荐**: 使用Railway GitHub集成（最简单）
