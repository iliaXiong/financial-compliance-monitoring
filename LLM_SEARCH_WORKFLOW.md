# LLM 搜索网页逻辑详解

## 概述

系统使用 LLM（大语言模型）进行智能网页内容检索，能够理解上下文并提取关键词的完整定义和解释，而不仅仅是简单的文本匹配。

## 完整工作流程

### 1. 任务触发
```
TaskScheduler → SubagentOrchestrator → ContentRetriever
```

### 2. ContentRetriever 主流程

```typescript
async retrieveFromWebsite(websiteUrl: string, keywords: string[])
```

#### 步骤详解

**Step 1: 检查 WebsiteAnalyzer 状态**
```typescript
const enableWebsiteAnalyzer = process.env.ENABLE_WEBSITE_ANALYZER !== 'false';
```

- **启用时**：分析网站结构，获取子页面和文档链接
- **禁用时**（当前默认）：只处理主页面

**Step 2: 获取主页面内容**
```typescript
const mainPageContent = await this.fetchPageContent(websiteUrl);
```

- 使用 axios 发送 HTTP GET 请求
- 设置 User-Agent 模拟浏览器
- 支持最多 3 次重试（指数退避）
- 超时时间：30 秒

**Step 3: 获取子页面内容（可选）**
```typescript
const subPageContents = await this.fetchSubPages(pageLinks.slice(0, 5));
```

- 仅在 WebsiteAnalyzer 启用时执行
- 限制最多 5 个子页面
- 并行获取，单个失败不影响其他

**Step 4: 获取文档内容（可选）**
```typescript
const documentContents = await this.fetchDocuments(documentLinks.slice(0, 5));
```

- 仅在 WebsiteAnalyzer 启用时执行
- 使用 Jina Reader API 读取 PDF/DOC 等文档
- 限制最多 5 个文档
- 并行获取，单个失败不影响其他

**Step 5: LLM 智能搜索**
```typescript
const llmSearchResult = await this.llmWebSearch(
  websiteUrl,
  keywords,
  mainPageContent,
  subPageContents,
  documentContents,
  pageLinks,
  documentLinks
);
```

这是核心步骤，详见下文。

## LLM 搜索详细流程

### 1. 构建 LLM 提示词

```typescript
private buildLLMSearchPrompt(
  websiteUrl: string,
  keywords: string[],
  mainPageContent: string,
  subPageContents: Array<{ url: string; content: string }>,
  documentContents: Array<{ url: string; content: string }>
): string
```

#### 提示词结构

```
你是一个专业的网页内容检索助手。请在以下网站内容中搜索指定的关键词，并提取相关信息。

目标网站: https://example.com
搜索关键词: keyword1, keyword2, keyword3

## 主页面内容:
[前 5000 字符的页面文本]

## 子页面内容:
### 子页面 1 (https://example.com/page1):
[前 3000 字符的页面文本]

### 子页面 2 (https://example.com/page2):
[前 3000 字符的页面文本]

## 文档内容:
### 文档 1 (https://example.com/doc.pdf):
[前 3000 字符的文档文本]

CRITICAL: You MUST respond with ONLY valid JSON...

Return the search results in this EXACT JSON format:
{
  "keywordResults": [
    {
      "keyword": "keyword1",
      "found": true,
      "content": "Complete definition and explanation...",
      "sourceUrl": "https://example.com/page1",
      "context": "In this page, keyword1 is defined as..."
    }
  ]
}

Requirements:
- If keyword appears in multiple pages/documents, choose the most detailed one
- If keyword is not found, set found to false
- Extract complete definitions, not just sentences
- Response must be valid JSON only
```

#### 内容提取规则

| 内容类型 | 字符限制 | 处理方式 |
|---------|---------|---------|
| 主页面 | 5000 字符 | 提取纯文本，移除 script/style 标签 |
| 子页面 | 3000 字符/页 | 提取纯文本，最多 5 个页面 |
| 文档 | 3000 字符/文档 | 通过 Jina Reader 提取，最多 5 个文档 |

### 2. 调用 LLM API

```typescript
private async callLLM(prompt: string): Promise<string>
```

#### API 配置

**环境变量优先级**：
```
LLM_* 变量 > OPENAI_* 变量 > 默认值
```

**当前配置**（Webull 内部 LLM）：
```typescript
{
  llmApiUrl: 'https://office.webullbroker.com/api/oa-ai/open/chat/completions',
  llmApiKey: 'dcb0d1c8-82c7-478f-bd9a-7c3023cac4d8',
  llmModel: 'us.anthropic.claude-sonnet-4-20250514-v1:0',
  llmApiKeyHeader: 'authorization',
  llmAuthPrefix: 'Bearer'
}
```

#### 请求格式

```typescript
{
  model: 'us.anthropic.claude-sonnet-4-20250514-v1:0',
  messages: [
    {
      role: 'system',
      content: 'You are a professional web content retrieval assistant...'
    },
    {
      role: 'user',
      content: prompt  // 包含网站内容和搜索要求
    }
  ],
  temperature: 0.1,  // 低温度，更确定性的输出
  max_tokens: 3000   // 最大响应长度
}
```

#### 请求头

```typescript
{
  'Content-Type': 'application/json',
  'authorization': 'Bearer dcb0d1c8-82c7-478f-bd9a-7c3023cac4d8'
}
```

#### 超时设置

- **超时时间**：60 秒
- **失败处理**：抛出异常，触发回退机制

### 3. 解析 LLM 响应

```typescript
private parseLLMSearchResponse(
  llmResponse: string,
  keywords: string[],
  subPageContents: Array<{ url: string; content: string }>,
  documentContents: Array<{ url: string; content: string }>
): {
  keywordMatches: KeywordMatch[];
  documentResults: DocumentRetrievalResult[];
}
```

#### 期望的 LLM 响应格式

```json
{
  "keywordResults": [
    {
      "keyword": "professional subscriber",
      "found": true,
      "content": "A professional subscriber is defined as...",
      "sourceUrl": "https://www.nyse.com/market-data/pricing",
      "context": "In the context of market data fees..."
    },
    {
      "keyword": "non-professional subscriber",
      "found": false,
      "content": "",
      "sourceUrl": "",
      "context": ""
    }
  ]
}
```

#### 解析逻辑

1. **JSON 解析**
   ```typescript
   const parsed = JSON.parse(llmResponse);
   ```

2. **提取关键词匹配**
   ```typescript
   for (const result of parsed.keywordResults || []) {
     const keywordMatch: KeywordMatch = {
       keyword: result.keyword,
       found: result.found || false,
       occurrences: result.found ? 1 : 0,
       contexts: result.context ? [result.context] : [],
       sourceUrl: result.sourceUrl
     };
     keywordMatches.push(keywordMatch);
   }
   ```

3. **构建文档结果**
   - 识别哪些关键词来自文档
   - 按文档 URL 分组
   - 构建 DocumentRetrievalResult 数组

### 4. 错误处理和回退机制

```typescript
try {
  const llmResponse = await this.callLLM(prompt);
  const searchResult = this.parseLLMSearchResponse(...);
  return searchResult;
} catch (error) {
  console.error(`[ContentRetriever] LLM search failed:`, error);
  console.log(`[ContentRetriever] Falling back to simple keyword matching`);
  return this.fallbackKeywordSearch(...);
}
```

#### 回退机制：简单关键词匹配

```typescript
private fallbackKeywordSearch(
  keywords: string[],
  mainPageContent: string,
  subPageContents: Array<{ url: string; content: string }>,
  documentContents: Array<{ url: string; content: string }>
)
```

**工作原理**：
1. 合并所有内容（主页面 + 子页面 + 文档）
2. 使用正则表达式搜索关键词
3. 提取关键词周围的上下文（前后 150 字符）
4. 返回匹配结果

**触发条件**：
- LLM API 调用失败
- LLM 响应无法解析为 JSON
- 网络超时或连接错误

## 数据流图

```
┌─────────────────────────────────────────────────────────────┐
│                     TaskScheduler                           │
│                  (任务调度器)                                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                SubagentOrchestrator                         │
│              (并行执行协调器)                                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  ContentRetriever                           │
│                 (内容检索服务)                               │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ 获取主页面    │ │ 获取子页面    │ │ 获取文档      │
│ (axios)      │ │ (可选)        │ │ (Jina Reader)│
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                │
       └────────────────┼────────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │   提取文本内容 (JSDOM)         │
        │   - 移除 script/style 标签    │
        │   - 提取纯文本                │
        │   - 限制字符数                │
        └───────────────┬───────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │   构建 LLM 提示词              │
        │   - 网站 URL                  │
        │   - 关键词列表                │
        │   - 主页面内容 (5000 字符)    │
        │   - 子页面内容 (3000 字符/页) │
        │   - 文档内容 (3000 字符/文档) │
        │   - JSON 格式要求             │
        └───────────────┬───────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │   调用 LLM API                │
        │   - Webull 内部 Claude API    │
        │   - temperature: 0.1          │
        │   - max_tokens: 3000          │
        │   - timeout: 60s              │
        └───────────────┬───────────────┘
                        │
                ┌───────┴───────┐
                │               │
            成功 ▼           失败 ▼
    ┌──────────────────┐ ┌──────────────────┐
    │ 解析 JSON 响应    │ │ 回退到简单搜索    │
    │ - 提取关键词匹配  │ │ - 正则表达式匹配  │
    │ - 提取来源 URL    │ │ - 提取上下文      │
    │ - 提取上下文      │ │ - 返回基本结果    │
    └──────────┬───────┘ └──────────┬───────┘
               │                    │
               └────────┬───────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │   返回检索结果                 │
        │   - keywordMatches            │
        │   - documentResults           │
        │   - status: success/failed    │
        └───────────────────────────────┘
```

## 关键特性

### 1. 智能内容理解

LLM 能够：
- 理解关键词的语义和上下文
- 识别同义词和相关术语
- 提取完整的定义和解释
- 选择最权威和详细的来源

### 2. 多源内容整合

系统整合多个来源的内容：
- 主页面（必需）
- 子页面（可选，最多 5 个）
- 文档（可选，最多 5 个，支持 PDF/DOC）

### 3. 错误容忍

- 单个页面/文档失败不影响整体
- LLM 失败自动回退到简单搜索
- 支持重试机制（最多 3 次）

### 4. 性能优化

- 内容长度限制（避免超长提示词）
- 并行获取多个页面/文档
- 超时控制（30-60 秒）
- 指数退避重试策略

## 配置选项

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `ENABLE_WEBSITE_ANALYZER` | 是否启用网站分析器 | `false` |
| `LLM_API_URL` | LLM API 端点 | Webull 内部 API |
| `LLM_API_KEY` | LLM API 密钥 | 配置的密钥 |
| `LLM_MODEL` | LLM 模型名称 | Claude Sonnet 4 |
| `LLM_API_KEY_HEADER` | API 密钥请求头名称 | `authorization` |
| `LLM_AUTH_PREFIX` | 认证前缀 | `Bearer` |

### 代码配置

```typescript
private readonly maxRetries: number = 3;           // 最大重试次数
private readonly initialRetryDelay: number = 1000; // 初始重试延迟（毫秒）
private readonly timeout: number = 30000;          // HTTP 请求超时（毫秒）
```

## 日志输出

### 正常流程日志

```
[ContentRetriever] Processing website: https://www.nyse.com/index
[ContentRetriever] WebsiteAnalyzer is disabled, processing main page only
[ContentRetriever] Fetching page content from https://www.nyse.com/index (attempt 1/3)
[ContentRetriever] Using LLM to search for keywords in https://www.nyse.com/index
[ContentRetriever] LLM response (first 500 chars): {"keywordResults":[...]}
[ContentRetriever] LLM search completed: found 0/2 keywords
[ContentRetriever] Keyword matches: [{"keyword":"professional","found":false}]
```

### 错误和回退日志

```
[ContentRetriever] Error calling LLM API: Connection timeout
[ContentRetriever] LLM search failed: Failed to call LLM API: Connection timeout
[ContentRetriever] Falling back to simple keyword matching
```

## 优化建议

### 当前限制

1. **JSDOM 限制**
   - 无法执行 JavaScript
   - CSS 解析错误（非致命）
   - 无法处理动态加载的内容

2. **内容长度限制**
   - 主页面：5000 字符
   - 子页面：3000 字符/页
   - 文档：3000 字符/文档

3. **WebsiteAnalyzer 默认禁用**
   - 只搜索主页面
   - 不爬取子页面和文档

### 改进方案

1. **使用无头浏览器**
   ```typescript
   // 替换 JSDOM 为 Puppeteer
   const browser = await puppeteer.launch();
   const page = await browser.newPage();
   await page.goto(url, { waitUntil: 'networkidle0' });
   const content = await page.content();
   ```

2. **启用 WebsiteAnalyzer**
   ```bash
   # 在 docker-compose.yml 中设置
   ENABLE_WEBSITE_ANALYZER: "true"
   ```

3. **增加内容长度**
   ```typescript
   const mainText = this.extractTextContent(mainPageContent).substring(0, 10000);
   ```

4. **优化 LLM 提示词**
   - 添加更多上下文
   - 提供示例输出
   - 增强错误处理指令

## 相关文件

- `backend/src/services/ContentRetriever.ts` - 内容检索服务主文件
- `backend/src/services/WebsiteAnalyzer.ts` - 网站分析器
- `backend/src/services/SubagentOrchestrator.ts` - 并行执行协调器
- `backend/src/services/TaskScheduler.ts` - 任务调度器
- `backend/src/config/index.ts` - 配置管理
- `docker-compose.yml` - 环境变量配置
