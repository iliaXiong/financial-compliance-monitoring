# LLM API 配置指南

本文档说明如何配置系统使用的 LLM API，支持 OpenAI 和自定义端点。

## 配置方式

系统支持两种 LLM API 配置方式：

### 方式 1: 使用 OpenAI API（默认）

这是最简单的配置方式，适合使用 OpenAI 官方 API 的用户。

**环境变量配置**:

```bash
# backend/.env 或 .env
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4
```

**说明**:
- `OPENAI_API_KEY`: OpenAI API 密钥
- `OPENAI_MODEL`: 使用的模型名称（如 `gpt-4`, `gpt-3.5-turbo` 等）

### 方式 2: 使用自定义 LLM 端点

适合使用企业内部 LLM 服务或其他 OpenAI 兼容 API 的用户。

**环境变量配置**:

```bash
# backend/.env 或 .env
LLM_API_URL=https://office.webullbroker.com/api/oa-ai/open/chat/completions
LLM_API_KEY=dcb0d1c8-82c7-478f-bd9a-7c3023cac4d8
LLM_MODEL=us.anthropic.claude-sonnet-4-20250514-v1:0
LLM_API_KEY_HEADER=authorization
LLM_AUTH_PREFIX=Bearer
```

**说明**:
- `LLM_API_URL`: LLM API 端点 URL
- `LLM_API_KEY`: API 密钥
- `LLM_MODEL`: 模型名称
- `LLM_API_KEY_HEADER`: 认证头名称（默认 `Authorization`）
- `LLM_AUTH_PREFIX`: 认证前缀（默认 `Bearer`）

**优先级**: 如果同时配置了自定义端点和 OpenAI，系统会优先使用自定义端点配置。

## 配置示例

### 示例 1: Webull 内部 LLM 服务

```bash
# backend/.env
LLM_API_URL=https://office.webullbroker.com/api/oa-ai/open/chat/completions
LLM_API_KEY=dcb0d1c8-82c7-478f-bd9a-7c3023cac4d8
LLM_MODEL=us.anthropic.claude-sonnet-4-20250514-v1:0
LLM_API_KEY_HEADER=authorization
LLM_AUTH_PREFIX=Bearer
```

### 示例 2: Azure OpenAI

```bash
# backend/.env
LLM_API_URL=https://your-resource.openai.azure.com/openai/deployments/your-deployment/chat/completions?api-version=2023-05-15
LLM_API_KEY=your-azure-api-key
LLM_MODEL=gpt-4
LLM_API_KEY_HEADER=api-key
LLM_AUTH_PREFIX=
```

### 示例 3: 自定义认证头

如果您的 API 使用自定义认证头格式：

```bash
# backend/.env
LLM_API_URL=https://your-api.example.com/v1/chat/completions
LLM_API_KEY=your-api-key
LLM_MODEL=your-model-name
LLM_API_KEY_HEADER=X-API-Key
LLM_AUTH_PREFIX=
```

## Docker Compose 配置

如果使用 Docker Compose 部署，在根目录的 `.env` 文件中配置：

```bash
# .env (根目录)
LLM_API_URL=https://office.webullbroker.com/api/oa-ai/open/chat/completions
LLM_API_KEY=dcb0d1c8-82c7-478f-bd9a-7c3023cac4d8
LLM_MODEL=us.anthropic.claude-sonnet-4-20250514-v1:0
LLM_API_KEY_HEADER=authorization
LLM_AUTH_PREFIX=Bearer
```

然后更新 `docker-compose.yml` 中的 backend 服务环境变量：

```yaml
backend:
  environment:
    # ... 其他环境变量 ...
    LLM_API_URL: ${LLM_API_URL:-https://api.openai.com/v1/chat/completions}
    LLM_API_KEY: ${LLM_API_KEY:-${OPENAI_API_KEY}}
    LLM_MODEL: ${LLM_MODEL:-${OPENAI_MODEL:-gpt-4}}
    LLM_API_KEY_HEADER: ${LLM_API_KEY_HEADER:-Authorization}
    LLM_AUTH_PREFIX: ${LLM_AUTH_PREFIX:-Bearer}
```

## API 请求格式

系统会向配置的 LLM API 端点发送以下格式的请求：

```json
{
  "model": "your-model-name",
  "messages": [
    {
      "role": "system",
      "content": "你是一个专业的金融合规政策分析专家，擅长总结和对比分析政策内容。"
    },
    {
      "role": "user",
      "content": "用户的提示词..."
    }
  ],
  "temperature": 0.7,
  "max_tokens": 2000
}
```

**请求头**:
```
Content-Type: application/json
{LLM_API_KEY_HEADER}: {LLM_AUTH_PREFIX} {LLM_API_KEY}
```

例如，使用默认配置时：
```
Content-Type: application/json
Authorization: Bearer your-api-key
```

## 验证配置

### 1. 检查环境变量

```bash
# 进入后端容器（如果使用 Docker）
docker-compose exec backend sh

# 查看环境变量
echo $LLM_API_URL
echo $LLM_API_KEY
echo $LLM_MODEL
```

### 2. 测试 API 连接

创建测试脚本 `test-llm.js`:

```javascript
const fetch = require('node-fetch');

const testLLM = async () => {
  const apiUrl = process.env.LLM_API_URL || 'https://api.openai.com/v1/chat/completions';
  const apiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY;
  const model = process.env.LLM_MODEL || 'gpt-4';
  const apiKeyHeader = process.env.LLM_API_KEY_HEADER || 'Authorization';
  const authPrefix = process.env.LLM_AUTH_PREFIX || 'Bearer';

  console.log('Testing LLM API...');
  console.log('URL:', apiUrl);
  console.log('Model:', model);
  console.log('Header:', apiKeyHeader);

  const headers = {
    'Content-Type': 'application/json'
  };
  headers[apiKeyHeader] = authPrefix ? `${authPrefix} ${apiKey}` : apiKey;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: [
          { role: 'user', content: '你好，请回复"测试成功"' }
        ],
        max_tokens: 50
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error:', response.status, errorText);
      return;
    }

    const data = await response.json();
    console.log('Success!');
    console.log('Response:', data.choices[0].message.content);
  } catch (error) {
    console.error('Failed:', error.message);
  }
};

testLLM();
```

运行测试:
```bash
cd backend
node test-llm.js
```

### 3. 查看应用日志

```bash
# 查看后端日志
docker-compose logs -f backend

# 或本地开发环境
cd backend
npm run dev
```

## 故障排除

### 问题 1: API 密钥无效

**错误**: `LLM API error: 401 Unauthorized`

**解决方案**:
- 检查 `LLM_API_KEY` 是否正确
- 确认 API 密钥未过期
- 验证认证头格式是否正确

### 问题 2: 模型不存在

**错误**: `LLM API error: 404 Not Found` 或 `Model not found`

**解决方案**:
- 检查 `LLM_MODEL` 配置是否正确
- 确认您的 API 密钥有权访问该模型
- 查看 API 提供商的模型列表

### 问题 3: 请求超时

**错误**: `Failed to call LLM API: timeout`

**解决方案**:
- 检查网络连接
- 确认 API 端点 URL 正确
- 考虑增加超时时间（需要修改代码）

### 问题 4: 响应格式不兼容

**错误**: `LLM API returned no choices`

**解决方案**:
- 确认 API 返回格式与 OpenAI 兼容
- 检查 API 文档，确认响应结构
- 可能需要修改 `AnalysisService.ts` 中的响应解析逻辑

## 安全建议

1. **不要提交 API 密钥到版本控制**
   - 将 `.env` 添加到 `.gitignore`
   - 使用环境变量或密钥管理服务

2. **使用强密钥**
   - 定期轮换 API 密钥
   - 限制 API 密钥权限

3. **监控 API 使用**
   - 设置使用配额告警
   - 记录 API 调用日志

4. **网络安全**
   - 使用 HTTPS 端点
   - 在生产环境中配置防火墙规则

## 相关文件

- `backend/src/services/AnalysisService.ts` - LLM API 调用实现
- `backend/src/config/index.ts` - 配置加载
- `backend/.env.example` - 环境变量模板
- `.env.example` - Docker Compose 环境变量模板

## 技术支持

如有配置问题，请：
1. 查看本文档的故障排除部分
2. 检查应用日志
3. 提交 Issue 并附上错误信息（注意隐藏敏感信息）
