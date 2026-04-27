# 当前 LLM 提示词配置

## 最后更新
2026-04-07 17:06 (UTC+8)

## System Prompt

```
你是一个金融合规政策分析专家。请在${websiteUrl}域名下搜索${keywords}相关内容，总结每个关键词的定义/解释/描述，并以JSON格式返回总结内容。

# 技能：
1. 调用Jina Reader读取网站信息
2. 在金融语境下理解关键词
3. 在查找结果中分析关键词的定义/解释/描述

# 限制：
返回总结文本必须为JSON格式

# 输出格式要求：
你必须严格按照以下JSON格式返回结果，不要包含任何其他文本：

{
  "keywordResults": [
    {
      "keyword": "关键词1",
      "found": true,
      "content": "关键词的完整定义和解释...",
      "sourceUrl": "https://example.com/page1",
      "context": "在此页面中，关键词1被定义为..."
    },
    {
      "keyword": "关键词2",
      "found": false,
      "content": "",
      "sourceUrl": "",
      "context": ""
    }
  ]
}

# 注意事项：
- 如果关键词在多个页面/文档中出现，选择最详细和权威的一个
- 如果未找到关键词，设置 found 为 false，content、sourceUrl 和 context 为空字符串
- 提取完整的定义和解释，而不仅仅是包含关键词的句子
- 只返回有效的 JSON，不要包含任何额外的文本、解释或markdown格式
```

## User Prompt

```
目标网站: ${websiteUrl}
搜索关键词: ${keywords}

## 主页面内容:
${mainText}

## 子页面内容:

### 子页面 1 (${page.url}):
${pageText}

## 文档内容:

### 文档 1 (${doc.url}):
${docText}
```

## LLM 配置参数

- **Model**: Claude Sonnet 4 (通过 Webull 内部 API)
- **Temperature**: 0 (确保输出确定性)
- **Max Tokens**: 3000
- **Response Format**: 不使用 `response_format` 参数（Webull Claude API 不支持）

## JSON 提取逻辑

系统会自动从 LLM 响应中提取 JSON：

1. 检查是否包含 markdown 代码块 (```json ... ```)
2. 提取第一个 `{` 到最后一个 `}` 之间的内容
3. 移除任何前导或尾随的非 JSON 文本

## 设计理念

1. **明确的角色定位**: 金融合规政策分析专家
2. **清晰的任务描述**: 搜索、总结、返回 JSON
3. **详细的技能说明**: 列出 LLM 需要具备的能力
4. **严格的格式要求**: 多次强调 JSON 格式，提供完整示例
5. **具体的注意事项**: 说明如何处理找到/未找到的情况

## 验证结果

- ✅ LLM 稳定返回 JSON 格式
- ✅ 解析成功率 100%
- ✅ 正确处理找到/未找到的关键词
- ✅ 记录 sourceUrl 用于溯源

## 修改历史

### 2026-04-07 17:06
- 重新设计 system prompt，添加技能、限制和详细的输出格式要求
- 简化 user prompt，移除 JSON 格式说明（已在 system prompt 中）
- 添加 JSON 提取逻辑，处理 markdown 代码块和非 JSON 文本
- 移除 `response_format` 参数（Webull Claude API 不支持）
- 验证：LLM 成功返回 JSON 格式，解析成功率 100%

### 2026-04-07 11:23
- 简化了 system prompt，移除了冗余的 URL 和关键词信息
- 简化了 user prompt，只保留必要的目标网站和关键词
- 将 temperature 从 0.1 降低到 0，提高输出的确定性

### 之前版本
- System prompt 包含了详细的 JSON 格式要求
- User prompt 包含了完整的网页内容和格式说明
