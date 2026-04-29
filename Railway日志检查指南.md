# Railway日志检查指南

## 如何查看Railway日志

1. 打开 https://railway.app
2. 进入你的项目 "financial-compliance-monitoring"
3. 点击 Backend 服务
4. 点击 "Deployments" 标签
5. 点击最新的部署
6. 查看 "Logs" 部分

## 需要搜索的关键日志

### 1. 任务执行开始
```
搜索: [TaskScheduler] Starting execution flow
```

应该看到:
```
[TaskScheduler] Starting execution flow for execution <execution_id>
[TaskScheduler] Step 1: Parallel retrieval from 1 websites
```

### 2. 网站分析（如果启用）
```
搜索: [WebsiteAnalyzer]
```

应该看到:
```
[WebsiteAnalyzer] Analyzing website: https://www.nasdaq.com/
[WebsiteAnalyzer] Found X page links and Y document links
```

### 3. 内容检索
```
搜索: [ContentRetriever] Processing website
```

应该看到:
```
[ContentRetriever] Processing website: https://www.nasdaq.com/
[ContentRetriever] Fetching page content from https://www.nasdaq.com/ via Jina Reader
[ContentRetriever] Successfully fetched via Jina Reader: https://www.nasdaq.com/
```

或者如果失败:
```
[ContentRetriever] Jina Reader failed for https://www.nasdaq.com/: <error>
[ContentRetriever] Direct fetch from https://www.nasdaq.com/ (attempt 1/3)
```

### 4. LLM搜索（最关键！）
```
搜索: [ContentRetriever] Using LLM
```

应该看到:
```
[ContentRetriever] Using LLM to search for keywords in https://www.nasdaq.com/
[ContentRetriever] LLM response (first 500 chars): {"keywordResults":[...]}
[ContentRetriever] LLM search completed: found X/Y keywords
[ContentRetriever] Keyword matches: [{"keyword":"professional","found":true}]
```

**如果看到**:
```
[ContentRetriever] LLM search failed: <error>
[ContentRetriever] Falling back to simple keyword matching
```
说明LLM调用失败了！

### 5. 保存检索结果
```
搜索: [TaskScheduler] Step 2: Saving
```

应该看到:
```
[TaskScheduler] Step 2: Saving X retrieval results
```

如果X=0，说明没有检索结果！

### 6. 生成分析
```
搜索: [TaskScheduler] Step 3
```

应该看到:
```
[TaskScheduler] Step 3: Generating summary document
[TaskScheduler] Step 4: Comparing with previous results
[TaskScheduler] Step 5: Performing cross-site analysis
[TaskScheduler] Step 6: Marking execution as completed
[TaskScheduler] Execution <execution_id> completed successfully
```

### 7. 错误日志
```
搜索: Error
搜索: Failed
搜索: failed
```

查看是否有任何错误信息。

## 日志分析示例

### 示例1: 正常执行（找到关键词）

```
[TaskScheduler] Starting execution flow for execution abc123
[TaskScheduler] Step 1: Parallel retrieval from 1 websites
[SubagentOrchestrator] Starting parallel execution for 1 websites
[ContentRetriever] Processing website: https://www.nasdaq.com/
[ContentRetriever] Fetching page content via Jina Reader
[ContentRetriever] Successfully fetched via Jina Reader
[ContentRetriever] Using LLM to search for keywords
[ContentRetriever] LLM response: {"keywordResults":[{"keyword":"professional","found":true,"content":"...","sourceUrl":"https://www.nasdaq.com/"}]}
[ContentRetriever] LLM search completed: found 1/1 keywords
[ContentRetriever] Keyword matches: [{"keyword":"professional","found":true}]
[TaskScheduler] Step 2: Saving 1 retrieval results
[TaskScheduler] Step 3: Generating summary document
[TaskScheduler] Step 4: Comparing with previous results
[TaskScheduler] Step 5: Performing cross-site analysis
[TaskScheduler] Step 6: Marking execution as completed
[TaskScheduler] Execution abc123 completed successfully
```

### 示例2: 正常执行（未找到关键词）

```
[TaskScheduler] Starting execution flow for execution abc123
[TaskScheduler] Step 1: Parallel retrieval from 1 websites
[SubagentOrchestrator] Starting parallel execution for 1 websites
[ContentRetriever] Processing website: https://www.nasdaq.com/
[ContentRetriever] Fetching page content via Jina Reader
[ContentRetriever] Successfully fetched via Jina Reader
[ContentRetriever] Using LLM to search for keywords
[ContentRetriever] LLM response: {"keywordResults":[{"keyword":"professional","found":false,"content":"","sourceUrl":""}]}
[ContentRetriever] LLM search completed: found 0/1 keywords
[ContentRetriever] Keyword matches: [{"keyword":"professional","found":false}]
[TaskScheduler] Step 2: Saving 1 retrieval results
[TaskScheduler] Step 3: Generating summary document
[TaskScheduler] Step 4: Comparing with previous results
[TaskScheduler] Step 5: Performing cross-site analysis
[TaskScheduler] Step 6: Marking execution as completed
[TaskScheduler] Execution abc123 completed successfully
```

### 示例3: LLM调用失败

```
[TaskScheduler] Starting execution flow for execution abc123
[TaskScheduler] Step 1: Parallel retrieval from 1 websites
[SubagentOrchestrator] Starting parallel execution for 1 websites
[ContentRetriever] Processing website: https://www.nasdaq.com/
[ContentRetriever] Fetching page content via Jina Reader
[ContentRetriever] Successfully fetched via Jina Reader
[ContentRetriever] Using LLM to search for keywords
[ContentRetriever] Error calling LLM API: <error details>
[ContentRetriever] LLM search failed: Failed to call LLM API: <error>
[ContentRetriever] Falling back to simple keyword matching
[ContentRetriever] Keyword matches: [{"keyword":"professional","found":false}]
[TaskScheduler] Step 2: Saving 1 retrieval results
...
```

### 示例4: 网站访问失败

```
[TaskScheduler] Starting execution flow for execution abc123
[TaskScheduler] Step 1: Parallel retrieval from 1 websites
[SubagentOrchestrator] Starting parallel execution for 1 websites
[ContentRetriever] Processing website: https://www.nasdaq.com/
[ContentRetriever] Fetching page content via Jina Reader
[ContentRetriever] Jina Reader failed: Connection timeout
[ContentRetriever] Direct fetch from https://www.nasdaq.com/ (attempt 1/3)
[ContentRetriever] Attempt 1 failed: Connection timeout
[ContentRetriever] Waiting 1000ms before retry...
[ContentRetriever] Direct fetch from https://www.nasdaq.com/ (attempt 2/3)
[ContentRetriever] Attempt 2 failed: Connection timeout
...
[ContentRetriever] Failed to retrieve from https://www.nasdaq.com/: Connection timeout
[TaskScheduler] Website https://www.nasdaq.com/ failed: Connection timeout
[TaskScheduler] Step 2: Saving 1 retrieval results
...
```

## 关键指标

根据日志，回答以下问题：

1. **任务是否开始执行？**
   - 是否看到 "[TaskScheduler] Starting execution flow"

2. **网站是否成功访问？**
   - 是否看到 "Successfully fetched via Jina Reader"
   - 或者看到 "Jina Reader failed" 和重试日志

3. **LLM是否被调用？**
   - 是否看到 "[ContentRetriever] Using LLM to search"

4. **LLM是否返回结果？**
   - 是否看到 "[ContentRetriever] LLM response"
   - 响应内容是什么？

5. **关键词匹配结果是什么？**
   - 是否看到 "[ContentRetriever] Keyword matches"
   - found 是 true 还是 false？

6. **保存了多少条检索结果？**
   - 是否看到 "[TaskScheduler] Step 2: Saving X retrieval results"
   - X 是多少？

7. **执行是否完成？**
   - 是否看到 "[TaskScheduler] Execution <id> completed successfully"
   - 或者看到错误信息？

## 提供日志信息

请复制以下日志片段发送给我：

1. 从 "[TaskScheduler] Starting execution flow" 开始
2. 到 "[TaskScheduler] Execution <id> completed" 结束
3. 包括所有中间的日志行

或者，如果日志太长，至少提供：
- LLM相关的所有日志行
- 任何包含 "Error" 或 "failed" 的日志行
- Step 2 保存检索结果的日志行
