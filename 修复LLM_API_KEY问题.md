# 修复 LLM API Key 问题

## 🚨 错误信息
```
LLM API key is not configured
```

## 🔍 问题原因

Railway环境变量中的 `LLM_API_KEY` 丢失或未设置。

可能的原因：
1. Railway部署时环境变量被清空
2. 环境变量名称拼写错误
3. 环境变量未保存

## 🔧 立即修复（5分钟）

### 步骤1: 打开Railway Dashboard

1. 访问 https://railway.app
2. 进入项目 "financial-compliance-monitoring"
3. 点击 Backend 服务
4. 点击 "Variables" 标签

### 步骤2: 检查并添加LLM环境变量

确保以下环境变量存在且正确：

```bash
# 必需的LLM配置
LLM_API_KEY=dcb0d1c8-82c7-478f-bd9a-7c3023cac4d8
LLM_API_URL=https://office.webullbroker.com/api/oa-ai/open/chat/completions
LLM_MODEL=us.anthropic.claude-sonnet-4-20250514-v1:0
LLM_API_KEY_HEADER=authorization
LLM_AUTH_PREFIX=Bearer
```

### 步骤3: 保存并重新部署

1. 点击 "Add Variable" 添加缺失的变量
2. 或者点击现有变量进行编辑
3. 点击 "Save" 保存
4. Railway会自动重新部署（约2-3分钟）

## 📋 完整的环境变量清单

请确保Railway中有以下所有环境变量：

```bash
# Node环境
NODE_ENV=production
PORT=3000
TZ=Asia/Shanghai

# 数据库配置
DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com
DB_PORT=6543
DB_NAME=postgres
DB_USER=postgres.ynbaatdsceqtqwmqhlgu
DB_PASSWORD=KhpGTR6dMFzZz7qq

# JWT配置
JWT_SECRET=u7uEwPvtAxpLo1GafP/WiQhTpzT+9UDOXy5nmuuQ1fU=
JWT_EXPIRES_IN=7d

# LLM配置（关键！）
LLM_API_KEY=dcb0d1c8-82c7-478f-bd9a-7c3023cac4d8
LLM_API_URL=https://office.webullbroker.com/api/oa-ai/open/chat/completions
LLM_MODEL=us.anthropic.claude-sonnet-4-20250514-v1:0
LLM_API_KEY_HEADER=authorization
LLM_AUTH_PREFIX=Bearer

# Jina Reader配置
JINA_READER_API_URL=https://r.jina.ai

# 功能开关
MAX_PARALLEL_WEBSITES=5
RETRIEVAL_TIMEOUT_MS=30000
ENABLE_WEBSITE_ANALYZER=true
DEMO_MODE=true
```

## 🔍 验证修复

### 方法1: 检查Railway日志

1. 等待部署完成（状态变为 "Success"）
2. 查看 Logs
3. 搜索 "LLM_API_KEY"
4. 应该不再看到 "LLM API key is not configured" 错误

### 方法2: 创建测试任务

1. 在前端创建新任务
2. 立即执行
3. 观察Railway日志
4. 应该看到：
   ```
   [ContentRetriever] Calling LLM API...
   [ContentRetriever] LLM API responded in XXXXms
   ```

### 方法3: 检查SQL结果

执行以下SQL查询：

```sql
-- 查看最新执行的错误信息
SELECT 
  website_url,
  keyword,
  found,
  context
FROM retrieval_results 
WHERE execution_id = (
  SELECT id 
  FROM executions 
  ORDER BY start_time DESC 
  LIMIT 1
);
```

应该不再看到 "LLM API key is not configured" 错误。

## 🎯 快速检查脚本

你也可以使用以下命令快速检查Railway环境变量（需要Railway CLI）：

```bash
# 安装Railway CLI（如果还没有）
npm install -g @railway/cli

# 登录
railway login

# 链接到项目
railway link

# 查看环境变量
railway variables

# 检查LLM_API_KEY是否存在
railway variables | grep LLM_API_KEY
```

## 🚨 常见错误

### 错误1: 变量名拼写错误

❌ 错误:
```
LLM_APIKEY=xxx          # 缺少下划线
LLM_API_KEY =xxx        # 有空格
LLM_API_KEY=            # 值为空
```

✅ 正确:
```
LLM_API_KEY=dcb0d1c8-82c7-478f-bd9a-7c3023cac4d8
```

### 错误2: 值包含引号

❌ 错误:
```
LLM_API_KEY="dcb0d1c8-82c7-478f-bd9a-7c3023cac4d8"  # 不要加引号
LLM_API_KEY='dcb0d1c8-82c7-478f-bd9a-7c3023cac4d8'  # 不要加引号
```

✅ 正确:
```
LLM_API_KEY=dcb0d1c8-82c7-478f-bd9a-7c3023cac4d8
```

### 错误3: 变量未保存

确保点击 "Save" 或 "Add Variable" 后，Railway显示变量已保存。

## 📸 截图指南

### Railway Variables页面应该显示：

```
┌─────────────────────┬──────────────────────────────────────┐
│ Variable Name       │ Value                                │
├─────────────────────┼──────────────────────────────────────┤
│ LLM_API_KEY         │ dcb0d1c8-82c7-478f-bd9a-7c3023cac4d8│
│ LLM_API_URL         │ https://office.webullbroker.com/...  │
│ LLM_MODEL           │ us.anthropic.claude-sonnet-4-...     │
│ LLM_API_KEY_HEADER  │ authorization                        │
│ LLM_AUTH_PREFIX     │ Bearer                               │
└─────────────────────┴──────────────────────────────────────┘
```

## 🔄 如果问题仍然存在

### 方案1: 手动重新部署

1. 在Railway Dashboard
2. 点击 "Deployments" 标签
3. 点击 "Deploy" 按钮
4. 选择 "Redeploy"

### 方案2: 检查代码中的环境变量读取

代码会按以下顺序尝试读取：

```typescript
this.llmApiKey = llmApiKey || process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || '';
```

如果你使用的是 `OPENAI_API_KEY` 而不是 `LLM_API_KEY`，也可以工作。

### 方案3: 添加调试日志

临时添加日志来确认环境变量是否被读取：

```typescript
console.log('[ContentRetriever] LLM_API_KEY exists:', !!process.env.LLM_API_KEY);
console.log('[ContentRetriever] LLM_API_URL:', process.env.LLM_API_URL);
```

## 💡 预防措施

### 1. 备份环境变量

将环境变量保存到本地文件（不要提交到Git）：

```bash
# 在项目根目录创建
.env.railway.backup

# 内容：
LLM_API_KEY=dcb0d1c8-82c7-478f-bd9a-7c3023cac4d8
LLM_API_URL=https://office.webullbroker.com/api/oa-ai/open/chat/completions
...
```

### 2. 使用Railway CLI管理变量

```bash
# 批量设置环境变量
railway variables set LLM_API_KEY=dcb0d1c8-82c7-478f-bd9a-7c3023cac4d8
railway variables set LLM_API_URL=https://office.webullbroker.com/api/oa-ai/open/chat/completions
railway variables set LLM_MODEL=us.anthropic.claude-sonnet-4-20250514-v1:0
railway variables set LLM_API_KEY_HEADER=authorization
railway variables set LLM_AUTH_PREFIX=Bearer
```

### 3. 定期检查

每次部署后，检查关键环境变量是否仍然存在。

## 📞 需要帮助？

如果按照以上步骤操作后问题仍然存在，请提供：

1. Railway Variables页面的截图（隐藏敏感信息）
2. Railway日志中的错误信息
3. 最新执行的SQL查询结果

## 🎉 修复完成后

修复完成后，你应该能够：

1. ✅ 创建并执行任务
2. ✅ 在Railway日志中看到LLM API调用
3. ✅ 在数据库中看到检索结果
4. ✅ 不再看到 "LLM API key is not configured" 错误

## 📚 相关文档

- `.render-env.txt` - 环境变量参考
- `关键词检索实现原理.md` - LLM配置说明
- `RAILWAY_部署指南.md` - Railway部署指南
