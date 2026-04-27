# 关键词未找到问题深度分析

## 执行记录
- **原始执行 ID**: `682fea2d-b1f7-4175-b4e2-175214879804`
- **任务 ID**: `326eacc8-021a-4cf1-a52d-182c6a18be87`
- **关键词配置**: `["professional，unprofessional"]` （错误格式，包含中文逗号）

## 问题总结

所有关键词都未找到的原因有**两个层面**：

### 1. 关键词格式错误（主要问题）

**问题描述**：
任务配置的关键词是一个包含中文逗号的单一字符串：
```json
{
  "keywords": ["professional，unprofessional"]
}
```

**影响**：
- 系统将 `"professional，unprofessional"` 作为**一个完整的关键词**进行搜索
- LLM 在页面中搜索这个完整字符串（包括中文逗号）
- 由于网页内容中不太可能出现这种格式的文本，所以找不到匹配

**正确格式**：
```json
{
  "keywords": ["professional", "unprofessional"]
}
```

### 2. 页面内容可能不包含这些词（次要问题）

**测试验证**：
即使使用正确的关键词格式（`["professional", "subscriber"]`），LLM 仍然返回 `found: false`。

**LLM 响应示例**：
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

**可能原因**：

#### a) 页面内容提取不完整
- **CSS 解析错误**：JSDOM 无法解析 NYSE 网站的某些现代 CSS
  ```
  Error: Could not parse CSS stylesheet
      at exports.createStylesheet (/app/node_modules/jsdom/lib/jsdom/living/helpers/stylesheets.js:37:21)
  ```
- **JavaScript 渲染内容**：NYSE 网站可能使用 JavaScript 动态加载内容
- **JSDOM 限制**：JSDOM 不执行 JavaScript，只能获取静态 HTML

#### b) 关键词确实不在主页上
- NYSE 和 OPRA 的主页可能不包含 "professional subscriber" 这样的术语
- 这些术语可能在子页面、文档或需要登录的页面中

#### c) LLM 搜索策略问题
- LLM 可能对关键词匹配过于严格
- 可能需要更灵活的搜索策略（如模糊匹配、同义词）

## 详细技术分析

### ContentRetriever 工作流程

1. **获取页面内容**
   ```typescript
   const mainPageContent = await this.fetchPageContent(websiteUrl);
   ```
   - 使用 axios 获取 HTML
   - 使用 JSDOM 解析 HTML
   - 提取文本内容（前 5000 字符）

2. **构建 LLM 提示**
   ```typescript
   const prompt = this.buildLLMSearchPrompt(
     websiteUrl,
     keywords,
     mainPageContent,
     subPageContents,
     documentContents
   );
   ```
   - 包含网站 URL
   - 包含关键词列表
   - 包含主页面内容（前 5000 字符）
   - 包含子页面和文档内容（如果有）

3. **调用 LLM 搜索**
   ```typescript
   const llmResponse = await this.callLLM(prompt);
   ```
   - 使用 Webull 内部 LLM API（Claude Sonnet 4）
   - 温度设置为 0.1（较低，更确定性）
   - 最大 token 数：3000

4. **解析 LLM 响应**
   ```typescript
   const searchResult = this.parseLLMSearchResponse(
     llmResponse,
     keywords,
     subPageContents,
     documentContents
   );
   ```
   - 期望 JSON 格式响应
   - 提取每个关键词的 found 状态
   - 提取内容、上下文和来源 URL

### LLM 提示词分析

**提示词结构**：
```
你是一个专业的网页内容检索助手。请在以下网站内容中搜索指定的关键词，并提取相关信息。

目标网站: https://www.nyse.com/index
搜索关键词: professional，unprofessional  <-- 问题：这是一个字符串

## 主页面内容:
[前 5000 字符的页面文本]

CRITICAL: You MUST respond with ONLY valid JSON...
```

**问题**：
- 关键词列表使用 `keywords.join(', ')` 连接
- 对于错误格式的关键词，会变成：`professional，unprofessional`（包含中文逗号）
- LLM 可能将其理解为一个关键词或两个关键词，但搜索时会寻找完整字符串

### WebsiteAnalyzer 状态

**当前配置**：
```
ENABLE_WEBSITE_ANALYZER: false
```

**影响**：
- 只处理主页面，不爬取子页面
- 不下载和分析文档（PDF、DOC 等）
- 可能错过包含关键词的子页面和文档

**日志证据**：
```
[ContentRetriever] WebsiteAnalyzer is disabled, processing main page only
```

## 验证测试

### 测试 1：错误格式关键词
```bash
# 关键词：["professional，unprofessional"]
# 结果：found 0/1 keywords
```

### 测试 2：正确格式关键词
```bash
# 关键词：["professional", "subscriber"]
# 结果：found 0/2 keywords
```

### 测试 3：LLM API 连通性
```bash
# 直接调用 LLM API
# 结果：✅ 正常工作，返回 JSON 响应
```

## 根本原因总结

1. **关键词格式错误**（确定）
   - 使用了中文逗号分隔的单一字符串
   - 系统将其作为一个完整关键词搜索

2. **页面内容不包含关键词**（可能）
   - LLM 在页面内容中确实没有找到这些词
   - 可能是因为：
     - 词汇不在主页上
     - JSDOM 无法提取完整内容
     - 需要 JavaScript 渲染的内容

3. **WebsiteAnalyzer 未启用**（限制）
   - 只搜索主页，不搜索子页面和文档
   - 可能错过相关内容

## 解决方案

### 立即修复：关键词格式

**方案 1：前端验证**
在 `frontend/src/components/task/TaskForm.tsx` 中添加验证：

```typescript
// 检测中文逗号
const validateKeywords = (keywords: string[]) => {
  for (const keyword of keywords) {
    if (keyword.includes('，')) {
      return '请使用英文逗号分隔关键词，不要使用中文逗号';
    }
  }
  return null;
};
```

**方案 2：后端预处理**
在 `backend/src/routes/tasks.ts` 中添加关键词标准化：

```typescript
// 标准化关键词：分割中文逗号，去除空格
function normalizeKeywords(keywords: string[]): string[] {
  return keywords
    .flatMap(keyword => keyword.split(/[,，]/))
    .map(k => k.trim())
    .filter(k => k.length > 0);
}

// 在创建任务时应用
const normalizedKeywords = normalizeKeywords(taskData.keywords);
```

### 中期改进：增强内容提取

**方案 1：启用 WebsiteAnalyzer**
```bash
# 在 docker-compose.yml 中设置
ENABLE_WEBSITE_ANALYZER: "true"
```

**优点**：
- 爬取子页面和文档
- 更全面的内容覆盖

**缺点**：
- 执行时间更长
- 需要更多资源

**方案 2：使用无头浏览器**
替换 JSDOM 为 Puppeteer 或 Playwright：

```typescript
// 使用 Puppeteer 获取渲染后的内容
const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.goto(url, { waitUntil: 'networkidle0' });
const content = await page.content();
await browser.close();
```

**优点**：
- 执行 JavaScript，获取动态内容
- 更准确的页面内容

**缺点**：
- 资源消耗更大
- 执行时间更长

### 长期优化：改进 LLM 搜索

**方案 1：多阶段搜索**
1. 精确匹配
2. 模糊匹配
3. 同义词匹配

**方案 2：增强提示词**
```
请使用以下策略搜索关键词：
1. 精确匹配关键词
2. 匹配关键词的变体（复数、时态等）
3. 匹配相关术语和同义词
4. 如果找不到，说明可能的原因
```

**方案 3：添加回退机制**
如果 LLM 搜索失败或未找到，使用简单的文本搜索作为回退：

```typescript
// 已实现但可能需要改进
private fallbackKeywordSearch(
  keywords: string[],
  mainPageContent: string,
  ...
): { keywordMatches: KeywordMatch[]; documentResults: DocumentRetrievalResult[] }
```

## 测试建议

### 1. 使用正确格式重新测试

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "NYSE专业订阅者测试",
    "keywords": ["professional subscriber", "non-professional subscriber"],
    "targetWebsites": ["https://www.nyse.com/index"],
    "schedule": {"type": "once"}
  }'
```

### 2. 测试已知包含关键词的页面

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "测试-已知页面",
    "keywords": ["market data", "trading"],
    "targetWebsites": ["https://www.nyse.com/index"],
    "schedule": {"type": "once"}
  }'
```

### 3. 启用 WebsiteAnalyzer 测试

```bash
# 修改 docker-compose.yml
ENABLE_WEBSITE_ANALYZER: "true"

# 重启服务
docker-compose up -d backend

# 执行测试任务
```

## 相关文件

- `backend/src/services/ContentRetriever.ts` - 内容检索服务
- `backend/src/services/WebsiteAnalyzer.ts` - 网站分析器
- `backend/src/routes/tasks.ts` - 任务管理路由
- `frontend/src/components/task/TaskForm.tsx` - 任务创建表单
- `docker-compose.yml` - 服务配置

## 结论

**主要问题**：关键词格式错误（使用中文逗号）导致系统搜索错误的字符串。

**次要问题**：即使格式正确，页面内容可能不包含这些关键词，原因包括：
- JSDOM 无法提取完整内容（CSS 解析错误）
- 关键词可能在子页面或文档中
- WebsiteAnalyzer 未启用

**建议优先级**：
1. 🔴 **高优先级**：修复关键词格式问题（前端验证 + 后端标准化）
2. 🟡 **中优先级**：启用 WebsiteAnalyzer 或使用无头浏览器
3. 🟢 **低优先级**：优化 LLM 搜索策略和提示词
