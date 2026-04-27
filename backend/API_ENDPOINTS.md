# API Endpoints Documentation

## Authentication

All API endpoints require JWT authentication via the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

## Task Management Endpoints

### POST /api/tasks
Create a new monitoring task.

**Request Body:**
```json
{
  "name": "string",
  "keywords": ["string"],
  "targetWebsites": ["string"],
  "schedule": {
    "type": "once" | "daily" | "weekly" | "monthly",
    "time": "HH:mm",
    "dayOfWeek": 0-6,
    "dayOfMonth": 1-31
  }
}
```

**Response (201):**
```json
{
  "taskId": "string",
  "status": "created",
  "task": { /* Task object */ }
}
```

**Error Responses:**
- 400: Validation error
- 401: Unauthorized

---

### GET /api/tasks
Get list of tasks with pagination and filtering.

**Query Parameters:**
- `status`: Filter by status (active, paused, deleted)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

**Response (200):**
```json
{
  "tasks": [/* Task objects */],
  "total": 0,
  "page": 1,
  "limit": 20
}
```

---

### GET /api/tasks/:taskId
Get task details by ID.

**Response (200):**
```json
{
  "id": "string",
  "userId": "string",
  "name": "string",
  "keywords": ["string"],
  "targetWebsites": ["string"],
  "schedule": { /* Schedule object */ },
  "status": "active" | "paused" | "deleted",
  "createdAt": "ISO date",
  "updatedAt": "ISO date",
  "lastExecutedAt": "ISO date",
  "nextExecutionAt": "ISO date"
}
```

**Error Responses:**
- 404: Task not found
- 403: Forbidden (task belongs to another user)

---

### PUT /api/tasks/:taskId
Update task configuration.

**Request Body:**
```json
{
  "name": "string",
  "keywords": ["string"],
  "targetWebsites": ["string"],
  "schedule": { /* Schedule object */ }
}
```

**Response (200):**
```json
{
  /* Updated task object */
}
```

**Error Responses:**
- 400: Validation error
- 404: Task not found
- 403: Forbidden

---

### PATCH /api/tasks/:taskId/status
Pause or resume task execution.

**Request Body:**
```json
{
  "status": "active" | "paused"
}
```

**Response (200):**
```json
{
  /* Updated task object */
}
```

**Error Responses:**
- 400: Invalid status or operation
- 404: Task not found
- 403: Forbidden

---

### DELETE /api/tasks/:taskId
Delete task (soft delete, preserves history).

**Response (200):**
```json
{
  "success": true
}
```

**Error Responses:**
- 404: Task not found
- 403: Forbidden

---

### POST /api/tasks/:taskId/execute
Manually trigger task execution.

**Response (200):**
```json
{
  "executionId": "string"
}
```

**Error Responses:**
- 400: Task is not active
- 404: Task not found
- 403: Forbidden

---

## Result Query Endpoints

### GET /api/tasks/:taskId/executions
Get execution history for a task with pagination.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

**Response (200):**
```json
{
  "executions": [
    {
      "id": "string",
      "taskId": "string",
      "status": "running" | "completed" | "failed",
      "startTime": "ISO date",
      "endTime": "ISO date",
      "errorMessage": "string",
      "createdAt": "ISO date"
    }
  ],
  "total": 0,
  "page": 1,
  "limit": 20
}
```

**Error Responses:**
- 400: Invalid pagination parameters
- 404: Task not found
- 403: Forbidden (task belongs to another user)

---

### GET /api/executions/:executionId
Get execution details including all related data.

**Response (200):**
```json
{
  "execution": {
    "id": "string",
    "taskId": "string",
    "status": "running" | "completed" | "failed",
    "startTime": "ISO date",
    "endTime": "ISO date",
    "errorMessage": "string",
    "createdAt": "ISO date"
  },
  "results": [
    {
      "id": "string",
      "executionId": "string",
      "websiteUrl": "string",
      "keyword": "string",
      "found": true,
      "content": "string",
      "context": "string",
      "sourceUrl": "string",
      "documentUrl": "string",
      "createdAt": "ISO date"
    }
  ],
  "summary": {
    "id": "string",
    "executionId": "string",
    "content": "string (Markdown)",
    "sources": [
      {
        "website": "string",
        "url": "string",
        "keyword": "string"
      }
    ],
    "createdAt": "ISO date"
  },
  "comparison": [
    {
      "id": "string",
      "currentExecutionId": "string",
      "previousExecutionId": "string",
      "websiteUrl": "string",
      "keyword": "string",
      "changes": {
        "added": ["string"],
        "removed": ["string"],
        "modified": [
          {
            "field": "string",
            "oldValue": "string",
            "newValue": "string"
          }
        ]
      },
      "summary": "string",
      "createdAt": "ISO date"
    }
  ],
  "crossSiteAnalysis": [
    {
      "id": "string",
      "executionId": "string",
      "keyword": "string",
      "differences": [
        {
          "websites": ["string"],
          "aspect": "string",
          "description": "string"
        }
      ],
      "commonalities": ["string"],
      "analysisSummary": "string",
      "createdAt": "ISO date"
    }
  ]
}
```

**Error Responses:**
- 404: Execution not found
- 403: Forbidden

---

### GET /api/executions/:executionId/summary
Get summary document for an execution.

**Response (200):**
```json
{
  "id": "string",
  "executionId": "string",
  "content": "string (Markdown)",
  "sources": [
    {
      "website": "string",
      "url": "string",
      "keyword": "string"
    }
  ],
  "createdAt": "ISO date"
}
```

**Error Responses:**
- 404: Execution or summary not found
- 403: Forbidden

---

### GET /api/executions/:executionId/comparison
Get comparison report for an execution.

**Response (200):**
```json
[
  {
    "id": "string",
    "currentExecutionId": "string",
    "previousExecutionId": "string",
    "websiteUrl": "string",
    "keyword": "string",
    "changes": {
      "added": ["string"],
      "removed": ["string"],
      "modified": [
        {
          "field": "string",
          "oldValue": "string",
          "newValue": "string"
        }
      ]
    },
    "summary": "string",
    "createdAt": "ISO date"
  }
]
```

**Error Responses:**
- 404: Execution or comparison report not found (may be first execution)
- 403: Forbidden

---

### GET /api/executions/:executionId/cross-site
Get cross-site comparison analysis for an execution.

**Response (200):**
```json
[
  {
    "id": "string",
    "executionId": "string",
    "keyword": "string",
    "differences": [
      {
        "websites": ["string"],
        "aspect": "string",
        "description": "string"
      }
    ],
    "commonalities": ["string"],
    "analysisSummary": "string",
    "createdAt": "ISO date"
  }
]
```

**Error Responses:**
- 404: Execution or cross-site analysis not found (may be single website)
- 403: Forbidden

---

### GET /api/executions/:executionId/original/:websiteIndex
Get original content for a specific website in an execution.

**Path Parameters:**
- `websiteIndex`: Zero-based index of the website (0, 1, 2, ...)

**Response (200):**
```json
{
  "websiteUrl": "string",
  "websiteIndex": 0,
  "contents": [
    {
      "keyword": "string",
      "found": true,
      "originalContent": {
        "id": "string",
        "retrievalResultId": "string",
        "contentType": "html" | "pdf" | "doc" | "docx",
        "rawContent": "string",
        "createdAt": "ISO date"
      }
    }
  ]
}
```

**Error Responses:**
- 400: Invalid website index
- 404: Execution not found or website index out of range
- 403: Forbidden

---

## Error Response Format

All error responses follow this format:

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": [/* Optional array of detailed errors */]
}
```

### Common Error Codes

- `UNAUTHORIZED`: Authentication failed or missing
- `FORBIDDEN`: User doesn't have access to the resource
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Request validation failed
- `INVALID_OPERATION`: Operation not allowed in current state
- `INTERNAL_ERROR`: Server error

---

## Middleware

### Authentication Middleware
- Validates JWT token from Authorization header
- Attaches user information to request object
- Returns 401 for invalid/missing tokens

### Error Handler Middleware
- Catches all errors and returns appropriate HTTP responses
- Logs errors for debugging
- Provides detailed error messages in development mode

### CORS Middleware
- Configured to allow requests from frontend origin
- Supports credentials for cookie-based authentication
