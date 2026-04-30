# 检查Railway日志 - 阶段一优化诊断

**目的**: 诊断为什么最新的检索没有结果

---

## 快速检查步骤

### 步骤1: 访问Railway日志

1. 打开 https://railway.app/dashboard
2. 选择项目 `financial-compliance-monitoring`
3. 点击后端服务
4. 点击 "Deployments" 标签
5. 选择最新的部署
6. 查看实时日志

### 步骤2: 检查关键日志

在日志中搜索以下关键词（按顺序）：

#### 2.1 检查服务启动
搜索: `Server started`
```
✓ 应该看到: Server started on port 3000
✓ 应该看到: Database connected
✓ 应该看到: pg-boss started
```

#### 2.2 检查优化版本是否启用
搜索: `Using optimized LLM search`
```
✓ 应该看到: [ContentRetriever] Using optimized LLM search for https://...
```

如果**没有看到**这条日志：
- ❌ 优化版本未启用
- 原因: 可能是代码未部署或环境变量未配置

#### 2.3 检查Chunk拆分
搜索: `Total chunks created`
```
✓ 应该看到: [ContentRetriever] Total chunks created: X
```

如果看到 `Total chunks created: 0`：
- ❌ 内容太短，无法生成chunks
- 原因: 网页内容 <100 字符（CHUNK_MIN_SIZE）

#### 2.4 检查BM25检索
搜索: `Built index` 或 `Retrieved`
```
✓ 应该看到: [SimpleRetriever] Built index with X chunks
✓ 应该看到: [SimpleRetriever] Retrieved Y chunks for query: "关键词"
```

#### 2.5 检查DEBUG信息
搜索: `DEBUG INFO`
```
✓ 应该看到: ========== DEBUG INFO ==========
✓ 应该看到: JSON格式的debug信息
✓ 应该看到: ================================
```

如果**没有看到** DEBUG INFO：
- ❌ DEBUG_MODE未开启
- 解决: 在Railway添加环境变量 `DEBUG_MODE=true`

#### 2.6 检查LLM调用
搜索: `LLM` 或 `llmCall`
```
✓ 应该看到: llmCall 相关信息
✓ 应该看到: totalTokens, cost, duration
```

#### 2.7 检查错误
搜索: `Error` 或 `error`
```
❌ 如果看到错误，记录完整的错误信息
```

---

## 常见问题诊断

### 问题1: 没有看到 "Using optimized LLM search"

**原因**: 优化代码未部署

**检查**:
1. Railway是否已重新部署？
2. 最新的commit是否包含优化代码？

**解决**:
```bash
# 检查最新commit
git log --oneline -5

# 应该看到: feat: 阶段一RAG优化

# 如果Railway未自动部署，手动触发
# 在Railway Dashboard → Deployments → Redeploy
```

### 问题2: 看到 "Total chunks created: 0"

**原因**: 内容太短或抓取失败

**检查日志**:
```
搜索: "Fetching page content"
搜索: "Successfully fetched"
```

**可能的原因**:
1. Jina Reader抓取失败
2. 网页内容太短（<100字符）
3. 网页需要登录或被屏蔽

**解决**:
- 尝试不同的网站
- 检查Jina Reader是否正常工作
- 降低CHUNK_MIN_SIZE（在Railway环境变量中）

### 问题3: 没有看到 DEBUG INFO

**原因**: DEBUG_MODE未开启

**检查**:
1. Railway Dashboard → Variables
2. 查找 `DEBUG_MODE`

**解决**:
```bash
# 在Railway Dashboard添加环境变量
DEBUG_MODE=true

# 保存后Railway会自动重新部署
```

### 问题4: 看到错误 "LLM API key is not configured"

**原因**: LLM配置缺失

**检查**:
1. Railway Dashboard → Variables
2. 确认以下变量存在：
   - LLM_API_URL
   - LLM_API_KEY
   - LLM_MODEL

**解决**:
- 添加缺失的环境变量
- 重新部署

### 问题5: 检索结果为空但没有错误

**可能原因**:
1. LLM返回 `found: false`
2. 关键词在内容中不存在
3. BM25分数太低，没有检索到相关chunks

**检查DEBUG INFO**:
```json
{
  "retrieval": {
    "retrievedChunks": 0,  // ← 如果是0，说明BM25没有找到相关内容
    "topScore": 0
  },
  "llmAnswer": {
    "found": false  // ← LLM判断关键词不存在
  }
}
```

**解决**:
- 使用更相关的关键词
- 检查网站内容是否真的包含关键词
- 降低BM25阈值（需要修改代码）

---

## 收集诊断信息

如果问题仍未解决，请收集以下信息：

### 1. Railway日志片段
```
复制最近的100行日志，包括：
- 任务开始时间
- 所有 [ContentRetriever] 日志
- 所有 [SimpleRetriever] 日志
- 任何错误信息
- DEBUG INFO（如果有）
```

### 2. 数据库查询结果
```sql
-- 在Supabase SQL Editor运行
-- 使用 诊断最新检索问题.sql
```

### 3. 环境变量配置
```
在Railway Dashboard → Variables
截图或复制所有环境变量（隐藏敏感信息）
```

### 4. 任务配置
```
- 任务名称
- 网站URL
- 关键词列表
```

---

## 快速诊断命令

### 检查最新部署
```
Railway Dashboard → Deployments
查看最新部署的状态和时间
```

### 检查环境变量
```
Railway Dashboard → Variables
确认以下变量存在：
✓ DEBUG_MODE=true
✓ MAX_CHUNKS_PER_KEYWORD=30
✓ CHUNK_MAX_SIZE=500
✓ CHUNK_MIN_SIZE=100
✓ CHUNK_OVERLAP=50
✓ LLM_API_URL
✓ LLM_API_KEY
✓ LLM_MODEL
```

### 触发测试任务
```
在前端创建一个简单的测试任务：
- 网站: https://example.com
- 关键词: example, domain

然后立即查看Railway日志
```

---

## 预期的正常日志

一个成功的检索应该看到以下日志序列：

```
1. [ContentRetriever] Processing website: https://example.com
2. [ContentRetriever] Using optimized LLM search for https://example.com
3. [ContentRetriever] Fetching page content from https://example.com
4. [ContentRetriever] Successfully fetched via Jina Reader
5. [ContentRetriever] Total chunks created: 5
6. [SimpleRetriever] Built index with 5 chunks
7. [SimpleRetriever] Retrieved 3 chunks for query: "example"
8. ========== DEBUG INFO ==========
9. { ... JSON debug info ... }
10. ================================
11. [ContentRetriever] Completed all keywords in XXXms
```

如果缺少任何步骤，说明在那个环节出了问题。

---

**创建时间**: 2026-04-30  
**用途**: 诊断阶段一优化部署后的检索问题
