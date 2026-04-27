# API 文档

金融合规政策监测系统 API 完整文档。

## 基础信息

- **Base URL**: `http://localhost:3000` (开发环境)
- **API 版本**: v1
- **认证方式**: JWT Bearer Token
- **内容类型**: `application/json`

## 认证

大多数 API 端点需要认证。在请求头中包含 JWT token：

```http
Authorization: Bearer <your-jwt-token>
```

### 获取 Token

通过登录接口获取 JWT token：

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

响应：
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name"
  }
}
```

## 错误响应格式

所有错误响应遵循统一格式：

```json
{
  "error": "ERROR_CODE",
  "message": "错误描述信息",
  "details": {
    // 可选的详细错误信息
  }
}
```

### 常见错误码

| 状态码 | 错误码 | 说明 |
|--------|--------|------|
| 400 | VALIDATION_ERROR | 请求参数验证失败 |
| 401 | UNAUTHORIZED | 未认证或 token 无效 |
| 403 | FORBIDDEN | 无权限访问 |
| 404 | NOT_FOUND | 资源不存在 |
| 409 | CONFLICT | 资源冲突 |
| 500 | INTERNAL_ERROR | 服务器内部错误 |

---

## API 端点

### 1. 用户认证

#### 1.1 用户注册

```http
POST /api/auth/register
```

**请求体**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "张三"
}
```

**响应** (201 Created):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "张三",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

**错误响应**:
- 400: 邮箱已存在
- 400: 密码强度不足

#### 1.2 用户登录

```http
POST /api/auth/login
```

**请求体**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**响应** (200 OK):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "张三"
  }
}
```

**错误响应**:
- 401: 邮箱或密码错误

#### 1.3 获取当前用户信息

```http
GET /api/auth/me
Authorization: Bearer <token>
```

**响应** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "张三",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

### 2. 任务管理

#### 2.1 创建监测任务

```http
POST /api/tasks
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "name": "银行监管政策监测",
  "keywords": ["资本充足率", "流动性覆盖率", "杠杆率"],
  "targetWebsites": [
    "https://www.cbirc.gov.cn",
    "https://www.pbc.gov.cn"
  ],
  "schedule": {
    "type": "daily",
    "time": "09:00"
  }
}
```

**Schedule 类型**:

- **一次性执行**:
  ```json
  {
    "type": "once"
  }
  ```

- **每日执行**:
  ```json
  {
    "type": "daily",
    "time": "09:00"  // HH:mm 格式
  }
  ```

- **每周执行**:
  ```json
  {
    "type": "weekly",
    "time": "09:00",
    "dayOfWeek": 1  // 0=周日, 1=周一, ..., 6=周六
  }
  ```

- **每月执行**:
  ```json
  {
    "type": "monthly",
    "time": "09:00",
    "dayOfMonth": 1  // 1-31
  }
  ```

**响应** (201 Created):
```json
{
  "id": "task-uuid",
  "userId": "user-uuid",
  "name": "银行监管政策监测",
  "keywords": ["资本充足率", "流动性覆盖率", "杠杆率"],
  "targetWebsites": [
    "https://www.cbirc.gov.cn",
    "https://www.pbc.gov.cn"
  ],
  "schedule": {
    "type": "daily",
    "time": "09:00"
  },
  "status": "active",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z",
  "nextExecutionAt": "2024-01-16T09:00:00Z"
}
```

**错误响应**:
- 400: 参数验证失败（关键词或网站为空）

#### 2.2 获取任务列表

```http
GET /api/tasks?status=active&page=1&limit=20
Authorization: Bearer <token>
```

**查询参数**:
- `status` (可选): 任务状态 (`active`, `paused`, `deleted`)
- `page` (可选): 页码，默认 1
- `limit` (可选): 每页数量，默认 20

**响应** (200 OK):
```json
{
  "tasks": [
    {
      "id": "task-uuid",
      "name": "银行监管政策监测",
      "keywords": ["资本充足率"],
      "targetWebsites": ["https://www.cbirc.gov.cn"],
      "schedule": {
        "type": "daily",
        "time": "09:00"
      },
      "status": "active",
      "createdAt": "2024-01-15T10:30:00Z",
      "lastExecutedAt": "2024-01-15T09:00:00Z",
      "nextExecutionAt": "2024-01-16T09:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

#### 2.3 获取任务详情

```http
GET /api/tasks/:taskId
Authorization: Bearer <token>
```

**响应** (200 OK):
```json
{
  "id": "task-uuid",
  "userId": "user-uuid",
  "name": "银行监管政策监测",
  "keywords": ["资本充足率", "流动性覆盖率"],
  "targetWebsites": [
    "https://www.cbirc.gov.cn",
    "https://www.pbc.gov.cn"
  ],
  "schedule": {
    "type": "daily",
    "time": "09:00"
  },
  "status": "active",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z",
  "lastExecutedAt": "2024-01-15T09:00:00Z",
  "nextExecutionAt": "2024-01-16T09:00:00Z"
}
```

**错误响应**:
- 404: 任务不存在

#### 2.4 更新任务

```http
PUT /api/tasks/:taskId
Authorization: Bearer <token>
```

**请求体** (所有字段可选):
```json
{
  "name": "更新后的任务名称",
  "keywords": ["新关键词"],
  "targetWebsites": ["https://new-website.com"],
  "schedule": {
    "type": "weekly",
    "time": "10:00",
    "dayOfWeek": 1
  }
}
```

**响应** (200 OK):
```json
{
  "id": "task-uuid",
  "name": "更新后的任务名称",
  // ... 完整的任务对象
}
```

**错误响应**:
- 404: 任务不存在
- 403: 无权限修改此任务

#### 2.5 暂停/恢复任务

```http
PATCH /api/tasks/:taskId/status
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "status": "paused"  // 或 "active"
}
```

**响应** (200 OK):
```json
{
  "id": "task-uuid",
  "status": "paused",
  // ... 完整的任务对象
}
```

#### 2.6 删除任务

```http
DELETE /api/tasks/:taskId
Authorization: Bearer <token>
```

**响应** (200 OK):
```json
{
  "success": true,
  "message": "任务已删除"
}
```

**注意**: 删除任务不会删除历史执行记录。

#### 2.7 手动触发任务执行

```http
POST /api/tasks/:taskId/execute
Authorization: Bearer <token>
```

**响应** (202 Accepted):
```json
{
  "executionId": "execution-uuid",
  "status": "running",
  "message": "任务已开始执行"
}
```

---

### 3. 执行结果查询

#### 3.1 获取任务执行历史

```http
GET /api/tasks/:taskId/executions?page=1&limit=20
Authorization: Bearer <token>
```

**查询参数**:
- `page` (可选): 页码，默认 1
- `limit` (可选): 每页数量，默认 20

**响应** (200 OK):
```json
{
  "executions": [
    {
      "id": "execution-uuid",
      "taskId": "task-uuid",
      "status": "completed",
      "startTime": "2024-01-15T09:00:00Z",
      "endTime": "2024-01-15T09:05:30Z",
      "createdAt": "2024-01-15T09:00:00Z"
    }
  ],
  "total": 10,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

#### 3.2 获取执行详情

```http
GET /api/executions/:executionId
Authorization: Bearer <token>
```

**响应** (200 OK):
```json
{
  "id": "execution-uuid",
  "taskId": "task-uuid",
  "status": "completed",
  "startTime": "2024-01-15T09:00:00Z",
  "endTime": "2024-01-15T09:05:30Z",
  "results": [
    {
      "id": "result-uuid",
      "websiteUrl": "https://www.cbirc.gov.cn",
      "keyword": "资本充足率",
      "found": true,
      "content": "资本充足率是指...",
      "context": "...上下文内容...",
      "sourceUrl": "https://www.cbirc.gov.cn/policy/123"
    }
  ],
  "hasSummary": true,
  "hasComparison": true,
  "hasCrossSiteAnalysis": true
}
```

#### 3.3 获取总结文档

```http
GET /api/executions/:executionId/summary
Authorization: Bearer <token>
```

**响应** (200 OK):
```json
{
  "id": "summary-uuid",
  "executionId": "execution-uuid",
  "content": "# 关键词总结\n\n## 资本充足率\n\n资本充足率是指...",
  "sources": [
    {
      "website": "https://www.cbirc.gov.cn",
      "url": "https://www.cbirc.gov.cn/policy/123",
      "keyword": "资本充足率"
    }
  ],
  "createdAt": "2024-01-15T09:05:00Z"
}
```

**错误响应**:
- 404: 总结文档不存在（任务可能还在执行中）

#### 3.4 获取对比报告

```http
GET /api/executions/:executionId/comparison
Authorization: Bearer <token>
```

**响应** (200 OK):
```json
{
  "reports": [
    {
      "id": "comparison-uuid",
      "currentExecutionId": "execution-uuid",
      "previousExecutionId": "previous-execution-uuid",
      "websiteUrl": "https://www.cbirc.gov.cn",
      "keyword": "资本充足率",
      "changes": {
        "added": ["新增的内容段落"],
        "removed": ["删除的内容段落"],
        "modified": [
          {
            "field": "定义",
            "oldValue": "旧的定义",
            "newValue": "新的定义"
          }
        ]
      },
      "summary": "本次检索发现资本充足率定义有更新...",
      "createdAt": "2024-01-15T09:05:00Z"
    }
  ]
}
```

**错误响应**:
- 404: 对比报告不存在（可能是首次执行）

#### 3.5 获取跨网站对比分析

```http
GET /api/executions/:executionId/cross-site
Authorization: Bearer <token>
```

**响应** (200 OK):
```json
{
  "analyses": [
    {
      "id": "cross-site-uuid",
      "executionId": "execution-uuid",
      "keyword": "资本充足率",
      "differences": [
        {
          "websites": [
            "https://www.cbirc.gov.cn",
            "https://www.pbc.gov.cn"
          ],
          "aspect": "计算方法",
          "description": "银保监会强调核心一级资本，而人民银行更关注总资本"
        }
      ],
      "commonalities": [
        "都要求最低资本充足率为 8%",
        "都包含风险加权资产的计算"
      ],
      "analysisSummary": "不同监管机构对资本充足率的定义基本一致...",
      "createdAt": "2024-01-15T09:05:00Z"
    }
  ]
}
```

#### 3.6 获取原始内容

```http
GET /api/executions/:executionId/original/:websiteIndex
Authorization: Bearer <token>
```

**路径参数**:
- `websiteIndex`: 网站索引（从 0 开始）

**响应** (200 OK):
```json
{
  "id": "original-content-uuid",
  "retrievalResultId": "result-uuid",
  "contentType": "html",
  "rawContent": "<html>...</html>",
  "createdAt": "2024-01-15T09:02:00Z"
}
```

---

### 4. 健康检查

#### 4.1 系统健康状态

```http
GET /health
```

**响应** (200 OK):
```json
{
  "status": "healthy",
  "services": {
    "database": "up",
    "redis": "up"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**响应** (503 Service Unavailable):
```json
{
  "status": "unhealthy",
  "error": "Service unavailable",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## 数据模型

### Task (任务)

```typescript
interface Task {
  id: string;
  userId: string;
  name: string;
  keywords: string[];
  targetWebsites: string[];
  schedule: Schedule;
  status: 'active' | 'paused' | 'deleted';
  createdAt: string;  // ISO 8601
  updatedAt: string;  // ISO 8601
  lastExecutedAt?: string;  // ISO 8601
  nextExecutionAt?: string;  // ISO 8601
}

interface Schedule {
  type: 'once' | 'daily' | 'weekly' | 'monthly';
  time?: string;  // HH:mm
  dayOfWeek?: number;  // 0-6
  dayOfMonth?: number;  // 1-31
}
```

### Execution (执行记录)

```typescript
interface Execution {
  id: string;
  taskId: string;
  status: 'running' | 'completed' | 'failed';
  startTime: string;  // ISO 8601
  endTime?: string;  // ISO 8601
  errorMessage?: string;
  createdAt: string;  // ISO 8601
}
```

### RetrievalResult (检索结果)

```typescript
interface RetrievalResult {
  id: string;
  executionId: string;
  websiteUrl: string;
  keyword: string;
  found: boolean;
  content?: string;
  context?: string;
  sourceUrl?: string;
  documentUrl?: string;
  createdAt: string;  // ISO 8601
}
```

---

## 使用示例

### 完整工作流示例

```javascript
// 1. 用户登录
const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});
const { token } = await loginResponse.json();

// 2. 创建监测任务
const createTaskResponse = await fetch('http://localhost:3000/api/tasks', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    name: '银行监管政策监测',
    keywords: ['资本充足率', '流动性覆盖率'],
    targetWebsites: [
      'https://www.cbirc.gov.cn',
      'https://www.pbc.gov.cn'
    ],
    schedule: {
      type: 'daily',
      time: '09:00'
    }
  })
});
const task = await createTaskResponse.json();

// 3. 手动触发执行
const executeResponse = await fetch(
  `http://localhost:3000/api/tasks/${task.id}/execute`,
  {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  }
);
const { executionId } = await executeResponse.json();

// 4. 轮询执行状态
let execution;
do {
  await new Promise(resolve => setTimeout(resolve, 5000)); // 等待 5 秒
  const statusResponse = await fetch(
    `http://localhost:3000/api/executions/${executionId}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  execution = await statusResponse.json();
} while (execution.status === 'running');

// 5. 获取总结文档
const summaryResponse = await fetch(
  `http://localhost:3000/api/executions/${executionId}/summary`,
  {
    headers: { 'Authorization': `Bearer ${token}` }
  }
);
const summary = await summaryResponse.json();
console.log('总结文档:', summary.content);

// 6. 获取对比报告
const comparisonResponse = await fetch(
  `http://localhost:3000/api/executions/${executionId}/comparison`,
  {
    headers: { 'Authorization': `Bearer ${token}` }
  }
);
const comparison = await comparisonResponse.json();
console.log('对比报告:', comparison.reports);
```

---

## 速率限制

为防止滥用，API 实施以下速率限制：

- **认证端点**: 5 次/分钟/IP
- **任务创建**: 10 次/分钟/用户
- **任务执行**: 20 次/小时/用户
- **查询端点**: 100 次/分钟/用户

超过限制将返回 429 Too Many Requests。

---

## 版本历史

### v1.0.0 (2024-01-15)
- 初始版本发布
- 支持任务创建、管理和执行
- 支持结果查询和分析
- 支持用户认证

---

## 技术支持

如有 API 使用问题，请：
- 查看本文档
- 提交 Issue
- 联系技术支持团队
