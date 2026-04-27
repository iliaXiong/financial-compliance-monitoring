# 搜索任务执行流程详解

## 整体架构

```
用户点击"执行" → 前端 → 后端API → TaskScheduler → Bull队列 → 执行流程
```

## 详细执行流程

### 1. 用户触发执行

**前端操作**（`frontend/src/pages/Tasks.tsx`）：
```typescript
// 用户点击"立即执行"按钮
const handleExecute = async (taskId: string) => {
  await executeTask(taskId);  // 调用API
};
```

### 2. API请求

**前端API调用**（`frontend/src/services/api.ts`）：
```typescript
POST /api/tasks/:taskId/execute
```

**后端路由**（`backend/src/routes/tasks.ts`）：
```typescript
router.post('/:taskId/execute', async (req, res) => {
  const { taskId } = req.params;
  
  // 调用TaskManager执行任务
  const executionId = await taskManager.executeTask(taskId);
  
  res.json({ executionId });
});
```

### 3. TaskManager处理

**TaskManager**（`backend/src/services/TaskManager.ts`）：
```typescript
async executeTask(taskId: string): Promise<string> {
  // 1. 验证任务存在且状态为active
  const task = await this.taskRepository.findById(taskId);
  
  // 2. 调用TaskScheduler执行
  const executionId = await this.taskScheduler.executeTask(taskId);
  
  return executionId;
}
```

### 4. TaskScheduler调度

**TaskScheduler**（`backend/src/services/TaskScheduler.ts`）：

#### 4.1 创建执行记录
```typescript
async executeTask(taskId: string): Promise<string> {
  // 创建execution记录
  const execution = await this.executionRepository.create(taskId);
  
  // 添加到Bull队列（立即执行，高优先级）
  await this.taskQueue.add(
    { taskId, executionId: execution.id },
    { priority: 1 }
  );
  
  return execution.id;
}
```

#### 4.2 Bull队列处理
```typescript
this.taskQueue.process(async (job) => {
  // 执行完整的检索和分析流程
  await this.processExecution(executionId, taskId);
});
```

### 5. 执行流程（processExecution）

这是核心执行逻辑，分为6个步骤：

#### Step 1: 并行检索（SubagentOrchestrator）

```typescript
// 获取任务配置
const task = await this.taskRepository.findById(taskId);
// task.targetWebsites = ["https://www.nyse.com"]
// task.keywords = ["professional subscriber"]

// 并行检索所有网站
const orchestrationResult = await this.subagentOrchestrator.executeParallel(
  task.targetWebsites,  // 目标网站列表
  task.keywords,        // 关键词列表
  120000               // 2分钟超时
);
```

**SubagentOrchestrator工作原理**：
```typescript
// 为每个网站创建独立的检索任务
websites.map(websiteUrl => ({
  websiteUrl,
  keywords,
  promise: contentRetriever.retrieveFromWebsite(websiteUrl, keywords)
}));

// 并行执行所有任务
await Promise.allSettled(tasks);
```

#### Step 2: 内容检索（ContentRetriever）

对每个网站执行以下操作：

```typescript
async retrieveFromWebsite(websiteUrl, keywords) {
  // 2.1 分析网站结构
  const analysisResult = await websiteAnalyzer.analyze(websiteUrl);
  // 返回：页面链接、文档链接（PDF等）
  
  // 2.2 获取页面内容
  const pageContent = await fetchPageContent(websiteUrl);
  // 使用axios获取HTML内容
  
  // 2.3 搜索关键词
  const pageKeywordMatches = searchKeywords(pageContent, keywords);
  // 使用正则表达式搜索：new RegExp(keyword, 'gi')
  
  // 2.4 处理文档（如果有PDF等）
  const documentResults = await processDocuments(
    analysisResult.documentLinks,
    keywords
  );
  // 使用Jina Reader API读取文档内容
  
  return {
    websiteUrl,
    status: 'success',
    keywordMatches: pageKeywordMatches,
    documentResults
  };
}
```

**关键词搜索逻辑**：
```typescript
searchKeywords(content, keywords) {
  // 提取纯文本（如果是HTML）
  const textContent = extractTextContent(content);
  // 使用JSDOM解析HTML，获取body.textContent
  
  return keywords.map(keyword => {
    // 不区分大小写的正则匹配
    const regex = new RegExp(keyword, 'gi');
    const matches = textContent.match(regex);
    const occurrences = matches ? matches.length : 0;
    const found = occurrences > 0;
    
    // 提取上下文（前后150个字符）
    const contexts = found ? extractContext(textContent, keyword) : [];
    
    return {
      keyword,
      found,        // 是否找到
      occurrences,  // 出现次数
      contexts      // 上下文数组
    };
  });
}
```

#### Step 3: 保存检索结果

```typescript
// 保存每个网站的每个关键词的检索结果
for (const result of orchestrationResult.results) {
  // 保存页面检索结果
  for (const keywordMatch of result.keywordMatches) {
    await retrievalResultRepository.create({
      executionId,
      websiteUrl: result.websiteUrl,
      keyword: keywordMatch.keyword,
      found: keywordMatch.found,      // true/false
      content: keywordMatch.contexts.join('\n\n'),
      context: keywordMatch.contexts[0],
      sourceUrl: result.websiteUrl
    });
  }
  
  // 保存文档检索结果
  for (const docResult of result.documentResults) {
    for (const keywordMatch of docResult.keywordMatches) {
      await retrievalResultRepository.create({
        executionId,
        websiteUrl: result.websiteUrl,
        keyword: keywordMatch.keyword,
        found: keywordMatch.found,
        content: keywordMatch.contexts.join('\n\n'),
        documentUrl: docResult.documentUrl
      });
    }
  }
}
```

#### Step 4: 生成总结文档（AnalysisService）

```typescript
await analysisService.generateSummary(executionId, retrievalResults);
```

使用LLM（OpenAI或自定义API）生成总结：
- 输入：所有检索结果
- 输出：结构化的总结文档（JSON格式）
- 保存到：summary_documents表

#### Step 5: 对比分析

```typescript
await analysisService.compareResults(executionId, taskId);
```

如果不是第一次执行：
- 获取上一次执行的结果
- 使用LLM对比两次结果的差异
- 保存到：comparison_reports表

#### Step 6: 跨网站分析

```typescript
await analysisService.analyzeCrossSite(executionId, retrievalResults);
```

如果有多个网站：
- 使用LLM分析不同网站间的差异和共同点
- 保存到：cross_site_analyses表

#### Step 7: 标记完成

```typescript
await executionRepository.markCompleted(executionId);
```

更新execution记录：
- status: 'completed'
- end_time: 当前时间

## 当前执行的具体情况

### 任务配置
```json
{
  "id": "36522a64-32d4-4140-91cc-cbdcb5d57770",
  "name": "11",
  "keywords": ["professional subscriber"],
  "targetWebsites": ["https://www.nyse.com"]
}
```

### 执行结果
```json
{
  "executionId": "27ed4fea-0311-41a4-9534-0333de07dfd3",
  "status": "completed",
  "retrievalResults": [
    {
      "websiteUrl": "https://www.nyse.com",
      "keyword": "professional subscriber",
      "found": false,  // 页面中未找到
      "occurrences": 0
    },
    {
      "websiteUrl": "https://www.nyse.com",
      "keyword": "professional subscriber",
      "found": false,  // 文档中也未找到
      "occurrences": 0
    }
  ]
}
```

### 为什么found=false？

1. **ContentRetriever获取页面内容**：
   - 使用axios访问 https://www.nyse.com
   - 获取HTML内容

2. **提取文本内容**：
   - 使用JSDOM解析HTML
   - 提取 `document.body.textContent`
   - 去除所有HTML标签，只保留纯文本

3. **搜索关键词**：
   - 使用正则表达式：`/professional subscriber/gi`
   - 在纯文本中搜索
   - 如果找不到匹配，`found = false`

4. **可能的原因**：
   - 关键词确实不存在于页面文本中
   - 内容在JavaScript动态加载（JSDOM无法执行JS）
   - 关键词使用了不同的表达方式
   - 内容在iframe或其他特殊结构中

## 前端显示

**ResultDashboard计算成功率**：
```typescript
const foundCount = results.filter(r => r.found).length;  // 0
const notFoundCount = results.filter(r => !r.found).length;  // 2
const successRate = Math.round((foundCount / results.length) * 100);  // 0%
```

## 错误处理

系统具有完善的错误容错机制：

1. **网络错误**：自动重试3次，指数退避
2. **单个网站失败**：不影响其他网站
3. **单个文档失败**：不影响其他文档
4. **超时控制**：2分钟超时，返回部分结果
5. **LLM失败**：记录错误，不影响检索结果

## 性能优化

1. **并行处理**：所有网站同时检索
2. **Bull队列**：异步处理，不阻塞API响应
3. **重试机制**：临时网络问题自动恢复
4. **超时控制**：避免长时间等待

## 日志追踪

可以通过以下日志追踪执行过程：

```bash
# 查看后端日志
docker logs financial-compliance-backend --tail 100

# 关键日志标记：
# [TaskScheduler] - 任务调度相关
# [SubagentOrchestrator] - 并行执行相关
# [ContentRetriever] - 内容检索相关
# [WebsiteAnalyzer] - 网站分析相关
# [AnalysisService] - LLM分析相关
```

## 总结

搜索任务执行是一个**异步、并行、容错**的复杂流程：

1. ✅ 用户触发 → API → TaskScheduler
2. ✅ 创建execution记录 → Bull队列
3. ✅ 并行检索所有网站（SubagentOrchestrator）
4. ✅ 每个网站：获取内容 → 搜索关键词 → 提取上下文
5. ✅ 保存检索结果到数据库
6. ✅ LLM生成总结、对比、跨站分析
7. ✅ 标记执行完成

当前情况：系统正常工作，只是关键词"professional subscriber"在NYSE网站上未找到。
