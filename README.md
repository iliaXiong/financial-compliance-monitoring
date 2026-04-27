# 金融合规政策监测系统

Financial Compliance Monitoring System - 自动化监测和追踪指定网站上的金融合规政策关键词变化。

---

## 🚀 快速部署到生产环境

**想要部署到线上？** 查看 **[快速部署指南 →](./快速部署指南.md)**

### 推荐方案：Render + Supabase + Vercel（完全免费）

- ✅ 前端部署到 Vercel（免费）
- ✅ 后端部署到 Render（免费）
- ✅ 数据库使用 Supabase PostgreSQL（免费 500MB）
- ✅ 使用 pg-boss 任务队列（无需 Redis）
- ⏱️ 20 分钟完成部署
- 💰 总成本：$0/月

```bash
# 一键部署
./scripts/deploy-render-supabase-vercel.sh
```

**详细文档**: [RENDER_SUPABASE_VERCEL_部署指南.md](./RENDER_SUPABASE_VERCEL_部署指南.md)

---

## 功能特性

✨ **核心功能**
- 🎯 创建和管理监测任务，支持多关键词、多网站监测
- ⏰ 灵活的定时调度（一次性、每日、每周、每月）
- 🚀 多网站并行检索，提高效率
- 📄 智能文档内容提取（支持 PDF、DOC 等格式）
- 📊 AI 驱动的内容总结和分析
- 🔍 历史对比分析，追踪政策变化
- 🌐 跨网站对比，识别不同来源的差异
- 📈 可视化结果展示和趋势分析

🎨 **用户体验**
- 简洁年轻化的界面设计
- 响应式布局，支持桌面和移动设备
- 实时任务状态更新
- 直观的差异高亮显示

## 项目结构

```
financial-compliance-monitoring/
├── backend/                 # 后端服务 (Node.js + Express + TypeScript)
│   ├── src/
│   │   ├── config/         # 配置文件 (数据库、Redis等)
│   │   ├── database/       # 数据库迁移脚本
│   │   └── index.ts        # 服务入口
│   ├── package.json
│   └── tsconfig.json
├── frontend/               # 前端应用 (React + TypeScript + Tailwind CSS)
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   └── tsconfig.json
├── package.json            # Monorepo 根配置
├── .eslintrc.json         # ESLint 配置
├── .prettierrc            # Prettier 配置
└── README.md
```

## 技术栈

### 后端
- **运行时**: Node.js
- **框架**: Express
- **语言**: TypeScript
- **数据库**: PostgreSQL
- **缓存/队列**: Redis + Bull
- **外部服务**: Jina Reader API, OpenAI API

### 前端
- **框架**: React 18
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **状态管理**: Zustand
- **路由**: React Router
- **构建工具**: Vite

## 环境要求

### 本地开发
- Node.js >= 18.x
- PostgreSQL >= 14.x
- Redis >= 6.x
- npm >= 9.x
- Docker & Docker Compose (可选，用于容器化部署)

### 生产部署
- Vercel 账号（前端托管，免费）
- Railway 账号（后端托管，$5/月）
- Supabase 账号（PostgreSQL 数据库，免费 500MB）
- Upstash 账号（Redis 服务，免费 10K 命令/天）

**📚 部署文档**: 查看 [README_DEPLOYMENT.md](./README_DEPLOYMENT.md) 了解如何部署到生产环境

## 安装和运行

> **💡 提示**: 如果你想部署到生产环境，请查看 [部署指南](./README_DEPLOYMENT.md)

### 方式一：Docker Compose（推荐，本地开发）

这是最简单的部署方式，适合生产环境和快速体验。

#### 1. 克隆项目

```bash
git clone <repository-url>
cd financial-compliance-monitoring
```

#### 2. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，填入必要的配置
# 必须配置：
# - JWT_SECRET: JWT 密钥（生产环境必须修改）
# - OPENAI_API_KEY: OpenAI API 密钥
nano .env
```

#### 3. 启动所有服务

```bash
# 构建并启动所有服务（PostgreSQL、Redis、后端、前端）
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

#### 4. 初始化数据库

```bash
# 进入后端容器
docker-compose exec backend sh

# 运行数据库迁移
npm run migrate

# 退出容器
exit
```

#### 5. 访问应用

- **前端界面**: http://localhost
- **后端 API**: http://localhost:3000
- **健康检查**: http://localhost:3000/health

#### 6. 停止服务

```bash
# 停止所有服务
docker-compose down

# 停止并删除数据卷（注意：会删除所有数据）
docker-compose down -v
```

### 方式二：本地开发环境

适合开发和调试。

#### 1. 安装依赖

```bash
# 安装所有依赖（根目录、前端、后端）
npm run install:all
```

#### 2. 启动数据库服务

```bash
# 使用 Docker Compose 只启动数据库和 Redis
docker-compose up -d postgres redis

# 或者使用本地安装的 PostgreSQL 和 Redis
```

#### 3. 配置环境变量

```bash
# 后端环境变量
cp backend/.env.example backend/.env
# 编辑 backend/.env 填入实际配置

# 前端环境变量
cp frontend/.env.example frontend/.env
# 编辑 frontend/.env 填入实际配置
```

#### 4. 初始化数据库

确保 PostgreSQL 服务已启动，然后运行迁移脚本：

```bash
# 创建数据库（如果使用本地 PostgreSQL）
createdb financial_compliance

# 运行迁移
cd backend
npm run migrate
cd ..
```

#### 5. 启动开发服务器

```bash
# 启动后端开发服务器 (端口 3000)
npm run dev:backend

# 在另一个终端启动前端开发服务器 (端口 5173)
npm run dev:frontend
```

#### 6. 访问应用

- **前端**: http://localhost:5173
- **后端 API**: http://localhost:3000
- **健康检查**: http://localhost:3000/health

## 开发命令

```bash
# 运行测试
npm test                    # 运行所有测试
npm run test --workspace=backend   # 只运行后端测试
npm run test --workspace=frontend  # 只运行前端测试

# 代码检查
npm run lint                # 检查所有代码
npm run lint --workspace=backend   # 只检查后端
npm run lint --workspace=frontend  # 只检查前端

# 代码格式化
npm run format              # 格式化所有代码

# 构建生产版本
npm run build:frontend      # 构建前端
npm run build:backend       # 构建后端

# 数据库迁移
cd backend
npm run migrate             # 运行数据库迁移
```

## 环境变量配置说明

### 后端环境变量 (backend/.env)

| 变量名 | 说明 | 默认值 | 必填 |
|--------|------|--------|------|
| `PORT` | 服务端口 | 3000 | 否 |
| `NODE_ENV` | 运行环境 | development | 否 |
| `DB_HOST` | 数据库主机 | localhost | 是 |
| `DB_PORT` | 数据库端口 | 5432 | 否 |
| `DB_NAME` | 数据库名称 | financial_compliance | 是 |
| `DB_USER` | 数据库用户 | postgres | 是 |
| `DB_PASSWORD` | 数据库密码 | postgres | 是 |
| `REDIS_HOST` | Redis 主机 | localhost | 是 |
| `REDIS_PORT` | Redis 端口 | 6379 | 否 |
| `REDIS_PASSWORD` | Redis 密码 | (空) | 否 |
| `JWT_SECRET` | JWT 密钥 | - | 是 |
| `JWT_EXPIRES_IN` | JWT 过期时间 | 7d | 否 |
| `JINA_READER_API_URL` | Jina Reader API 地址 | https://r.jina.ai | 否 |
| `OPENAI_API_KEY` | OpenAI API 密钥 | - | 条件必填* |
| `OPENAI_MODEL` | OpenAI 模型 | gpt-4 | 否 |
| `LLM_API_URL` | 自定义 LLM API 地址 | - | 条件必填* |
| `LLM_API_KEY` | 自定义 LLM API 密钥 | - | 条件必填* |
| `LLM_MODEL` | 自定义 LLM 模型 | - | 条件必填* |
| `LLM_API_KEY_HEADER` | LLM API 认证头名称 | Authorization | 否 |
| `LLM_AUTH_PREFIX` | LLM API 认证前缀 | Bearer | 否 |
| `MAX_PARALLEL_WEBSITES` | 最大并行网站数 | 5 | 否 |
| `RETRIEVAL_TIMEOUT_MS` | 检索超时时间(毫秒) | 30000 | 否 |

**注意**: 
- *条件必填: 必须配置 `OPENAI_API_KEY` 或 `LLM_API_KEY` 其中之一
- 如果同时配置了 OpenAI 和自定义 LLM，系统会优先使用自定义 LLM 配置
- 详细的 LLM 配置说明请查看 [LLM_CONFIGURATION.md](LLM_CONFIGURATION.md)

### 前端环境变量 (frontend/.env)

| 变量名 | 说明 | 默认值 | 必填 |
|--------|------|--------|------|
| `VITE_API_BASE_URL` | 后端 API 地址 | http://localhost:3000 | 是 |

### Docker Compose 环境变量 (.env)

| 变量名 | 说明 | 必填 |
|--------|------|------|
| `JWT_SECRET` | JWT 密钥（生产环境必须修改） | 是 |
| `OPENAI_API_KEY` | OpenAI API 密钥 | 是 |
| `OPENAI_MODEL` | OpenAI 模型 | 否 |

## 数据库表结构

系统包含以下数据表：

1. **users** - 用户表
   - 存储用户账号信息
   - 字段：id, email, password_hash, name, created_at, updated_at

2. **tasks** - 监测任务表
   - 存储监测任务配置
   - 字段：id, user_id, name, keywords, target_websites, schedule_type, schedule_time, status, etc.

3. **executions** - 执行记录表
   - 记录每次任务执行
   - 字段：id, task_id, status, start_time, end_time, error_message

4. **retrieval_results** - 检索结果表
   - 存储从网站检索到的内容
   - 字段：id, execution_id, website_url, keyword, found, content, context, source_url

5. **original_contents** - 原始内容表
   - 保存原始网页/文档内容
   - 字段：id, retrieval_result_id, content_type, raw_content

6. **summary_documents** - 总结文档表
   - 存储 AI 生成的总结
   - 字段：id, execution_id, content (Markdown), sources (JSON)

7. **comparison_reports** - 对比报告表
   - 存储历史对比结果
   - 字段：id, current_execution_id, previous_execution_id, website_url, keyword, changes (JSON)

8. **cross_site_analyses** - 跨网站分析表
   - 存储跨网站对比分析
   - 字段：id, execution_id, keyword, differences (JSON), commonalities (JSON)

详细的表结构定义请查看 `backend/src/database/migrations/` 目录。

## API 文档

完整的 API 文档请查看 [backend/API_ENDPOINTS.md](backend/API_ENDPOINTS.md)

### 主要 API 端点

#### 任务管理

```
POST   /api/tasks              创建监测任务
GET    /api/tasks              获取任务列表
GET    /api/tasks/:taskId      获取任务详情
PUT    /api/tasks/:taskId      更新任务
DELETE /api/tasks/:taskId      删除任务
PATCH  /api/tasks/:taskId/status  暂停/恢复任务
POST   /api/tasks/:taskId/execute 手动触发任务
```

#### 结果查询

```
GET /api/tasks/:taskId/executions        获取任务执行历史
GET /api/executions/:executionId         获取执行详情
GET /api/executions/:executionId/summary 获取总结文档
GET /api/executions/:executionId/comparison 获取对比报告
GET /api/executions/:executionId/cross-site 获取跨网站对比
GET /api/executions/:executionId/original/:websiteIndex 获取原始内容
```

#### 用户认证

```
POST /api/auth/register  用户注册
POST /api/auth/login     用户登录
GET  /api/auth/me        获取当前用户信息
```

## 使用指南

### 1. 创建监测任务

1. 登录系统后，进入"任务管理"页面
2. 点击"创建新任务"按钮
3. 填写任务信息：
   - **任务名称**: 给任务起一个描述性的名称
   - **关键词**: 输入要监测的金融合规术语（支持多个，用逗号分隔）
   - **目标网站**: 输入要监测的网站 URL（支持多个）
   - **执行计划**: 选择执行频率（一次性、每日、每周、每月）
4. 点击"创建"保存任务

### 2. 查看任务执行结果

1. 在"任务管理"页面，点击任务卡片查看详情
2. 在任务详情页，可以看到执行历史时间线
3. 点击某次执行记录，查看详细结果：
   - **总结文档**: AI 生成的关键词定义摘要
   - **对比报告**: 与上次执行的差异对比（如果有历史数据）
   - **跨网站对比**: 不同网站对同一关键词的解释差异
   - **原始内容**: 查看完整的原始网页内容

### 3. 管理任务

- **编辑任务**: 点击任务详情页的"编辑"按钮
- **暂停任务**: 点击"暂停"按钮，任务将不再自动执行
- **恢复任务**: 点击"恢复"按钮，任务将继续按计划执行
- **删除任务**: 点击"删除"按钮（历史执行记录会保留）
- **手动执行**: 点击"立即执行"按钮，立即触发一次检索

### 4. 理解结果

#### 总结文档
- 包含所有检索到的关键词定义的综合摘要
- 使用 Markdown 格式，便于阅读
- 包含信息来源引用

#### 对比报告
- **绿色高亮**: 新增的内容
- **红色高亮**: 删除的内容
- **黄色高亮**: 修改的内容

#### 跨网站对比
- 展示不同网站对同一关键词的不同解释
- 标识共同点和差异点
- 帮助理解不同监管机构的政策差异

## 测试策略

项目采用双重测试策略：

- **单元测试**: 验证特定示例和边缘情况
- **属性测试**: 使用 fast-check 验证通用属性

测试覆盖率目标：
- 整体代码覆盖率: >80%
- 核心业务逻辑: >90%

## 故障排除

### 常见问题

#### 1. Docker 容器启动失败

**问题**: `docker-compose up` 失败

**解决方案**:
```bash
# 检查端口占用
lsof -i :80    # 前端端口
lsof -i :3000  # 后端端口
lsof -i :5432  # PostgreSQL 端口
lsof -i :6379  # Redis 端口

# 清理并重新构建
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

#### 2. 数据库连接失败

**问题**: 后端无法连接到数据库

**解决方案**:
```bash
# 检查数据库服务状态
docker-compose ps postgres

# 查看数据库日志
docker-compose logs postgres

# 确保环境变量配置正确
cat backend/.env | grep DB_
```

#### 3. 前端无法访问后端 API

**问题**: 前端显示网络错误

**解决方案**:
- 检查 `frontend/.env` 中的 `VITE_API_BASE_URL` 配置
- 确保后端服务正在运行
- 检查浏览器控制台的 CORS 错误

#### 4. OpenAI API 调用失败

**问题**: 总结生成失败

**解决方案**:
- 确认 `OPENAI_API_KEY` 配置正确
- 检查 API 密钥是否有效
- 确认账户有足够的配额

#### 5. 任务执行超时

**问题**: 检索任务长时间运行

**解决方案**:
- 减少目标网站数量
- 增加 `RETRIEVAL_TIMEOUT_MS` 配置
- 检查目标网站是否可访问

### 日志查看

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
docker-compose logs -f redis

# 查看最近 100 行日志
docker-compose logs --tail=100 backend
```

## 性能优化建议

### 生产环境配置

1. **数据库优化**
   - 配置连接池大小
   - 添加适当的索引
   - 定期清理旧数据

2. **Redis 配置**
   - 配置持久化策略
   - 设置内存限制
   - 启用密码认证

3. **后端优化**
   - 启用 Gzip 压缩
   - 配置请求速率限制
   - 使用 PM2 进行进程管理

4. **前端优化**
   - 启用 CDN
   - 配置浏览器缓存
   - 使用代码分割

### 扩展性建议

- 使用负载均衡器分发请求
- 部署多个后端实例
- 使用 Redis Cluster 提高缓存性能
- 考虑使用消息队列处理大量任务

## 安全建议

1. **生产环境必须修改的配置**
   - `JWT_SECRET`: 使用强随机字符串
   - 数据库密码: 使用复杂密码
   - Redis 密码: 启用并配置强密码

2. **网络安全**
   - 使用 HTTPS
   - 配置防火墙规则
   - 限制数据库和 Redis 的外部访问

3. **应用安全**
   - 定期更新依赖包
   - 实施请求速率限制
   - 验证和清理用户输入
   - 使用 CSP (Content Security Policy)

## 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 代码规范

- 遵循 ESLint 和 Prettier 配置
- 编写单元测试和属性测试
- 更新相关文档
- 提交前运行 `npm run lint` 和 `npm test`

## 技术支持

如有问题或建议，请：
- 提交 Issue
- 查看项目文档
- 联系维护团队

## 许可证

MIT

---

**注意**: 本系统用于金融合规政策监测，请确保遵守相关法律法规和目标网站的使用条款。
