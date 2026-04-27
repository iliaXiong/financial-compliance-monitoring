# 快速开始指南

本指南将帮助您在 5 分钟内启动金融合规政策监测系统。

## 前置要求

确保您的系统已安装：

- **Node.js** >= 18.x ([下载](https://nodejs.org/))
- **PostgreSQL** >= 14.x ([下载](https://www.postgresql.org/download/))
- **Redis** >= 6.x ([下载](https://redis.io/download))

或者使用 Docker Compose（推荐）：

- **Docker** ([下载](https://www.docker.com/get-started))
- **Docker Compose** (通常随 Docker 一起安装)

## 方案 A: 使用 Docker Compose (推荐)

### 1. 克隆项目并安装依赖

```bash
# 运行自动设置脚本
# Linux/Mac:
./scripts/setup.sh

# Windows:
scripts\setup.bat
```

### 2. 启动数据库服务

```bash
docker-compose up -d
```

这将启动 PostgreSQL 和 Redis 容器。

### 3. 运行数据库迁移

```bash
cd backend
npm run migrate
cd ..
```

### 4. 启动应用

在两个不同的终端窗口中：

```bash
# 终端 1: 启动后端
npm run dev:backend

# 终端 2: 启动前端
npm run dev:frontend
```

### 5. 访问应用

- **前端**: http://localhost:5173
- **后端 API**: http://localhost:3000
- **健康检查**: http://localhost:3000/health

## 方案 B: 本地安装数据库

### 1. 安装依赖

```bash
# Linux/Mac:
./scripts/setup.sh

# Windows:
scripts\setup.bat
```

### 2. 启动 PostgreSQL 和 Redis

确保 PostgreSQL 和 Redis 服务正在运行。

### 3. 创建数据库

```bash
# 使用 psql 或其他工具创建数据库
createdb financial_compliance

# 或使用 psql
psql -U postgres -c "CREATE DATABASE financial_compliance;"
```

### 4. 配置环境变量

编辑 `backend/.env` 文件，确保数据库连接信息正确：

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=financial_compliance
DB_USER=postgres
DB_PASSWORD=your_password

REDIS_HOST=localhost
REDIS_PORT=6379
```

### 5. 运行数据库迁移

```bash
cd backend
npm run migrate
cd ..
```

### 6. 启动应用

```bash
# 终端 1: 启动后端
npm run dev:backend

# 终端 2: 启动前端
npm run dev:frontend
```

## 验证安装

### 检查后端健康状态

```bash
curl http://localhost:3000/health
```

应该返回：

```json
{
  "status": "healthy",
  "services": {
    "database": "up",
    "redis": "up"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 检查前端

在浏览器中访问 http://localhost:5173，应该看到系统首页。

## 常见问题

### 端口已被占用

如果端口 3000 或 5173 已被占用，可以修改：

- **后端端口**: 编辑 `backend/.env` 中的 `PORT`
- **前端端口**: 编辑 `frontend/vite.config.ts` 中的 `server.port`

### 数据库连接失败

1. 确认 PostgreSQL 服务正在运行
2. 检查 `backend/.env` 中的数据库配置
3. 确认数据库已创建

### Redis 连接失败

1. 确认 Redis 服务正在运行
2. 检查 `backend/.env` 中的 Redis 配置

### 迁移失败

如果迁移失败，可以手动运行 SQL 文件：

```bash
psql -U postgres -d financial_compliance -f backend/src/database/migrations/001_create_users_table.sql
# 依次运行其他迁移文件...
```

## 下一步

- 查看 [README.md](./README.md) 了解项目详细信息
- 查看 [设计文档](./.kiro/specs/financial-compliance-monitoring/design.md) 了解系统架构
- 查看 [需求文档](./.kiro/specs/financial-compliance-monitoring/requirements.md) 了解功能需求

## 停止服务

### 停止应用

在运行 `npm run dev:backend` 和 `npm run dev:frontend` 的终端中按 `Ctrl+C`。

### 停止 Docker 容器

```bash
docker-compose down
```

### 清理数据（可选）

```bash
# 删除 Docker 卷（会删除所有数据）
docker-compose down -v
```

## 获取帮助

如果遇到问题，请检查：

1. Node.js 版本是否 >= 18.x
2. 所有依赖是否正确安装
3. 数据库和 Redis 是否正在运行
4. 环境变量配置是否正确

祝您使用愉快！
