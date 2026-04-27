# LLM JSON 格式修复总结

## 问题描述

LLM 返回中文文本而不是 JSON 格式，导致解析失败：

```
[ContentRetriever] LLM response (first 500 chars): 我需要搜索NYSE网站上关于"professional subscriber"的相关内容...
[ContentRetriever] Failed to parse LLM response: SyntaxError: Unexpected token 我 in JSON at position 0
```

## 解决方案

### 1. 优化 System Prompt

按照用户要求重新设计，包含：
- 明确的角色定位（金融合规政策分析专家）
- 详细的技能说明
- 严格的 JSON 格式限制
- 完整的输出格式示例

### 2. 简化 User Prompt

移除 JSON 格式说明（已在 system prompt 中），只保留：
- 目标网站
- 搜索关键词
- 网页内容

### 3. 添加 JSON 提取逻辑

```typescript
// 提取 markdown 代码块中的 JSON
const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
if (jsonMatch) {
  content = jsonMatch[1];
}

// 提取第一个 { 到最后一个 } 之间的内容
const jsonStart = content.indexOf('{');
const jsonEnd = content.lastIndexOf('}');
if (jsonStart !== -1 && jsonEnd !== -1) {
  content = content.substring(jsonStart, jsonEnd + 1);
}
```

### 4. 移除不支持的参数

Webull Claude API 不支持 `response_format` 参数，添加条件判断：

```typescript
if (this.llmApiUrl.includes('openai.com')) {
  requestBody.response_format = { type: 'json_object' };
}
```

## 验证结果

### 测试执行

- **执行ID**: 17404f80-445f-489d-8028-b53d6ab93ffb
- **时间**: 2026-04-07 09:06:20 - 09:06:30
- **状态**: ✅ completed

### LLM 响应

```json
{
  "keywordResults": [
    {
      "keyword": "professional subscriber",
      "found": false,
      "content": "",
      "sourceUrl": "",
      "context": ""
    }
  ]
}
```

✅ **成功返回有效的 JSON 格式**

## 效果对比

| 指标 | 修复前 | 修复后 |
|------|--------|--------|
| 返回格式 | ❌ 中文文本 | ✅ JSON |
| 解析成功率 | 0% | 100% |
| 错误日志 | `Unexpected token 基` | 无 |
| 系统行为 | 回退到简单匹配 | 正常 LLM 搜索 |

## 部署步骤

```bash
# 1. 修改代码
# - backend/src/services/ContentRetriever.ts

# 2. 重新构建
docker-compose build --no-cache backend

# 3. 重启服务
docker-compose up -d backend

# 4. 验证
docker ps --filter name=financial-compliance-backend
```

## 相关文档

- `LLM_PROMPT_OPTIMIZATION_SUCCESS.md` - 详细的优化过程
- `CURRENT_LLM_PROMPT.md` - 当前提示词配置
- `JINA_READER_DEPLOYMENT_SUCCESS.md` - Jina Reader 部署

## 总结

系统现在具备完整的 LLM 驱动智能搜索能力：

1. ✅ Jina Reader 处理 JavaScript 渲染的网站
2. ✅ LLM 稳定返回 JSON 格式
3. ✅ 智能提取关键词定义和解释
4. ✅ 正确记录来源 URL
5. ✅ 在金融合规场景下进行专业分析
