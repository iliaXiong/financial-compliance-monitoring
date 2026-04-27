# WebsiteAnalyzer工作原理详解

## 概述

WebsiteAnalyzer是一个网站分析服务，它的主要任务是：
1. 获取网页HTML内容
2. 解析HTML结构
3. 提取所有链接
4. 识别文档链接（PDF、DOC等）
5. 识别政策相关页面链接

## 完整工作流程

### 第1步：获取HTML内容

```typescript
async analyze(websiteUrl: string) {
  // 使用axios获取HTML，带重试机制
  const html = await this.fetchWithRetry(websiteUrl);
}
```

**详细过程**：

```typescript
private async fetchWithRetry(url: string): Promise<string> {
  // 配置
  const maxRetries = 3;              // 最多重试3次
  const timeout = 30000;             // 30秒超时
  const initialRetryDelay = 1000;    // 初始延迟1秒
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; FinancialComplianceBot/1.0)'
        },
        maxRedirects: 5  // 最多跟随5次重定向
      });
      
      return response.data;  // 返回HTML字符串
      
    } catch (error) {
      // 4xx错误不重试（客户端错误）
      if (error.response?.status >= 400 && error.response?.status < 500) {
        throw error;
      }
      
      // 其他错误：指数退避重试
      if (attempt < maxRetries - 1) {
        const delay = 1000 * Math.pow(2, attempt);  // 1s, 2s, 4s
        await sleep(delay);
      }
    }
  }
}
```

**实际例子（NYSE）**：
```
请求: GET https://www.nyse.com
User-Agent: Mozilla/5.0 (compatible; FinancialComplianceBot/1.0)
超时: 30秒
↓
响应: HTML内容（约几百KB）
```

### 第2步：解析HTML并提取链接

```typescript
const { pageLinks, documentLinks } = this.extractLinks(html, baseUrl);
```

**详细过程**：

```typescript
private extractLinks(html: string, baseUrl: string) {
  // 1. 使用JSDOM解析HTML
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  // 2. 初始化结果集合
  const pageLinks: Set<string> = new Set();
  const documentLinks: DocumentLink[] = [];
  
  // 3. 获取所有<a>标签
  const anchors = document.querySelectorAll('a[href]');
  
  // 4. 遍历每个链接
  anchors.forEach((anchor) => {
    const href = anchor.getAttribute('href');
    const linkText = anchor.textContent?.trim() || '';
    
    // 5. 转换为绝对URL
    const absoluteUrl = new URL(href, baseUrl).href;
    
    // 6. 判断链接类型
    const docType = this.getDocumentType(absoluteUrl);
    
    if (docType) {
      // 是文档链接
      documentLinks.push({
        url: absoluteUrl,
        type: docType,
        text: linkText
      });
    } else if (this.isPolicyRelatedLink(absoluteUrl, linkText)) {
      // 是政策相关页面链接
      pageLinks.add(absoluteUrl);
    }
  });
  
  return {
    pageLinks: Array.from(pageLinks),
    documentLinks
  };
}
```

### 第3步：识别文档类型

```typescript
private getDocumentType(url: string): DocumentType | null {
  const urlLower = url.toLowerCase();
  
  // 检查文件扩展名
  if (urlLower.endsWith('.pdf') || urlLower.includes('.pdf?')) {
    return 'pdf';
  }
  if (urlLower.endsWith('.doc') || urlLower.includes('.doc?')) {
    return 'doc';
  }
  if (urlLower.endsWith('.docx') || urlLower.includes('.docx?')) {
    return 'docx';
  }
  if (urlLower.endsWith('.xls') || urlLower.includes('.xls?')) {
    return 'xls';
  }
  if (urlLower.endsWith('.xlsx') || urlLower.includes('.xlsx?')) {
    return 'xlsx';
  }
  
  return null;  // 不是文档
}
```

**实际例子**：
```
输入: "https://www.nyse.com/publicdocs/nyse/ICE_NYSE_2026_Yearly_Trading_Calendar.pdf"
↓
检查: url.toLowerCase().endsWith('.pdf')
↓
结果: 'pdf'
```

### 第4步：识别政策相关链接

```typescript
private isPolicyRelatedLink(url: string, linkText: string): boolean {
  // 政策关键词列表
  const policyKeywords = [
    'policy', 'policies',      // 政策
    'regulation',              // 法规
    'compliance',              // 合规
    'guideline',               // 指南
    'rule',                    // 规则
    'law',                     // 法律
    'legal',                   // 法律的
    '政策', '法规',            // 中文
    '合规', '监管',
    '规定', '指南'
  ];
  
  const urlLower = url.toLowerCase();
  const textLower = linkText.toLowerCase();
  
  // 检查URL或链接文本是否包含任何关键词
  return policyKeywords.some(keyword => 
    urlLower.includes(keyword) || textLower.includes(keyword)
  );
}
```

**实际例子**：
```
链接1:
  URL: "https://www.nyse.com/regulation/nyse"
  文本: "NYSE Regulation"
  ↓
  检查: url包含"regulation"
  ↓
  结果: true（添加到pageLinks）

链接2:
  URL: "https://www.nyse.com/about"
  文本: "About Us"
  ↓
  检查: 不包含任何政策关键词
  ↓
  结果: false（忽略）
```

## 实际执行示例（NYSE网站）

### 输入
```
URL: https://www.nyse.com
```

### 处理过程

#### 1. 获取HTML
```html
<!DOCTYPE html>
<html>
<head>...</head>
<body>
  <nav>
    <a href="/market-data">Market Data</a>
    <a href="/regulation">Regulation</a>
    <a href="/publicdocs/nyse/ICE_NYSE_2026_Yearly_Trading_Calendar.pdf">
      2026 Trading Calendar
    </a>
    <a href="/about">About</a>
    <!-- 更多链接... -->
  </nav>
  <!-- 页面内容... -->
</body>
</html>
```

#### 2. 解析链接

JSDOM解析后：
```javascript
document.querySelectorAll('a[href]')
// 返回所有<a>标签的NodeList
```

#### 3. 处理每个链接

**链接1**: Market Data
```
href: "/market-data"
绝对URL: "https://www.nyse.com/market-data"
文档类型: null
政策相关: false
→ 忽略
```

**链接2**: Regulation
```
href: "/regulation"
绝对URL: "https://www.nyse.com/regulation"
文档类型: null
政策相关: true（URL包含"regulation"）
→ 添加到pageLinks
```

**链接3**: PDF文档
```
href: "/publicdocs/nyse/ICE_NYSE_2026_Yearly_Trading_Calendar.pdf"
绝对URL: "https://www.nyse.com/publicdocs/nyse/ICE_NYSE_2026_Yearly_Trading_Calendar.pdf"
文档类型: 'pdf'
→ 添加到documentLinks
```

**链接4**: About
```
href: "/about"
绝对URL: "https://www.nyse.com/about"
文档类型: null
政策相关: false
→ 忽略
```

### 输出结果

```typescript
{
  websiteUrl: "https://www.nyse.com",
  pageLinks: [
    "https://www.nyse.com/regulation",
    // 其他政策相关页面...
  ],
  documentLinks: [
    {
      url: "https://www.nyse.com/publicdocs/nyse/ICE_NYSE_2026_Yearly_Trading_Calendar.pdf",
      type: "pdf",
      text: "2026 Trading Calendar"
    }
    // 其他文档...
  ],
  analyzedAt: new Date()
}
```

## 关键技术点

### 1. JSDOM解析

```typescript
const dom = new JSDOM(html);
const document = dom.window.document;
```

**作用**：
- 将HTML字符串转换为DOM对象
- 可以像在浏览器中一样使用`querySelector`等API
- 不执行JavaScript（静态解析）

**限制**：
- 无法获取JavaScript动态加载的内容
- 无法处理需要用户交互的内容

### 2. URL解析

```typescript
const absoluteUrl = new URL(href, baseUrl).href;
```

**作用**：
- 将相对URL转换为绝对URL
- 处理各种URL格式

**例子**：
```javascript
new URL("/market-data", "https://www.nyse.com").href
// → "https://www.nyse.com/market-data"

new URL("../docs/file.pdf", "https://www.nyse.com/page/").href
// → "https://www.nyse.com/docs/file.pdf"

new URL("https://other.com/page", "https://www.nyse.com").href
// → "https://other.com/page"
```

### 3. 错误处理

```typescript
try {
  const absoluteUrl = new URL(href, baseUrl).href;
  // 处理链接...
} catch (error) {
  // 无效URL，跳过
  console.debug(`Skipping invalid URL: ${href}`);
}
```

**处理的错误**：
- 无效的URL格式
- 特殊协议（javascript:, mailto:等）
- 格式错误的相对路径

## 性能优化

### 1. Set去重

```typescript
const pageLinks: Set<string> = new Set();
```

自动去除重复的页面链接。

### 2. 单次DOM解析

只解析一次HTML，然后提取所有需要的信息。

### 3. 懒加载

只在需要时才解析HTML，不预先加载。

## 限制和注意事项

### 1. 静态内容only

❌ **无法处理**：
- JavaScript动态加载的内容
- AJAX请求加载的链接
- 需要登录才能看到的内容
- iframe中的内容

✅ **可以处理**：
- HTML中直接存在的`<a>`标签
- 服务器端渲染的内容
- 静态HTML页面

### 2. 文档类型识别

只基于文件扩展名：
```
.pdf  → PDF
.doc  → Word
.docx → Word
.xls  → Excel
.xlsx → Excel
```

不检查：
- MIME类型
- 文件实际内容
- Content-Type头

### 3. 政策关键词

固定的关键词列表，可能：
- 漏掉某些相关页面
- 误判某些不相关页面

## 改进建议

### 1. 支持JavaScript渲染

使用Puppeteer代替JSDOM：
```typescript
const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.goto(url);
const html = await page.content();
```

### 2. 智能链接分类

使用机器学习或LLM判断链接相关性：
```typescript
const isRelevant = await llm.classify(linkText, linkUrl);
```

### 3. 深度爬取

递归爬取相关页面：
```typescript
for (const pageLink of pageLinks) {
  const subResult = await this.analyze(pageLink);
  // 合并结果...
}
```

### 4. 缓存机制

避免重复分析同一网站：
```typescript
const cached = await cache.get(websiteUrl);
if (cached) return cached;
```

## 总结

WebsiteAnalyzer通过以下步骤分析网站：

1. **获取HTML** → 使用axios，带重试和超时
2. **解析DOM** → 使用JSDOM转换为DOM对象
3. **提取链接** → 遍历所有`<a>`标签
4. **分类链接** → 识别文档和政策相关页面
5. **返回结果** → 提供给ContentRetriever使用

它是一个**轻量级、快速、可靠**的网站分析工具，专注于提取文档链接和相关页面链接。
