# LLM搜索功能部署分析报告

## 问题分析

### 最新搜索执行情况

**执行ID**: `57f8d303-5ce1-43ff-80bd-0558f2463828`
**任务ID**: `8fab5f66-46eb-44f1-9e2d-2d7b644c62c3`
**网站**: https://www.nyse.com
**关键词**: `profesional subscriber` (注意：拼写错误，应为 `professional`)
**结果**: 未找到 (found = false)

### 根本原因

**LLM没有被调用！**

检查日志发现：
- ✅ WebsiteAnalyzer 正常工作
- ✅ 页面内容获取成功
- ✅ 文档内容获取成功
- ❌ **没有LLM调用的日志**
- ❌ 使用的是旧版本代码（简单关键词匹配）

### 部署问题

1. **Docker构建缓存问题**
   - 虽然源代码已更新，但Docker使用了缓存的旧层
   - `docker-compose build backend` 使用了缓存
   - 导致新代码没有被编译进镜像

2. **容器没有重新创建**
   - `docker-compose restart` 只重启容器，不更新镜像
   - 即使重新构建了镜像，运行的容器还是旧的

3. **验证方法**
   - 检查容器中文件大小：旧版 13593字节 vs 新版 24817字节
   - 检查文件时间戳：旧版 Mar 23 02:30 vs 新版 Mar 23 09:06
   - 搜索关键方法：旧版没有 `llmWebSearch`，新版有

## 解决方案

### 已执行的修复步骤

1. **强制重新构建镜像**
   ```bash
   docker-compose build --no-cache backend
   ```

2. **停止并删除旧容器**
   ```bash
   docker-compose stop backend
   docker-compose rm -f backend
   ```

3. **创建新容器**
   ```bash
   docker-compose up -d backend
   ```

4. **验证部署**
   ```bash
   docker exec financial-compliance-backend grep -c "llmWebSearch" /app/dist/services/ContentRetriever.js
   # 输出: 2 (成功！)
   ```

### 当前状态

✅ **新代码已成功部署**
- llmWebSearch 方法存在
- fetchSubPages 方法存在
- fetchDocuments 方法存在
- callLLM 方法存在
- 服务正常运行

## 下一步测试

### 1. 创建新的测试任务

使用正确的关键词拼写：

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "name": "LLM搜索测试 - 正确拼写",
    "keywords": ["professional subscriber"],
    "targetWebsites": ["https://www.nyse.com"],
    "schedule": {
      "type": "once"
    }
  }'
```

### 2. 执行任务并观察日志

```bash
# 实时查看日志
docker logs financial-compliance-backend -f

# 应该看到以下日志：
# [ContentRetriever] Processing website: https://www.nyse.com
# [ContentRetriever] Found X page links and Y document links
# [ContentRetriever] Fetching N sub-pages
# [ContentRetriever] Fetching M documents
# [ContentRetriever] Using LLM to search for keywords in https://www.nyse.com
# [ContentRetriever] LLM search completed: found X/Y keywords
```

### 3. 预期结果

如果LLM调用成功：
- ✅ 日志中会出现 "Using LLM to search"
- ✅ 日志中会出现 "LLM search completed"
- ✅ 数据库中 found = true
- ✅ content 字段包含完整定义
- ✅ source_url 指向具体的子页面或文档

如果LLM调用失败：
- ⚠️ 日志中会出现 "LLM search failed"
- ⚠️ 日志中会出现 "Falling back to simple keyword matching"
- ⚠️ 系统会降级到简单关键词匹配

## 常见问题排查

### Q: 如何确认LLM是否被调用？

A: 查看日志中是否有以下关键字：
```bash
docker logs financial-compliance-backend 2>&1 | grep -E "(Using LLM|LLM search|callLLM)"
```

### Q: 如何确认使用的是新代码？

A: 检查容器中的文件：
```bash
# 检查文件大小（新版应该是 ~24KB）
docker exec financial-compliance-backend ls -lh /app/dist/services/ContentRetriever.js

# 检查是否有新方法
docker exec financial-compliance-backend grep -c "llmWebSearch" /app/dist/services/ContentRetriever.js
```

### Q: 为什么之前的搜索没有结果？

A: 两个原因：
1. **使用了旧代码**：只搜索主页面，不搜索子页面和文档
2. **关键词拼写错误**：`profesional` 应该是 `professional`

### Q: 如何避免Docker缓存问题？

A: 部署新代码时使用：
```bash
# 方法1：强制重新构建
docker-compose build --no-cache backend
docker-compose up -d --force-recreate backend

# 方法2：完整重建
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## 性能监控

### 关键指标

1. **LLM调用成功率**
   ```sql
   -- 查看最近的执行
   SELECT 
     e.id,
     e.status,
     COUNT(r.id) as total_results,
     SUM(CASE WHEN r.found THEN 1 ELSE 0 END) as found_count
   FROM executions e
   LEFT JOIN retrieval_results r ON e.id = r.execution_id
   WHERE e.start_time > NOW() - INTERVAL '1 day'
   GROUP BY e.id, e.status
   ORDER BY e.start_time DESC;
   ```

2. **执行时间**
   ```sql
   SELECT 
     id,
     EXTRACT(EPOCH FROM (end_time - start_time)) as duration_seconds
   FROM executions
   WHERE end_time IS NOT NULL
   ORDER BY start_time DESC
   LIMIT 10;
   ```

3. **错误率**
   ```sql
   SELECT 
     status,
     COUNT(*) as count,
     ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
   FROM executions
   WHERE start_time > NOW() - INTERVAL '1 day'
   GROUP BY status;
   ```

## 总结

### 问题
- ❌ LLM没有被调用（使用了旧代码）
- ❌ Docker构建缓存导致新代码未部署
- ❌ 容器重启不会更新镜像

### 解决
- ✅ 强制重新构建镜像（--no-cache）
- ✅ 删除并重新创建容器
- ✅ 验证新代码已部署

### 下一步
- 🔄 创建新任务测试LLM搜索
- 🔄 观察日志确认LLM调用
- 🔄 验证搜索结果质量
- 🔄 监控性能和成本

## 相关文档

- [LLM搜索功能说明](./LLM_SEARCH_FEATURE.md)
- [搜索升级总结](./SEARCH_UPGRADE_SUMMARY.md)
- [使用指南](./HOW_TO_USE_LLM_SEARCH.md)
- [当前配置](./CURRENT_LLM_CONFIG.md)
