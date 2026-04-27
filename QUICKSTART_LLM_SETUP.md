# 快速开始 - LLM 配置

本指南帮助您快速配置系统使用 Webull 内部 LLM 服务。

## 快速配置步骤

### 1. 复制配置文件

```bash
# 使用 Webull 配置模板
cp .env.webull.example .env

# 或者手动创建 .env 文件
nano .env
```

### 2. 填入配置信息

在 `.env` 文件中添加以下内容：

```bash
# JWT 密钥（必须修改）
JWT_SECRET=your-secret-key-change-in-production

# Webull 内部 LLM API 配置
LLM_API_URL=https://office.webullbroker.com/api/oa-ai/open/chat/completions
LLM_API_KEY=dcb0d1c8-82c7-478f-bd9a-7c3023cac4d8
LLM_MODEL=us.anthropic.claude-sonnet-4-20250514-v1:0
LLM_API_KEY_HEADER=authorization
LLM_AUTH_PREFIX=Bearer
```

### 3. 启动服务

#### 使用 Docker Compose（推荐）

```bash
# 构建并启动所有服务
docker-compose up -d

# 初始化数据库
docker-compose exec backend npm run migrate

# 查看日志
docker-compose logs -f backend
```

#### 本地开发环境

```bash
# 后端配置
cp backend/.env.example backend/.env
nano backend/.env  # 添加上述 LLM 配置

# 启动数据库
docker-compose up -d postgres redis

# 初始化数据库
cd backend
npm run migrate

# 启动后端
npm run dev

# 在另一个终端启动前端
cd frontend
npm run dev
```

## 验证配置

### 方法 1: 查看启动日志

```bash
# Docker 环境
docker-compose logs backend | grep -i llm

# 本地环境
# 查看终端输出
```

### 方法 2: 测试 API 调用

创建一个测试任务并手动执行，查看是否能成功生成总结文档。

1. 访问前端: http://localhost (Docker) 或 http://localhost:5173 (本地)
2. 登录/注册账号
3. 创建一个测试任务
4. 手动触发执行
5. 查看执行结果中的总结文档

### 方法 3: 直接测试 LLM API

```bash
# 进入后端目录
cd backend

# 创建测试脚本
cat > test-llm.js << 'EOF'
require('dotenv').config();
const fetch = require('node-fetch');

const testLLM = async () => {
  const apiUrl = process.env.LLM_API_URL;
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL;
  const apiKeyHeader = process.env.LLM_API_KEY_HEADER || 'Authorization';
  const authPrefix = process.env.LLM_AUTH_PREFIX || 'Bearer';

  console.log('测试 LLM API 配置...');
  console.log('URL:', apiUrl);
  console.log('Model:', model);
  console.log('Header:', apiKeyHeader);
  console.log('');

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
          { role: 'user', content: '你好，请简单回复"测试成功"' }
        ],
        max_tokens: 50
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ 测试失败:', response.status, errorText);
      return;
    }

    const data = await response.json();
    console.log('✅ 测试成功!');
    console.log('响应:', data.choices[0].message.content);
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
};

testLLM();
EOF

# 运行测试
node test-llm.js
```

## 配置说明

### 环境变量详解

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `LLM_API_URL` | LLM API 端点地址 | `https://office.webullbroker.com/api/oa-ai/open/chat/completions` |
| `LLM_API_KEY` | API 密钥 | `dcb0d1c8-82c7-478f-bd9a-7c3023cac4d8` |
| `LLM_MODEL` | 模型名称 | `us.anthropic.claude-sonnet-4-20250514-v1:0` |
| `LLM_API_KEY_HEADER` | 认证头名称 | `authorization` |
| `LLM_AUTH_PREFIX` | 认证前缀 | `Bearer` |

### 请求格式

系统会发送以下格式的请求到 LLM API：

**请求头**:
```
Content-Type: application/json
authorization: Bearer dcb0d1c8-82c7-478f-bd9a-7c3023cac4d8
```

**请求体**:
```json
{
  "model": "us.anthropic.claude-sonnet-4-20250514-v1:0",
  "messages": [
    {
      "role": "system",
      "content": "你是一个专业的金融合规政策分析专家，擅长总结和对比分析政策内容。"
    },
    {
      "role": "user",
      "content": "用户提示词..."
    }
  ],
  "temperature": 0.7,
  "max_tokens": 2000
}
```

## 常见问题

### Q1: 如何切换回 OpenAI？

删除或注释掉 `LLM_*` 相关的环境变量，只保留 `OPENAI_API_KEY`:

```bash
# .env
OPENAI_API_KEY=sk-your-openai-key
OPENAI_MODEL=gpt-4
```

### Q2: 可以同时配置两个吗？

可以。系统会优先使用自定义 LLM 配置（`LLM_*` 变量），如果未配置则回退到 OpenAI。

### Q3: 如何查看 LLM 调用日志？

```bash
# Docker 环境
docker-compose logs -f backend | grep -i "llm\|analysis"

# 本地环境
# 查看终端输出
```

### Q4: API 调用失败怎么办？

1. 检查网络连接
2. 验证 API 密钥是否正确
3. 确认 API 端点 URL 无误
4. 查看后端日志获取详细错误信息

## 下一步

配置完成后，您可以：

1. 创建监测任务
2. 手动触发执行
3. 查看 AI 生成的总结和分析报告

详细使用说明请查看 [README.md](README.md)。

## 相关文档

- [LLM_CONFIGURATION.md](LLM_CONFIGURATION.md) - 完整的 LLM 配置指南
- [README.md](README.md) - 项目完整文档
- [DEPLOYMENT.md](DEPLOYMENT.md) - 部署指南
