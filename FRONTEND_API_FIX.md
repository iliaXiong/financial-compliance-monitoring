# 前端 API 连接问题修复

## 问题描述

启动服务后，前端页面显示以下错误：
- "获取任务列表失败"
- "获取最新执行记录失败"

## 根本原因

1. **Redis 和 PostgreSQL 服务未启动**
   - Redis 容器状态：Exited (255)
   - PostgreSQL 容器状态：Exited (255)
   - 后端无法连接到这些服务，导致启动失败

2. **前端 API 配置问题**
   - `docker-compose.yml` 中 `VITE_API_BASE_URL` 设置为 `http://localhost:3000`
   - 这会导致浏览器端跨域问题（CORS）
   - 正确的做法是使用空字符串，让前端通过 nginx 代理访问后端

## 解决步骤

### 1. 重启所有服务

```bash
# 停止所有服务
docker-compose down

# 启动所有服务
docker-compose up -d
```

### 2. 修复前端 API 配置

修改 `docker-compose.yml` 中的前端环境变量：

```yaml
frontend:
  environment:
    VITE_API_BASE_URL: ""  # 改为空字符串，使用相对路径
```

### 3. 重新构建前端镜像

```bash
# 重新构建前端
docker-compose build frontend

# 重启前端服务
docker-compose up -d frontend
```

## 验证

### 1. 检查服务状态

```bash
docker-compose ps
```

所有服务应该显示为 healthy 或 running：
- backend: Up (healthy)
- postgres: Up (healthy)
- redis: Up (healthy)
- frontend: Up

### 2. 测试 API 端点

```bash
# 测试健康检查
curl http://localhost:3000/health

# 测试任务列表（通过 nginx 代理）
curl -H "Authorization: Bearer test-token" http://localhost/api/tasks

# 测试最新执行记录（通过 nginx 代理）
curl -H "Authorization: Bearer test-token" http://localhost/api/executions/latest
```

### 3. 访问前端页面

打开浏览器访问 http://localhost

- 任务管理页面应该显示任务列表
- 结果查看页面应该显示最新执行记录

## 技术细节

### Nginx 代理配置

前端 nginx 配置了 API 代理（`frontend/nginx.conf`）：

```nginx
location /api {
    proxy_pass http://backend:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

这样，浏览器访问 `http://localhost/api/*` 时，nginx 会将请求转发到后端容器的 `http://backend:3000/api/*`。

### 前端 API 客户端

前端代码（`frontend/src/services/api.ts`）默认使用空字符串作为 API_BASE_URL：

```typescript
const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '';
```

这意味着：
- 如果 `VITE_API_BASE_URL` 为空或未设置，使用相对路径
- API 请求会发送到 `http://localhost/api/*`（与前端同域）
- 通过 nginx 代理转发到后端，避免跨域问题

## 注意事项

1. **环境变量在构建时生效**
   - Vite 的环境变量在构建时被替换到代码中
   - 修改 `docker-compose.yml` 后需要重新构建镜像

2. **Demo 模式认证**
   - 当前使用 `DEMO_MODE=true`
   - 测试 token 为 `test-token`
   - 生产环境需要实现真正的 JWT 认证

3. **服务依赖**
   - 后端依赖 PostgreSQL 和 Redis
   - 如果这些服务未启动，后端会一直重启
   - 使用 `docker-compose logs backend` 查看错误日志

## 相关文件

- `docker-compose.yml` - Docker 服务配置
- `frontend/nginx.conf` - Nginx 代理配置
- `frontend/src/services/api.ts` - 前端 API 客户端
- `backend/src/routes/results.ts` - 后端结果查询路由
- `backend/src/routes/tasks.ts` - 后端任务管理路由
