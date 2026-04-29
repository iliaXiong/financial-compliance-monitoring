# 在Railway中添加 DEMO_MODE 变量

## 操作步骤

根据你提供的截图，按照以下步骤操作：

### 1. 添加新变量

1. 在Railway Variables页面，点击右上角的 **"+ New Variable"** 按钮
2. 在弹出的对话框中：
   - Variable Name: `DEMO_MODE`
   - Variable Value: `true`
3. 点击 "Add" 或 "Save" 保存

### 2. 等待重新部署

- Railway会自动检测到环境变量变化
- 自动触发重新部署
- 等待约2-3分钟完成部署

### 3. 验证部署

访问以下URL确认服务正常：
- 后端健康检查: https://financial-compliance-monitoring-production.up.railway.app/health
- 前端应用: https://financial-compliance-monitoring.vercel.app

## 为什么需要 DEMO_MODE？

当前系统需要JWT认证，但前端还没有实现完整的登录系统。启用 `DEMO_MODE=true` 后：

- 后端会自动为所有请求添加演示用户
- 无需JWT令牌即可访问所有API
- 用户ID: `00000000-0000-0000-0000-000000000000`
- 用户邮箱: `demo@example.com`

## 预期结果

添加变量并重新部署后：
- ✅ 前端不再显示"未提供认证令牌"错误
- ✅ 可以正常加载任务列表
- ✅ 可以创建、查看、编辑任务
- ✅ 所有API功能正常工作

## 其他需要添加的环境变量（可选）

如果后续发现还有其他功能不正常，可能还需要添加以下变量：

```
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
TZ=Asia/Shanghai
```

但目前只需要添加 `DEMO_MODE=true` 就可以解决认证问题。
