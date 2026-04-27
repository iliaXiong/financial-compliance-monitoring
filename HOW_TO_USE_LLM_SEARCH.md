# 如何使用LLM智能搜索功能

## 快速开始

### 1. 配置LLM API

编辑 `backend/.env` 文件，添加LLM API配置：

```bash
# 使用OpenAI
LLM_API_KEY=sk-your-openai-api-key
LLM_API_URL=https://api.openai.com/v1/chat/completions
LLM_MODEL=gpt-4

# 或使用其他兼容服务（如Azure OpenAI、本地LLM等）
LLM_API_KEY=your-api-key
LLM_API_URL=https://your-service.com/v1/chat/completions
LLM_MODEL=your-model
```

### 2. 重启服务

```bash
docker-compose restart backend
```

### 3. 创建搜索任务

通过前端界面或API创建任务：

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "name": "NYSE政策监测",
    "keywords": ["professional subscriber", "market data"],
    "targetWebsites": ["https://www.nyse.com"],
    "schedule": {
      "type": "daily",
      "time": "09:00"
    }
  }'
```

### 4. 查看结果

执行完成后，查看结果：

```bash
# 获取执行历史
curl http://localhost:3000/api/tasks/{taskId}/executions

# 获取执行详情
curl http://localhost:3000/api/executions/{executionId}

# 获取总结文档
curl http://localhost:3000/api/executions/{executionId}/summary
```

## 工作原理

### 搜索流程

1. **分析阶段**
   - 访问目标网站主页
   - 识别政策相关的子页面链接
   - 识别文档链接（PDF、DOC等）

2. **获取阶段**
   - 获取主页面内容
   - 并行获取前5个子页面内容
   - 并行获取前5个文档内容

3. **搜索阶段**
   - 将所有内容发送给LLM
   - LLM智能分析，提取关键词定义
   - 返回结构化结果

4. **保存阶段**
   - 保存搜索结果到数据库
   - 生成总结文档
   - 生成对比报告（如果有历史数据）

### LLM的作用

LLM不仅仅是搜索关键词，而是：

- ✅ 理解内容语义
- ✅ 识别同义词和相关概念
- ✅ 提取完整的定义和解释
- ✅ 确定最权威的信息来源
- ✅ 提供有意义的上下文

## 结果示例

### 找到关键词

```json
{
  "keyword": "professional subscriber",
  "found": true,
  "content": "A professional subscriber is any person who receives market data for use in their professional capacity, including but not limited to: broker-dealers, investment advisers, and other financial professionals...",
  "sourceUrl": "https://www.nyse.com/publicdocs/nyse/data/NYSE_Market_Data_Subscriber_Agreement.pdf",
  "context": "在NYSE市场数据订阅协议第3.1节中，professional subscriber被明确定义为..."
}
```

### 未找到关键词

```json
{
  "keyword": "unknown term",
  "found": false,
  "content": null,
  "sourceUrl": null,
  "context": null
}
```

## 常见问题

### Q: LLM API调用失败怎么办？

A: 系统会自动降级到简单关键词匹配，不会影响基本功能。检查：
- LLM_API_KEY 是否正确
- LLM_API_URL 是否可访问
- API配额是否充足

### Q: 为什么只搜索前5个子页面和文档？

A: 这是为了平衡搜索覆盖范围和性能。可以在代码中调整：

```typescript
// backend/src/services/ContentRetriever.ts
analysisResult.pageLinks.slice(0, 5)  // 改为其他数字
analysisResult.documentLinks.slice(0, 5)  // 改为其他数字
```

### Q: 如何查看详细的搜索日志？

A: 查看Docker日志：

```bash
docker logs financial-compliance-backend -f
```

关键日志标识：
- `[ContentRetriever]` - 内容获取相关
- `[WebsiteAnalyzer]` - 网站分析相关
- `[SubagentOrchestrator]` - 并行处理相关

### Q: LLM调用需要多长时间？

A: 通常：
- 简单查询：5-10秒
- 复杂查询（多个子页面和文档）：15-30秒
- 最大超时：60秒

### Q: 如何测试LLM搜索功能？

A: 运行测试脚本：

```bash
./test-llm-search.sh
```

或手动测试：

```bash
# 1. 创建任务
TASK_ID=$(curl -s -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"name":"测试","keywords":["test"],"targetWebsites":["https://example.com"],"schedule":{"type":"once"}}' \
  | jq -r '.id')

# 2. 执行任务
EXEC_ID=$(curl -s -X POST "http://localhost:3000/api/tasks/$TASK_ID/execute" \
  | jq -r '.executionId')

# 3. 查看结果
curl -s "http://localhost:3000/api/executions/$EXEC_ID" | jq .
```

## 性能优化建议

### 1. 调整搜索范围

如果搜索速度慢，减少子页面和文档数量：

```typescript
// 只搜索前3个
.slice(0, 3)
```

### 2. 使用更快的LLM模型

```bash
# 使用GPT-3.5代替GPT-4
LLM_MODEL=gpt-3.5-turbo
```

### 3. 增加超时时间

如果经常超时，增加超时设置：

```typescript
// backend/src/services/ContentRetriever.ts
timeout: 60000 // 改为更大的值
```

### 4. 启用缓存（未来功能）

计划中的功能：
- 缓存LLM搜索结果
- 只重新搜索变化的内容
- 智能增量更新

## 监控和调试

### 查看系统状态

```bash
# 健康检查
curl http://localhost:3000/health

# 查看任务列表
curl http://localhost:3000/api/tasks

# 查看执行历史
curl http://localhost:3000/api/tasks/{taskId}/executions
```

### 查看详细日志

```bash
# 实时日志
docker logs financial-compliance-backend -f

# 最近100行
docker logs financial-compliance-backend --tail 100

# 搜索特定内容
docker logs financial-compliance-backend 2>&1 | grep "LLM"
```

### 常见日志消息

成功的搜索：
```
[ContentRetriever] Processing website: https://www.nyse.com
[ContentRetriever] Found 15 page links and 3 document links
[ContentRetriever] Fetching 5 sub-pages
[ContentRetriever] Fetching 3 documents
[ContentRetriever] Using LLM to search for keywords
[ContentRetriever] LLM search completed: found 2/2 keywords
```

LLM失败降级：
```
[ContentRetriever] LLM search failed: Failed to call LLM API
[ContentRetriever] Falling back to simple keyword matching
```

## 下一步

- 查看 [LLM_SEARCH_FEATURE.md](./LLM_SEARCH_FEATURE.md) 了解技术细节
- 查看 [SEARCH_UPGRADE_SUMMARY.md](./SEARCH_UPGRADE_SUMMARY.md) 了解升级说明
- 查看 [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) 了解API详情
