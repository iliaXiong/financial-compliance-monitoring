# LLM智能网页搜索功能

## 概述

系统已升级为使用LLM进行智能网页搜索，而不是简单的关键词匹配。这大大提高了搜索的准确性和覆盖范围，特别是对于子页面和文档中的内容。

## 新的搜索流程

### 1. 网站分析阶段
- 使用 `WebsiteAnalyzer` 分析主页面
- 识别政策相关的子页面链接
- 识别文档链接（PDF、DOC、DOCX、XLS、XLSX）

### 2. 内容获取阶段
- 获取主页面内容
- 并行获取前5个子页面的内容
- 并行获取前5个文档的内容（通过Jina Reader API）

### 3. LLM智能搜索阶段
- 将所有内容（主页面 + 子页面 + 文档）发送给LLM
- LLM分析所有内容，智能提取关键词的定义和解释
- LLM返回结构化的搜索结果，包括：
  - 关键词是否找到
  - 关键词的完整定义和解释
  - 内容来源的具体URL（可能是子页面或文档）
  - 关键词出现的上下文

### 4. 结果处理阶段
- 解析LLM返回的JSON结果
- 将结果保存到数据库
- 如果LLM调用失败，自动降级到简单关键词匹配

## 优势

### 1. 更准确的搜索
- LLM能理解语义，不仅仅是字符串匹配
- 能识别同义词和相关概念
- 能提取完整的定义，而不仅仅是包含关键词的句子

### 2. 更广的覆盖范围
- 自动搜索子页面内容
- 自动搜索文档内容（PDF、Word、Excel等）
- 不会因为关键词在子页面或文档中而漏掉

### 3. 更好的结果质量
- 返回关键词的完整定义和解释
- 提供准确的来源URL（具体到子页面或文档）
- 提供有意义的上下文信息

### 4. 容错性强
- 单个子页面或文档失败不影响其他内容的处理
- LLM调用失败时自动降级到简单搜索
- 详细的错误日志便于调试

## 配置

### 环境变量

系统支持自定义LLM API配置：

```bash
# LLM API配置
LLM_API_KEY=your_api_key_here
LLM_API_URL=https://api.openai.com/v1/chat/completions
LLM_MODEL=gpt-4
LLM_API_KEY_HEADER=Authorization
LLM_AUTH_PREFIX=Bearer
```

### 兼容性

- 默认支持OpenAI API格式
- 可配置为使用其他兼容OpenAI格式的LLM服务
- 支持自定义认证头和前缀

## 示例

### 搜索请求
```json
{
  "websiteUrl": "https://www.nyse.com",
  "keywords": ["professional subscriber", "market data"]
}
```

### LLM搜索结果
```json
{
  "keywordResults": [
    {
      "keyword": "professional subscriber",
      "found": true,
      "content": "A professional subscriber is defined as any person who receives market data for use in their professional capacity...",
      "sourceUrl": "https://www.nyse.com/publicdocs/nyse/data/NYSE_Market_Data_Subscriber_Agreement.pdf",
      "context": "在NYSE市场数据订阅协议中，professional subscriber被定义为..."
    },
    {
      "keyword": "market data",
      "found": true,
      "content": "Market data includes real-time and delayed quotes, last sale information, and other trading information...",
      "sourceUrl": "https://www.nyse.com/market-data/overview",
      "context": "市场数据包括实时和延迟报价、最后成交信息..."
    }
  ]
}
```

## 性能考虑

### 限制
- 每个网站最多处理5个子页面
- 每个网站最多处理5个文档
- 主页面内容限制为5000字符
- 子页面和文档内容各限制为3000字符

### 超时设置
- 页面获取超时：30秒
- 文档读取超时：60秒
- LLM调用超时：60秒
- 总体任务超时：2分钟（可配置）

### 并行处理
- 多个子页面并行获取
- 多个文档并行获取
- 多个网站并行处理

## 降级策略

如果LLM调用失败，系统会自动降级到简单关键词匹配：

1. 合并所有内容（主页面 + 子页面 + 文档）
2. 使用正则表达式搜索关键词
3. 提取关键词周围的上下文
4. 返回基本的搜索结果

这确保即使LLM服务不可用，系统仍能提供基本的搜索功能。

## 日志和调试

系统提供详细的日志输出：

```
[ContentRetriever] Processing website: https://www.nyse.com
[ContentRetriever] Found 15 page links and 3 document links
[ContentRetriever] Fetching 5 sub-pages
[ContentRetriever] Fetching 3 documents
[ContentRetriever] Using LLM to search for keywords in https://www.nyse.com
[ContentRetriever] LLM search completed: found 2/2 keywords
```

## 未来改进

1. 支持更多文档格式
2. 智能选择最相关的子页面（而不是简单取前5个）
3. 缓存LLM搜索结果以提高性能
4. 支持增量更新（只重新搜索变化的页面）
5. 支持自定义搜索深度和广度
