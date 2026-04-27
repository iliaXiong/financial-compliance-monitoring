# 启动服务指南

本文档提供多种启动服务的方式。

## 当前状态

✅ 配置文件已创建：
- `.env` - Docker Compose 配置
- `backend/.env` - 后端配置（已配置 Webull LLM API）
- `frontend/.env` - 前端配置

✅ 依赖已安装：
- Node.js v22.22.1
- 项目依赖已安装

❌ 需要安装：
- Docker（推荐）或 PostgreSQL + Redis

---

## 方式 1: 使用 Docker（最简单，推荐）

### 1. 安装 Docker Desktop

访问 https://www.docker.com/products/docker-desktop 下载并安装 Docker Desktop for Mac。

### 2. 启动 Docker Desktop

从应用程序中启动 Docker Desktop，等待它完全启动（菜单栏会显示 Docker 图标）。

### 3. 启动所有服务

```bash
# 在项目根目录执行
docker-compose up -d

# 查看服务状态
docker-compose ps

# 应该看到 4 个服务正在运行：
# - postgres (数据库)
# - redis (缓存)
# - backend (后端 API)
# - frontend (前端界面)
```

### 4. 初始化数据库

```bash
# 进入后端容器
docker-compose exec backend sh

# 运行数据库迁移
npm run migrate

# 退出容器
exit
```

### 5. 访问应用

- **前端界面**: http://localhost
- **后端 API**: http://localhost:3000
- **健康检查**: http://localhost:3000/health

### 6. 查看日志

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 7. 停止服务

```bash
# 停止所有服务
docker-compose down

# 停止并删除数据（慎用）
docker-compose down -v
```

---

## 方式 2: 使用 Homebrew 安装本地数据库

### 1. 安装 Homebrew（如果还没有）

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 2. 安装 PostgreSQL

```bash
# 安装 PostgreSQL 15
brew install postgresql@15

# 启动 PostgreSQL 服务
brew services start postgresql@15

# 验证安装
psql --version
```

### 3. 安装 Redis

```bash
# 安装 Redis
brew install redis

# 启动 Redis 服务
brew services start redis

# 验证安装
redis-cli ping
# 应该返回 PONG
```

### 4. 创建数据库

```bash
# 创建数据库
createdb financial_compliance

# 验证数据库创建成功
psql -l | grep financial_compliance
```

### 5. 运行数据库迁移

```bash
cd backend
npm run migrate
```

### 6. 启动后端服务

```bash
# 在 backend 目录
npm run dev

# 应该看到类似输出：
# Server running on port 3000
```

### 7. 启动前端服务（新终端）

```bash
# 打开新终端，进入 frontend 目录
cd frontend
npm run dev

# 应该看到类似输出：
# Local: http://localhost:5173/
```

### 8. 访问应用

- **前端界面**: http://localhost:5173
- **后端 API**: http://localhost:3000
- **健康检查**: http://localhost:3000/health

### 9. 停止服务

```bash
# 在各自的终端按 Ctrl+C 停止服务

# 停止数据库服务（可选）
brew services stop postgresql@15
brew services stop redis
```

---

## 方式 3: 使用云数据库服务

### 1. 注册云数据库服务

推荐的免费服务：
- **Supabase**: https://supabase.com (PostgreSQL)
- **Upstash**: https://upstash.com (Redis)
- **Railway**: https://railway.app (PostgreSQL + Redis)
- **Render**: https://render.com (PostgreSQL + Redis)

### 2. 获取数据库连接信息

从云服务提供商获取：
- PostgreSQL 连接字符串
- Redis 连接字符串

### 3. 更新 backend/.env

```bash
# 编辑 backend/.env
nano backend/.env

# 更新数据库配置
DB_HOST=your-postgres-host.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-password

# 更新 Redis 配置
REDIS_HOST=your-redis-host.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
```

### 4. 运行数据库迁移

```bash
cd backend
npm run migrate
```

### 5. 启动服务

按照方式 2 的步骤 6-8 启动后端和前端。

---

## 验证服务是否正常运行

### 1. 检查后端健康状态

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
  "timestamp": "2024-03-20T..."
}
```

### 2. 检查前端是否可访问

在浏览器中访问：
- Docker: http://localhost
- 本地开发: http://localhost:5173

应该看到登录/注册页面。

### 3. 测试 LLM API 配置

```bash
cd backend

# 创建测试脚本
cat > test-llm.js << 'EOF'
require('dotenv').config();

const testLLM = async () => {
  const apiUrl = process.env.LLM_API_URL;
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL;
  const apiKeyHeader = process.env.LLM_API_KEY_HEADER || 'Authorization';
  const authPrefix = process.env.LLM_AUTH_PREFIX || 'Bearer';

  console.log('测试 LLM API 配置...');
  console.log('URL:', apiUrl);
  console.log('Model:', model);
  console.log('');

  const headers = {
    'Content-Type': 'application/json'
  };
  headers[apiKeyHeader] = authPrefix ? `${authPrefix} ${apiKey}` : apiKey;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: [
          { role: 'user', content: '你好，请简单回复"测试成功"' }
        ],
        max_tokens: 50
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ 测试失败:', response.status, errorText);
      return;
    }

    const data = await response.json();
    console.log('✅ 测试成功!');
    console.log('响应:', data.choices[0].message.content);
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
};

testLLM();
EOF

# 运行测试
node test-llm.js
```

---

## 常见问题

### Q: Docker 启动失败，提示端口被占用

**解决方案**:
```bash
# 查看占用端口的进程
lsof -i :80    # 前端
lsof -i :3000  # 后端
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis

# 停止占用端口的进程或修改 docker-compose.yml 中的端口映射
```

### Q: 数据库迁移失败

**解决方案**:
```bash
# 检查数据库连接
psql -h localhost -U postgres -d financial_compliance

# 手动运行迁移脚本
cd backend/src/database/migrations
psql -h localhost -U postgres -d financial_compliance -f 001_create_users_table.sql
```

### Q: 后端启动失败，提示 LLM API 错误

**解决方案**:
1. 检查 `backend/.env` 中的 LLM 配置是否正确
2. 测试 LLM API 连接（使用上面的测试脚本）
3. 查看后端日志获取详细错误信息

### Q: 前端无法连接后端

**解决方案**:
1. 确认后端正在运行（访问 http://localhost:3000/health）
2. 检查 `frontend/.env` 中的 `VITE_API_BASE_URL` 配置
3. 检查浏览器控制台的 CORS 错误

---

## 下一步

服务启动成功后，您可以：

1. **注册账号**: 访问前端界面，创建新账号
2. **创建任务**: 创建第一个监测任务
3. **测试执行**: 手动触发任务执行
4. **查看结果**: 查看 AI 生成的总结和分析报告

详细使用说明请查看 [README.md](README.md)。

---

## 获取帮助

如果遇到问题：
1. 查看本文档的常见问题部分
2. 查看服务日志
3. 查看 [README.md](README.md) 和 [DEPLOYMENT.md](DEPLOYMENT.md)
4. 提交 Issue 并附上错误信息
