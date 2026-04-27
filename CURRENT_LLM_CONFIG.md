# 当前LLM API配置说明

## 配置概览

系统当前配置为使用 **Webull内部LLM API**，而不是OpenAI API。

## 当前配置详情

### 环境变量（backend/.env）

```bash
# Webull 内部 LLM API 配置
LLM_API_URL=https://office.webullbroker.com/api/oa-ai/open/chat/completions
LLM_API_KEY=dcb0d1c8-82c7-478f-bd9a-7c3023cac4d8
LLM_MODEL=us.anthropic.claude-sonnet-4-20250514-v1:0
LLM_API_KEY_HEADER=authorization
LLM_AUTH_PREFIX=Bearer
```

### 实际运行配置

Docker容器中的环境变量：
- `LLM_API_URL`: https://office.webullbroker.com/api/oa-ai/open/chat/completions
- `LLM_API_KEY`: dcb0d1c8-82c7-478f-bd9a-7c3023cac4d8
- `LLM_MODEL`: us.anthropic.claude-sonnet-4-20250514-v1:0 (Claude Sonnet 4)
- `LLM_API_KEY_HEADER`: authorization
- `LLM_AUTH_PREFIX`: Bearer
- `OPENAI_API_KEY`: (空，未配置)

## 配置优先级

系统使用以下优先级读取配置：

```typescript
// ContentRetriever.ts 和 AnalysisService.ts
this.llmApiKey = llmApiKey || process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || '';
this.llmApiUrl = llmApiUrl || process.env.LLM_API_URL || process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';
this.llmModel = llmModel || process.env.LLM_MODEL || process.env.OPENAI_MODEL || 'gpt-4';
```

优先级顺序：
1. 构造函数参数（最高优先级）
2. `LLM_API_KEY` / `LLM_API_URL` / `LLM_MODEL`
3. `OPENAI_API_KEY` / `OPENAI_API_URL` / `OPENAI_MODEL`
4. 默认值（最低优先级）

## 当前使用的模型

**Claude Sonnet 4** (us.anthropic.claude-sonnet-4-20250514-v1:0)
- 提供商：Anthropic
- 通过Webull内部API访问
- 认证方式：Bearer Token

## 如何切换到OpenAI

如果需要切换到OpenAI API，有两种方式：

### 方式1：修改 backend/.env（推荐）

```bash
# 注释掉或删除Webull配置
# LLM_API_URL=https://office.webullbroker.com/api/oa-ai/open/chat/completions
# LLM_API_KEY=dcb0d1c8-82c7-478f-bd9a-7c3023cac4d8
# LLM_MODEL=us.anthropic.claude-sonnet-4-20250514-v1:0

# 添加OpenAI配置
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_MODEL=gpt-4
# OPENAI_API_URL 可选，默认为 https://api.openai.com/v1/chat/completions
```

然后重启服务：
```bash
docker-compose restart backend
```

### 方式2：使用环境变量覆盖

在docker-compose.yml中设置：
```yaml
environment:
  OPENAI_API_KEY: sk-your-key-here
  OPENAI_MODEL: gpt-4
  # 清空LLM配置，让系统使用OPENAI配置
  LLM_API_KEY: ""
  LLM_API_URL: ""
  LLM_MODEL: ""
```

## 如何使用其他LLM服务

系统支持任何兼容OpenAI API格式的服务：

### Azure OpenAI

```bash
LLM_API_URL=https://your-resource.openai.azure.com/openai/deployments/your-deployment/chat/completions?api-version=2024-02-15-preview
LLM_API_KEY=your-azure-key
LLM_MODEL=gpt-4
LLM_API_KEY_HEADER=api-key
LLM_AUTH_PREFIX=
```

### 本地LLM（如Ollama）

```bash
LLM_API_URL=http://localhost:11434/v1/chat/completions
LLM_API_KEY=ollama
LLM_MODEL=llama2
LLM_API_KEY_HEADER=Authorization
LLM_AUTH_PREFIX=Bearer
```

### 其他云服务

只要API格式兼容OpenAI，都可以使用：
```bash
LLM_API_URL=https://your-service.com/v1/chat/completions
LLM_API_KEY=your-key
LLM_MODEL=your-model
LLM_API_KEY_HEADER=Authorization
LLM_AUTH_PREFIX=Bearer
```

## 验证配置

### 1. 查看当前配置

```bash
docker exec financial-compliance-backend printenv | grep -E "(LLM|OPENAI)"
```

### 2. 测试LLM调用

创建一个测试任务并执行，查看日志：
```bash
docker logs financial-compliance-backend -f | grep -E "(LLM|ContentRetriever)"
```

成功的日志应该显示：
```
[ContentRetriever] Using LLM to search for keywords
[ContentRetriever] LLM search completed: found X/Y keywords
```

失败的日志会显示：
```
[ContentRetriever] LLM search failed: ...
[ContentRetriever] Falling back to simple keyword matching
```

### 3. 检查API连通性

```bash
# 测试Webull API
curl -X POST https://office.webullbroker.com/api/oa-ai/open/chat/completions \
  -H "authorization: Bearer dcb0d1c8-82c7-478f-bd9a-7c3023cac4d8" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "us.anthropic.claude-sonnet-4-20250514-v1:0",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

## 常见问题

### Q: 为什么使用Webull内部API而不是OpenAI？

A: 可能的原因：
- 成本考虑（内部API可能更便宜或免费）
- 数据隐私（数据不离开公司网络）
- 访问限制（某些地区无法访问OpenAI）
- 模型选择（Claude Sonnet 4可能更适合某些任务）

### Q: Claude Sonnet 4和GPT-4哪个更好？

A: 各有优势：
- **Claude Sonnet 4**: 更长的上下文窗口，更好的代码理解，更安全的输出
- **GPT-4**: 更广泛的知识库，更好的创意写作，更成熟的生态

对于金融合规政策检索任务，两者都很合适。

### Q: 如何知道当前使用的是哪个API？

A: 查看日志中的API调用：
```bash
docker logs financial-compliance-backend 2>&1 | grep "LLM API"
```

或查看环境变量：
```bash
docker exec financial-compliance-backend printenv | grep LLM_API_URL
```

### Q: 可以同时配置多个LLM吗？

A: 当前不支持。系统按优先级使用第一个有效的配置。如果需要切换，必须修改环境变量并重启服务。

## 配置建议

### 开发环境
- 使用成本较低的模型（如gpt-3.5-turbo）
- 或使用本地LLM（如Ollama）

### 生产环境
- 使用高质量模型（如gpt-4或claude-sonnet-4）
- 配置适当的超时和重试机制
- 监控API调用成本和性能

### 测试环境
- 可以使用mock LLM响应
- 或使用降级的简单关键词匹配

## 相关文件

- `backend/.env` - 环境变量配置
- `docker-compose.yml` - Docker环境变量映射
- `backend/src/services/ContentRetriever.ts` - LLM调用实现
- `backend/src/services/AnalysisService.ts` - LLM分析服务
- `LLM_CONFIGURATION.md` - LLM配置详细文档
