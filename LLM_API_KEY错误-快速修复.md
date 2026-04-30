# LLM API Key 错误 - 快速修复指南

## 🚨 错误
```
LLM API key is not configured
```

## 🎯 原因
Railway环境变量中的 `LLM_API_KEY` 丢失或未设置。

## ⚡ 快速修复（2种方法）

### 方法1: 通过Railway Dashboard（推荐，5分钟）

1. **打开Railway**
   - 访问 https://railway.app
   - 进入项目 "financial-compliance-monitoring"
   - 点击 Backend 服务
   - 点击 "Variables" 标签

2. **添加LLM环境变量**
   
   点击 "Add Variable" 或编辑现有变量，确保有以下5个变量：

   ```
   LLM_API_KEY = dcb0d1c8-82c7-478f-bd9a-7c3023cac4d8
   LLM_API_URL = https://office.webullbroker.com/api/oa-ai/open/chat/completions
   LLM_MODEL = us.anthropic.claude-sonnet-4-20250514-v1:0
   LLM_API_KEY_HEADER = authorization
   LLM_AUTH_PREFIX = Bearer
   ```

   **注意**:
   - 变量名和值之间不要有空格
   - 值不要加引号
   - 确保点击 "Save"

3. **等待自动部署**
   - Railway会自动重新部署（2-3分钟）
   - 等待状态变为 "Success"

4. **测试**
   - 创建新任务并执行
   - 应该不再看到错误

### 方法2: 使用Railway CLI（需要安装CLI）

1. **安装Railway CLI**（如果还没有）
   ```bash
   npm install -g @railway/cli
   ```

2. **登录并链接项目**
   ```bash
   railway login
   railway link
   ```

3. **运行修复脚本**
   ```bash
   ./快速修复Railway环境变量.sh
   ```

   或者手动设置：
   ```bash
   railway variables set LLM_API_KEY=dcb0d1c8-82c7-478f-bd9a-7c3023cac4d8
   railway variables set LLM_API_URL=https://office.webullbroker.com/api/oa-ai/open/chat/completions
   railway variables set LLM_MODEL=us.anthropic.claude-sonnet-4-20250514-v1:0
   railway variables set LLM_API_KEY_HEADER=authorization
   railway variables set LLM_AUTH_PREFIX=Bearer
   ```

4. **验证**
   ```bash
   railway variables | grep LLM
   ```

## ✅ 验证修复

### 检查1: Railway日志
```
[ContentRetriever] Calling LLM API...
[ContentRetriever] LLM API responded in XXXXms
```

### 检查2: SQL查询
```sql
SELECT context 
FROM retrieval_results 
ORDER BY created_at DESC 
LIMIT 1;
```

应该不再显示 "LLM API key is not configured"

## 🔍 为什么会丢失？

可能的原因：
1. Railway部署时环境变量被清空
2. 手动删除了变量
3. 项目重新创建时未设置

## 📋 完整环境变量清单

确保Railway中有以下所有变量（参考 `.render-env.txt`）：

```bash
# Node环境
NODE_ENV=production
PORT=3000
TZ=Asia/Shanghai

# 数据库
DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com
DB_PORT=6543
DB_NAME=postgres
DB_USER=postgres.ynbaatdsceqtqwmqhlgu
DB_PASSWORD=KhpGTR6dMFzZz7qq

# JWT
JWT_SECRET=u7uEwPvtAxpLo1GafP/WiQhTpzT+9UDOXy5nmuuQ1fU=
JWT_EXPIRES_IN=7d

# LLM（关键！）
LLM_API_KEY=dcb0d1c8-82c7-478f-bd9a-7c3023cac4d8
LLM_API_URL=https://office.webullbroker.com/api/oa-ai/open/chat/completions
LLM_MODEL=us.anthropic.claude-sonnet-4-20250514-v1:0
LLM_API_KEY_HEADER=authorization
LLM_AUTH_PREFIX=Bearer

# 其他
JINA_READER_API_URL=https://r.jina.ai
MAX_PARALLEL_WEBSITES=5
RETRIEVAL_TIMEOUT_MS=30000
ENABLE_WEBSITE_ANALYZER=true
DEMO_MODE=true
```

## 🎉 修复完成后

你应该能够：
- ✅ 创建并执行任务
- ✅ LLM API正常调用
- ✅ 获取关键词搜索结果
- ✅ 生成摘要和分析

## 📞 需要帮助？

如果问题仍然存在，请提供：
1. Railway Variables页面截图
2. Railway日志中的错误
3. SQL查询结果

详细文档：`修复LLM_API_KEY问题.md`
