# Vercel + Supabase 部署说明

## 重要说明

⚠️ **Vercel Serverless Functions的限制**:
- 无状态执行（每次请求都是新实例）
- 执行时间限制（免费版10秒，Pro版60秒）
- 不支持长时间运行的任务队列
- 不支持WebSocket长连接
- 冷启动延迟

**本项目的特点**:
- 需要任务队列（pg-boss）
- 需要长时间运行的检索任务（可能>60秒）
- 需要后台任务处理
- 需要持久连接到数据库

## 推荐方案

### 方案1: Vercel前端 + Railway后端（推荐）✅

**优点**:
- 前端CDN加速（Vercel）
- 后端持久运行（Railway）
- 支持任务队列
- 支持长时间任务

**部署步骤**:
1. 前端部署到Vercel
2. 后端部署到Railway
3. 数据库使用Supabase

**成本**: 免费（Railway 500小时/月）

### 方案2: 全部Vercel（仅适合演示）⚠️

**限制**:
- 只能处理简单的API请求
- 不支持任务队列
- 不支持长时间任务
- 每次请求都是冷启动

**适用场景**:
- 演示项目
- 简单的CRUD操作
- 不需要后台任务

## 当前部署状态

### 已部署
- ✅ 代码已推送到GitHub
- ✅ 前端配置完成（Vercel）
- ✅ 数据库运行中（Supabase）

### 待部署
- ⏳ 后端服务（需要选择平台）

## 快速部署（推荐方案）

### 步骤1: 部署前端到Vercel

```bash
# 进入前端目录
cd frontend

# 安装Vercel CLI
npm install -g vercel

# 登录Vercel
vercel login

# 部署
vercel --prod
```

**环境变量**（在Vercel Dashboard配置）:
```bash
VITE_API_BASE_URL=https://your-backend.railway.app
```

### 步骤2: 部署后端到Railway

**方法1: 使用Railway CLI**
```bash
# 安装Railway CLI
npm install -g @railway/cli

# 登录
railway login

# 初始化项目
railway init

# 部署
railway up
```

**方法2: 使用GitHub集成**
1. 访问 https://railway.app
2. 点击 "New Project"
3. 选择 "Deploy from GitHub repo"
4. 选择你的仓库
5. 配置环境变量
6. 部署

**环境变量**（在Railway Dashboard配置）:
```bash
# 数据库配置
DB_HOST=your-supabase-host.supabase.com
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-password

# 阶段一优化配置
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
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRES_IN=7d

# 其他配置
NODE_ENV=production
PORT=3000
JINA_READER_API_URL=https://r.jina.ai
MAX_PARALLEL_WEBSITES=5
RETRIEVAL_TIMEOUT_MS=30000
ENABLE_WEBSITE_ANALYZER=false
```

**Railway配置**:
- Root Directory: `backend`
- Build Command: `npm install && npm run build`
- Start Command: `node dist/index.pgboss.js`

### 步骤3: 验证部署

```bash
# 检查后端
curl https://your-backend.railway.app/health

# 检查前端
open https://your-frontend.vercel.app
```

## 仅Vercel部署（演示用）

如果你坚持只使用Vercel，这里是配置：

### 限制说明
- ❌ 不支持任务队列
- ❌ 不支持长时间任务
- ❌ 每次请求冷启动
- ✅ 只能处理简单API请求

### 部署步骤

1. **创建API函数**（已创建）
   - `api/health.ts` - 健康检查

2. **部署**
```bash
vercel --prod
```

3. **环境变量**（在Vercel Dashboard配置）
```bash
DB_HOST=your-supabase-host.supabase.com
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-password

DEBUG_MODE=true
MAX_CHUNKS_PER_KEYWORD=30
CHUNK_MAX_SIZE=500
CHUNK_MIN_SIZE=100
CHUNK_OVERLAP=50

LLM_API_URL=https://office.webullbroker.com/api/oa-ai/open/chat/completions
LLM_API_KEY=dcb0d1c8-82c7-478f-bd9a-7c3023cac4d8
LLM_MODEL=us.anthropic.claude-sonnet-4-20250514-v1:0
```

## 建议

### 对于测试环境
✅ **推荐**: Vercel前端 + Railway后端 + Supabase数据库

**理由**:
- 完整功能支持
- 免费额度充足
- 部署简单
- 性能稳定

### 对于生产环境
考虑以下方案：
1. Vercel前端 + Railway后端 + Supabase数据库（小规模）
2. Vercel前端 + AWS ECS后端 + RDS数据库（大规模）
3. 自建服务器（完全控制）

## 下一步

请选择部署方案：

**方案A: Vercel + Railway（推荐）**
```bash
# 1. 部署前端到Vercel
cd frontend && vercel --prod

# 2. 部署后端到Railway
# 访问 https://railway.app 并按照上述步骤操作
```

**方案B: 仅Vercel（演示）**
```bash
# 部署整个项目到Vercel
vercel --prod

# 注意：功能受限
```

---

**创建时间**: 2026-04-30  
**状态**: 等待选择部署方案
