# WebsiteAnalyzer可视化工作指南

## 🎯 核心功能

WebsiteAnalyzer = 网站链接提取器 + 文档识别器 + 政策页面过滤器

## 📊 完整工作流程图

```
输入: https://www.nyse.com
    ↓
┌─────────────────────────────────────────┐
│ 步骤1: 获取HTML内容                      │
│                                         │
│ axios.get(url, {                        │
│   timeout: 30秒,                        │
│   User-Agent: FinancialComplianceBot,   │
│   maxRedirects: 5                       │
│ })                                      │
│                                         │
│ 重试机制: 最多3次，指数退避              │
│ 1秒 → 2秒 → 4秒                         │
└─────────────────────────────────────────┘
    ↓
    HTML字符串（几百KB）
    ↓
┌─────────────────────────────────────────┐
│ 步骤2: 解析HTML为DOM                     │
│                                         │
│ const dom = new JSDOM(html);            │
│ const document = dom.window.document;   │
│                                         │
│ 现在可以使用浏览器API:                   │
│ - querySelector()                       │
│ - querySelectorAll()                    │
│ - getAttribute()                        │
└─────────────────────────────────────────┘
    ↓
    DOM对象
    ↓
┌─────────────────────────────────────────┐
│ 步骤3: 提取所有链接                      │
│                                         │
│ const anchors =                         │
│   document.querySelectorAll('a[href]'); │
│                                         │
│ 找到所有<a>标签                          │
└─────────────────────────────────────────┘
    ↓
    链接数组
    ↓
┌─────────────────────────────────────────┐
│ 步骤4: 遍历并分类每个链接                 │
│                                         │
│ for each <a> tag:                       │
│   1. 获取href属性                        │
│   2. 转换为绝对URL                       │
│   3. 判断类型                            │
│      ├─ 文档? → documentLinks           │
│      ├─ 政策相关? → pageLinks           │
│      └─ 其他 → 忽略                     │
└─────────────────────────────────────────┘
    ↓
┌──────────────┬──────────────────────────┐
│ documentLinks│      pageLinks           │
│ (文档链接)   │   (政策相关页面)          │
│              │                          │
│ • PDF文档    │ • 包含"regulation"的URL  │
│ • Word文档   │ • 包含"policy"的URL      │
│ • Excel文档  │ • 包含"compliance"的URL  │
└──────────────┴──────────────────────────┘
    ↓
返回分析结果
```

## 🔍 链接分类详解

### 文档识别流程

```
链接: "https://www.nyse.com/docs/calendar.pdf"
    ↓
url.toLowerCase()
    ↓
"https://www.nyse.com/docs/calendar.pdf"
    ↓
检查扩展名:
  ✓ .pdf?  → YES
    ↓
返回: { type: 'pdf', url: '...', text: '...' }
```

**支持的文档类型**：
```
.pdf   → PDF文档
.doc   → Word文档（旧版）
.docx  → Word文档（新版）
.xls   → Excel文档（旧版）
.xlsx  → Excel文档（新版）
```

### 政策页面识别流程

```
链接: <a href="/regulation">NYSE Regulation</a>
    ↓
提取信息:
  URL: "https://www.nyse.com/regulation"
  文本: "NYSE Regulation"
    ↓
检查关键词:
  URL包含"regulation"? → YES
    ↓
返回: true（添加到pageLinks）
```

**政策关键词列表**：
```
英文:
• policy, policies
• regulation
• compliance
• guideline
• rule
• law
• legal

中文:
• 政策
• 法规
• 合规
• 监管
• 规定
• 指南
```

## 💡 实际案例分析

### 案例：分析NYSE网站

#### 输入
```
URL: https://www.nyse.com
```

#### HTML片段
```html
<nav>
  <a href="/market-data">Market Data</a>
  <a href="/regulation/nyse">Regulation</a>
  <a href="/publicdocs/nyse/calendar.pdf">Trading Calendar</a>
  <a href="/about">About Us</a>
  <a href="/policies">Policies</a>
</nav>
```

#### 处理过程

**链接1**: Market Data
```
href: "/market-data"
↓ 转换为绝对URL
"https://www.nyse.com/market-data"
↓ 检查文档类型
null（不是文档）
↓ 检查政策关键词
false（不包含关键词）
↓ 结果
❌ 忽略
```

**链接2**: Regulation
```
href: "/regulation/nyse"
↓ 转换为绝对URL
"https://www.nyse.com/regulation/nyse"
↓ 检查文档类型
null（不是文档）
↓ 检查政策关键词
true（URL包含"regulation"）
↓ 结果
✅ 添加到pageLinks
```

**链接3**: Trading Calendar PDF
```
href: "/publicdocs/nyse/calendar.pdf"
↓ 转换为绝对URL
"https://www.nyse.com/publicdocs/nyse/calendar.pdf"
↓ 检查文档类型
'pdf'（是PDF文档）
↓ 结果
✅ 添加到documentLinks
```

**链接4**: About Us
```
href: "/about"
↓ 转换为绝对URL
"https://www.nyse.com/about"
↓ 检查文档类型
null（不是文档）
↓ 检查政策关键词
false（不包含关键词）
↓ 结果
❌ 忽略
```

**链接5**: Policies
```
href: "/policies"
↓ 转换为绝对URL
"https://www.nyse.com/policies"
↓ 检查文档类型
null（不是文档）
↓ 检查政策关键词
true（URL包含"policies"）
↓ 结果
✅ 添加到pageLinks
```

#### 最终输出

```javascript
{
  websiteUrl: "https://www.nyse.com",
  
  pageLinks: [
    "https://www.nyse.com/regulation/nyse",
    "https://www.nyse.com/policies"
  ],
  
  documentLinks: [
    {
      url: "https://www.nyse.com/publicdocs/nyse/calendar.pdf",
      type: "pdf",
      text: "Trading Calendar"
    }
  ],
  
  analyzedAt: "2026-03-23T02:35:53.047Z"
}
```

## 🛠️ 技术实现细节

### URL转换示例

```javascript
// 相对路径
new URL("/market-data", "https://www.nyse.com")
→ "https://www.nyse.com/market-data"

// 相对路径（带../）
new URL("../docs/file.pdf", "https://www.nyse.com/page/")
→ "https://www.nyse.com/docs/file.pdf"

// 绝对路径
new URL("https://other.com/page", "https://www.nyse.com")
→ "https://other.com/page"

// 带查询参数
new URL("/doc.pdf?version=2", "https://www.nyse.com")
→ "https://www.nyse.com/doc.pdf?version=2"
```

### 错误处理

```
尝试1: 发送请求
  ↓
失败（网络错误）
  ↓
等待1秒
  ↓
尝试2: 发送请求
  ↓
失败（超时）
  ↓
等待2秒
  ↓
尝试3: 发送请求
  ↓
成功 ✓
```

**不重试的情况**：
- 404 Not Found
- 403 Forbidden
- 401 Unauthorized
- 其他4xx错误

## ⚡ 性能特点

```
速度: 快速
  • 单次HTTP请求
  • 单次DOM解析
  • 内存中处理

可靠性: 高
  • 自动重试机制
  • 指数退避
  • 错误容错

资源消耗: 低
  • 不执行JavaScript
  • 不加载图片/CSS
  • 只解析HTML结构
```

## ⚠️ 限制

```
❌ 无法处理:
  • JavaScript动态加载的内容
  • 需要登录的页面
  • AJAX加载的链接
  • iframe中的内容
  • 需要用户交互的内容

✅ 可以处理:
  • 静态HTML中的链接
  • 服务器端渲染的内容
  • 公开访问的页面
```

## 📈 使用统计（本次执行）

```
网站: https://www.nyse.com
执行时间: ~1秒
找到的链接总数: 未知（未记录）
文档链接: 1个（PDF）
政策页面链接: 未知（未存储）
```

## 🎓 总结

WebsiteAnalyzer是一个：
- ✅ 轻量级的网站分析工具
- ✅ 专注于链接提取和分类
- ✅ 可靠的错误处理机制
- ✅ 快速的单次解析
- ❌ 不支持JavaScript动态内容
- ❌ 不进行深度爬取
