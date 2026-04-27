# 执行结果差异分析报告

## 概述

分析任务 `52868cf2-5d1c-4b8e-a4b7-64dff7156edf` (opera) 的两次执行结果差异：
- **成功执行**: `8b52d571-68fd-46ba-9d61-f36e98d98e16` (2026-03-24)
- **失败执行**: `7f0306a3-41c2-4910-a4cd-2555d5abe647` (2026-04-07)

## 执行对比

### 基本信息

| 项目 | 成功执行 (8b52d571) | 失败执行 (7f0306a3) |
|------|-------------------|-------------------|
| 执行时间 | 2026-03-24 03:26:42 | 2026-04-07 03:45:04 |
| 执行时长 | 41秒 | 16秒 |
| 状态 | completed | completed |
| 目标网站 | https://www.opraplan.com/ | https://www.opraplan.com/ |
| 关键词 | professional，non-professional | professional，non-professional |

### 检索结果对比

#### 成功执行 (8b52d571) - 找到关键词
```
professional: found=true, source_url=https://www.opraplan.com/
professional: found=true, source_url=https://www.opraplan.com/ (重复)
non-professional: found=true, source_url=https://www.opraplan.com/
non-professional: found=true, source_url=https://www.opraplan.com/ (重复)
```
**结果**: 4条记录（存在重复），两个关键词都找到

#### 失败执行 (7f0306a3) - 未找到关键词
```
professional: found=false, source_url=https://www.opraplan.com/
non-professional: found=false, source_url=https://www.opraplan.com/
```
**结果**: 2条记录，两个关键词都未找到

## 根本原因分析

### 1. 关键词配置问题（主要原因）

任务配置中的关键词格式存在问题：
```
keywords: {professional，non-professional}
```

**问题**: 使用了中文逗号（，）而不是英文逗号（,）

这导致系统可能将其解析为：
- 正确情况：两个独立关键词 `["professional", "non-professional"]`
- 错误情况：一个包含中文逗号的关键词 `["professional，non-professional"]`

### 2. LLM 行为不一致性

两次执行使用相同的：
- LLM API (Webull 内部 Claude Sonnet 4)
- 目标网站 (https://www.opraplan.com/)
- 关键词配置

但产生了不同的结果，可能原因：

#### a) LLM 响应的随机性
- 即使 temperature=0.1（低随机性），LLM 仍可能产生不同结果
- 网页内容的解析和理解可能因上下文而异
- 关键词匹配的判断标准可能不一致

#### b) 网站内容变化
- 时间跨度：14天（2026-03-24 到 2026-04-07）
- 网站可能更新了内容、结构或关键词位置
- 某些页面可能临时不可访问

#### c) 系统状态差异
- 网络延迟或超时可能影响内容获取
- JSDOM 解析可能因页面结构变化而产生不同结果
- 第一次执行时间更长（41秒 vs 16秒），可能获取了更多内容

### 3. 重复结果问题

成功执行产生了4条记录而不是2条，每个关键词都有重复：
- `professional` 出现2次
- `non-professional` 出现2次

**可能原因**:
1. LLM 在响应中返回了重复的关键词结果
2. 系统在处理 LLM 响应时没有去重
3. 可能是因为关键词在多个位置被找到，但 source_url 相同

## 技术细节

### ContentRetriever 工作流程

1. **获取主页内容**: 使用 axios 获取 HTML
2. **提取文本**: 使用 JSDOM 解析 HTML 并提取文本
3. **构建 LLM 提示**: 将网页内容和关键词发送给 LLM
4. **LLM 搜索**: Claude Sonnet 4 分析内容并查找关键词
5. **解析响应**: 解析 LLM 返回的 JSON 结果
6. **存储结果**: 保存到 retrieval_results 表

### LLM 配置
```
API: https://office.webullbroker.com/api/oa-ai/open/chat/completions
Model: us.anthropic.claude-sonnet-4-20250514-v1:0
Temperature: 0.1
Max Tokens: 3000
```

### WebsiteAnalyzer 状态
```
ENABLE_WEBSITE_ANALYZER=false
```
仅搜索主页，不分析子页面和文档

## 问题影响

### 1. 结果不可靠性
- 相同任务在不同时间执行可能产生不同结果
- 用户无法信任检索结果的一致性
- 难以判断是真的未找到还是系统问题

### 2. 重复数据
- 成功执行产生了重复记录
- 影响数据统计和分析准确性
- 浪费存储空间

### 3. 关键词配置错误
- 中文逗号可能导致解析错误
- 用户界面应该验证输入格式
- 需要数据清洗和修复

## 建议解决方案

### 短期方案

1. **修复关键词格式**
```sql
UPDATE tasks 
SET keywords = ARRAY['professional', 'non-professional']
WHERE id = '52868cf2-5d1c-4b8e-a4b7-64dff7156edf';
```

2. **添加结果去重逻辑**
在 `ContentRetriever.parseLLMSearchResponse()` 中添加去重：
```typescript
// 使用 Map 去重，以 keyword 为键
const keywordMap = new Map<string, KeywordMatch>();
for (const result of parsed.keywordResults || []) {
  if (!keywordMap.has(result.keyword)) {
    keywordMap.set(result.keyword, {
      keyword: result.keyword,
      found: result.found || false,
      // ...
    });
  }
}
const keywordMatches = Array.from(keywordMap.values());
```

3. **添加输入验证**
在前端和后端添加关键词格式验证：
```typescript
// 检测中文标点符号
const chinesePunctuation = /[，、；：""''（）【】《》]/;
if (chinesePunctuation.test(keywordsInput)) {
  throw new Error('关键词不能包含中文标点符号，请使用英文逗号分隔');
}
```

### 中期方案

1. **增强 LLM 提示词**
- 明确要求 LLM 对每个关键词只返回一次结果
- 添加示例输出格式
- 要求 LLM 解释为什么找到或未找到关键词

2. **添加结果验证**
- 在存储前验证 LLM 响应的合理性
- 检查是否有重复关键词
- 验证 source_url 的有效性

3. **实现重试机制**
- 如果 LLM 返回空结果，自动重试一次
- 记录每次尝试的结果用于调试
- 设置最大重试次数避免无限循环

### 长期方案

1. **实现多模型验证**
- 使用多个 LLM 模型进行交叉验证
- 比较不同模型的结果
- 只有多数模型一致时才认为结果可靠

2. **添加内容快照**
- 保存每次执行时的网页内容快照
- 允许用户查看历史内容
- 便于分析结果差异的原因

3. **实现智能对比**
- 自动对比同一任务的历史执行结果
- 当结果差异较大时发出警告
- 提供差异分析报告

4. **优化 WebsiteAnalyzer**
- 启用 WebsiteAnalyzer 以搜索子页面
- 增加文档搜索能力
- 提高关键词发现率

## 数据修复建议

### 1. 清理重复数据
```sql
-- 查找重复记录
SELECT execution_id, keyword, COUNT(*) as count
FROM retrieval_results
WHERE execution_id = '8b52d571-68fd-46ba-9d61-f36e98d98e16'
GROUP BY execution_id, keyword
HAVING COUNT(*) > 1;

-- 保留每个关键词的第一条记录，删除重复
DELETE FROM retrieval_results
WHERE id NOT IN (
  SELECT MIN(id)
  FROM retrieval_results
  WHERE execution_id = '8b52d571-68fd-46ba-9d61-f36e98d98e16'
  GROUP BY execution_id, keyword
);
```

### 2. 修复关键词格式
```sql
-- 查找所有使用中文标点的任务
SELECT id, name, keywords
FROM tasks
WHERE array_to_string(keywords, ',') ~ '[，、；：]';

-- 手动修复或批量替换
UPDATE tasks
SET keywords = ARRAY(
  SELECT TRIM(regexp_replace(unnest(keywords), '[，、；：]', ',', 'g'))
)
WHERE array_to_string(keywords, ',') ~ '[，、；：]';
```

## 监控建议

1. **添加执行结果对比监控**
- 自动对比同一任务的连续执行结果
- 当关键词发现率变化超过阈值时告警

2. **LLM 响应质量监控**
- 记录 LLM 响应时间
- 监控解析失败率
- 跟踪重复结果出现频率

3. **关键词配置审计**
- 定期检查关键词格式
- 识别可能的配置错误
- 提供修复建议

## 结论

两次执行结果差异的主要原因是：

1. **关键词配置错误**（使用中文逗号）- 需要立即修复
2. **LLM 行为不一致性** - 这是 LLM 的固有特性，需要通过验证和重试机制缓解
3. **缺少结果去重** - 导致重复数据，需要添加去重逻辑
4. **网站内容可能变化** - 14天时间跨度内网站可能更新

建议优先实施短期方案，特别是：
- 修复关键词格式
- 添加结果去重
- 添加输入验证

这将显著提高系统的可靠性和数据质量。
