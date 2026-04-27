# LLM 提示词更新总结

## 修改时间
2026-04-07

## 修改内容

### 1. 系统提示词 (System Prompt)

**修改前**:
```
You are a professional web content retrieval assistant. You MUST respond with valid JSON only, no additional text or explanations.
```

**修改后**:
```
你是一个金融合规政策分析专家。请在{websiteUrl}中搜索{keywords}相关内容，总结每个关键词的定义/解释/描述。并返回JSON格式。
```

**改进点**:
- 更明确的角色定位：金融合规政策分析专家
- 更具体的任务描述：总结定义/解释/描述
- 动态包含目标网站和关键词信息
- 使用中文，与用户提示词保持一致

### 2. 用户提示词 (User Prompt)

**修改前**:
```
你是一个专业的网页内容检索助手。请在以下网站内容中搜索指定的关键词，并提取相关信息。

目标网站: {websiteUrl}
搜索关键词: {keywords}

## 主页面内容:
{content}

CRITICAL: You MUST respond with ONLY valid JSON. Do not include any explanatory text before or after the JSON.

Return the search results in this EXACT JSON format:
{...}

Requirements:
- If keyword appears in multiple pages/documents, choose the most detailed and authoritative one
- If keyword is not found, set found to false, content and sourceUrl can be empty string
- Extract complete definitions and explanations, not just sentences containing the keyword
- Response must be valid JSON only, no additional text
```

**修改后**:
```
目标网站: {websiteUrl}
搜索关键词: {keywords}

## 主页面内容:
{content}

请返回JSON格式，包含每个关键词的定义/解释/描述：

{
  "keywordResults": [...]
}

要求:
- 如果关键词在多个页面/文档中出现，选择最详细和权威的一个
- 如果未找到关键词，设置 found 为 false，content 和 sourceUrl 可以为空字符串
- 提取完整的定义和解释，而不仅仅是包含关键词的句子
- 只返回有效的 JSON，不要包含任何额外的文本
```

**改进点**:
- 简化开头，去除重复的角色描述（已在系统提示词中说明）
- 更简洁的格式要求说明
- 全部使用中文，保持一致性
- 保留关键的 JSON 格式和要求说明

### 3. Temperature 参数

**修改前**: `temperature: 0.1`

**修改后**: `temperature: 0`

**改进点**:
- 完全确定性输出，消除随机性
- 相同输入应该产生相同输出
- 提高结果一致性

## 技术实现

### 修改文件
- `backend/src/services/ContentRetriever.ts`

### 修改方法
1. `buildLLMSearchPrompt()` - 更新用户提示词
2. `callLLM()` - 更新系统提示词和 temperature 参数

### 代码变更

```typescript
// callLLM() 方法中的关键变更

// 从 prompt 中提取 websiteUrl 和 keywords
const websiteUrlMatch = prompt.match(/目标网站: (.+)/);
const keywordsMatch = prompt.match(/搜索关键词: (.+)/);
const websiteUrl = websiteUrlMatch ? websiteUrlMatch[1].split('\n')[0].trim() : '';
const keywords = keywordsMatch ? keywordsMatch[1].split('\n')[0].trim() : '';

// 更新 API 调用
const response = await axios.post(this.llmApiUrl, {
  model: this.llmModel,
  messages: [
    {
      role: 'system',
      content: `你是一个金融合规政策分析专家。请在${websiteUrl}中搜索${keywords}相关内容，总结每个关键词的定义/解释/描述。并返回JSON格式。`
    },
    {
      role: 'user',
      content: prompt
    }
  ],
  temperature: 0,  // 从 0.1 改为 0
  max_tokens: 3000
});
```

## 预期效果

### 1. 提高一致性
- temperature=0 确保相同输入产生相同输出
- 减少 LLM 行为的随机性
- 提高检索结果的可靠性

### 2. 更明确的任务定位
- 系统提示词明确角色：金融合规政策分析专家
- 明确任务：总结定义/解释/描述
- 减少 LLM 对任务的误解

### 3. 更好的中文支持
- 全部使用中文提示词
- 与目标用户（中文用户）更匹配
- 可能提高中文内容的理解和提取质量

### 4. 简化提示词
- 去除冗余的角色描述
- 保留关键要求
- 提高 token 效率

## 测试建议

### 1. 重新执行失败的任务
```bash
# 重新执行之前失败的任务
curl -X POST http://localhost:3000/api/tasks/52868cf2-5d1c-4b8e-a4b7-64dff7156edf/execute \
  -H "Authorization: Bearer test-token"
```

### 2. 对比结果
- 对比新旧执行结果
- 验证关键词是否能稳定找到
- 检查是否还有重复记录

### 3. 多次执行验证
- 对同一任务执行多次（建议 3-5 次）
- 验证结果是否一致
- 记录任何差异

## 部署状态

- ✅ 代码已修改
- ✅ Docker 镜像已重新构建
- ✅ Backend 容器已重启
- ✅ 服务健康检查通过

## 回滚方案

如果新提示词效果不佳，可以回滚到旧版本：

```bash
# 1. 恢复代码
git checkout HEAD -- backend/src/services/ContentRetriever.ts

# 2. 重新构建和重启
docker-compose build backend
docker-compose restart backend
```

## 后续监控

建议监控以下指标：
1. 关键词发现率（found=true 的比例）
2. 执行结果一致性（相同任务多次执行的结果差异）
3. 重复记录出现频率
4. LLM API 调用成功率
5. 执行时间变化

## 相关文档

- `CURRENT_LLM_PROMPT.md` - 原始提示词分析
- `EXECUTION_COMPARISON_ANALYSIS.md` - 执行结果差异分析
- `LLM_SEARCH_WORKFLOW.md` - LLM 搜索工作流程
