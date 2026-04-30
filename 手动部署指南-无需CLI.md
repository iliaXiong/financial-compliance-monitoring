# 手动部署指南（无需CLI工具）

**适用场景**: 不想安装CLI工具，使用Web界面部署

---

## 当前状态

✅ **代码已推送到GitHub**
- Commit: b83049b
- 包含阶段一优化的所有代码

✅ **后端URL已知**
- `https://financial-compliance-monitoring-production.up.railway.app`

---

## 部署步骤

### 步骤1: 更新前端环境变量配置

创建前端生产环境配置文件：

```bash
# 在项目根目录执行
cat > frontend/.env.production << 'EOF'
VITE_API_BASE_URL=https://financial-compliance-monitoring-production.up.railway.app
EOF
```

或手动创建文件 `frontend/.env.production`，内容：
```
VITE_API_BASE_URL=https://financial-compliance-monitoring-production.up.railway.app
```

### 步骤2: 提交环境变量文件

```bash
git add frontend/.env.production
git commit -m "chore: 添加生产环境配置"
git push origin main
```

### 步骤3: 在Vercel Dashboard部署前端

1. **访问Vercel**
   - 打开 https://vercel.com/dashboard
   - 使用GitHub登录

2. **导入项目**（如果还没有）
   - 点击 "Add New..." → "Project"
   - 选择 "Import Git Repository"
   - 找到 `financial-compliance-monitoring` 仓库
   - 点击 "Import"

3. **配置项目**
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. **添加环境变量**
   - 在配置页面找到 "Environment Variables"
   - 添加：
     ```
     Name: VITE_API_BASE_URL
     Value: https://financial-compliance-monitoring-production.up.railway.app
     ```
   - 选择 "Production", "Preview", "Development" 都勾选

5. **部署**
   - 点击 "Deploy"
   - 等待3-5分钟

6. **获取前端URL**
   - 部署完成后，Vercel会显示URL
   - 例如: `https://financial-compliance-monitoring.vercel.app`

### 步骤4: 在Railway Dashboard更新后端环境变量

1. **访问Railway**
   - 打开 https://railway.app/dashboard
   - 选择项目 `financial-compliance-monitoring`
   - 点击后端服务

2. **添加阶段一优化环境变量**
   - 点击 "Variables" 标签
   - 点击 "New Variable" 或 "RAW Editor"
   - 添加以下变量：

```bash
# 阶段一优化配置（新增）
DEBUG_MODE=true
MAX_CHUNKS_PER_KEYWORD=30
CHUNK_MAX_SIZE=500
CHUNK_MIN_SIZE=100
CHUNK_OVERLAP=50
```

3. **保存并重新部署**
   - 点击 "Save"
   - Railway会自动重新部署
   - 等待3-5分钟

### 步骤5: 验证部署

1. **检查后端**
   - 访问: https://financial-compliance-monitoring-production.up.railway.app/health
   - 应该看到：
   ```json
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
   ```

2. **检查前端**
   - 访问你的Vercel URL
   - 应该能看到应用界面
   - 尝试登录和创建任务

3. **检查Railway日志**
   - 在Railway Dashboard → Deployments → 最新部署 → Logs
   - 查找以下内容：
   ```
   ✓ Server started on port 3000
   ✓ Database connected
   ✓ pg-boss started
   ✓ [ContentRetriever] Using optimized LLM search
   ```

4. **测试阶段一优化**
   - 在前端创建一个测试任务
   - 在Railway日志中查找 "DEBUG INFO"
   - 应该看到完整的debug信息输出

---

## 如果Railway后端不存在

如果 `https://financial-compliance-monitoring-production.up.railway.app` 不可访问，需要重新部署后端：

### 在Railway Dashboard部署后端

1. **访问Railway**
   - 打开 https://railway.app/dashboard
   - 点击 "New Project"

2. **从GitHub部署**
   - 选择 "Deploy from GitHub repo"
   - 选择 `financial-compliance-monitoring` 仓库
   - Railway会自动检测到Node.js项目

3. **配置服务**
   - 点击服务 → Settings
   - 设置：
     - **Root Directory**: `backend`
     - **Build Command**: `npm install && npm run build`
     - **Start Command**: `node dist/index.pgboss.js`

4. **添加环境变量**
   - 点击 "Variables" 标签
   - 点击 "RAW Editor"
   - 粘贴以下内容：

```bash
NODE_ENV=production
PORT=3000

# 数据库配置（从Supabase获取）
DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=你的Supabase密码

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

# JWT配置（使用 openssl rand -base64 32 生成）
JWT_SECRET=你的JWT密钥
JWT_EXPIRES_IN=7d

# 其他配置
JINA_READER_API_URL=https://r.jina.ai
MAX_PARALLEL_WEBSITES=5
RETRIEVAL_TIMEOUT_MS=30000
ENABLE_WEBSITE_ANALYZER=false
```

5. **生成域名**
   - 点击 Settings → Networking
   - 点击 "Generate Domain"
   - 复制生成的URL（例如: `https://your-app.railway.app`）

6. **更新前端配置**
   - 使用新的Railway URL更新 `frontend/.env.production`
   - 提交并推送
   - 在Vercel Dashboard更新环境变量

---

## 快速命令总结

```bash
# 1. 创建前端环境变量文件
cat > frontend/.env.production << 'EOF'
VITE_API_BASE_URL=https://financial-compliance-monitoring-production.up.railway.app
EOF

# 2. 提交并推送
git add frontend/.env.production
git commit -m "chore: 添加生产环境配置"
git push origin main

# 3. 然后在Web界面完成部署
# - Vercel: https://vercel.com/dashboard
# - Railway: https://railway.app/dashboard
```

---

## 验证清单

部署完成后，检查以下项目：

- [ ] 后端健康检查返回正常
- [ ] 前端可以访问
- [ ] 前端可以连接到后端
- [ ] Railway日志显示 "Using optimized LLM search"
- [ ] 创建测试任务成功
- [ ] Railway日志显示 "DEBUG INFO"
- [ ] Debug信息包含所有6个阶段
- [ ] Token使用量显示在日志中
- [ ] 引用验证结果显示在日志中

---

## 故障排查

### 问题1: 前端无法连接后端

**检查**:
1. Vercel环境变量 `VITE_API_BASE_URL` 是否正确
2. Railway后端是否正在运行
3. 浏览器控制台是否有CORS错误

**解决**:
- 在Vercel Dashboard更新环境变量
- 重新部署前端

### 问题2: Railway日志没有DEBUG INFO

**检查**:
1. Railway环境变量 `DEBUG_MODE=true` 是否存在
2. 服务是否已重启

**解决**:
- 在Railway Dashboard添加 `DEBUG_MODE=true`
- 点击 "Redeploy" 重新部署

### 问题3: 后端启动失败

**检查**:
1. Railway Deployment Logs
2. 查找错误信息

**常见原因**:
- 数据库连接失败（检查DB_HOST, DB_PASSWORD）
- 环境变量缺失
- 启动命令错误

---

## 相关链接

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Railway Dashboard**: https://railway.app/dashboard
- **Supabase Dashboard**: https://supabase.com/dashboard
- **GitHub仓库**: https://github.com/iliaXiong/financial-compliance-monitoring

---

**创建时间**: 2026-04-30  
**适用场景**: 不使用CLI工具的手动部署  
**下一步**: 按照步骤1-5完成部署
