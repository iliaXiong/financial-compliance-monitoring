# 不使用 Railway 的部署方案

如果你不想使用 Railway（$5/月），这里有几个替代方案。

---

## 方案对比

| 方案 | 成本 | 优点 | 缺点 | 推荐度 |
|------|------|------|------|--------|
| **Render 免费层** | 免费 | 完全免费 | 15分钟不活动后休眠 | ⭐⭐⭐⭐ |
| **Fly.io** | 免费 | 不休眠，性能好 | 配置稍复杂 | ⭐⭐⭐⭐⭐ |
| **自己的 VPS** | $3-5/月 | 完全控制 | 需要运维 | ⭐⭐⭐ |
| **Vercel Serverless** | 免费 | 与前端同平台 | 需要改造代码 | ⭐⭐ |

---

## 🎯 方案一：Render 免费层（推荐，完全免费）

### 优点
- ✅ 完全免费
- ✅ 配置简单
- ✅ 自动 HTTPS
- ✅ 自动部署

### 缺点
- ⚠️ 15 分钟不活动后服务休眠
- ⚠️ 冷启动需要 30-60 秒
- ⚠️ 每月 750 小时运行时间限制

### 适合场景
- 个人项目
- 演示项目
- 低频使用的应用

### 部署步骤

#### 1. 准备 Supabase 和 Upstash

按照之前的步骤创建：
- Supabase PostgreSQL（免费）
- Upstash Redis（免费）

运行数据库迁移：
```bash
export DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com
export DB_PASSWORD=your-password
cd backend && npm run migrate && cd ..
```

#### 2. 创建 render.yaml 配置

我已经为你创建了配置文件（见下方）。

#### 3. 部署到 Render

**方式 A：通过 Dashboard（推荐）**

1. 访问 https://render.com
2. 使用 GitHub 账号登录
3. 点击 "New +" → "Web Service"
4. 连接你的 GitHub 仓库
5. 配置：
   - **Name**: `financial-compliance-backend`
   - **Region**: Singapore
   - **Branch**: main
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free

6. 添加环境变量（点击 "Advanced" → "Add Environment Variable"）：
   ```
   NODE_ENV=production
   PORT=3000
   TZ=Asia/Shanghai
   
   DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com
   DB_PORT=5432
   DB_NAME=postgres
   DB_USER=postgres
   DB_PASSWORD=your-supabase-password
   
   REDIS_HOST=your-redis.upstash.io
   REDIS_PORT=6379
   REDIS_PASSWORD=your-upstash-password
   
   JWT_SECRET=生成一个随机字符串
   JWT_EXPIRES_IN=7d
   
   LLM_API_URL=your-llm-url
   LLM_API_KEY=your-llm-key
   LLM_MODEL=claude-sonnet-4
   LLM_API_KEY_HEADER=Authorization
   LLM_AUTH_PREFIX=Bearer
   
   JINA_READER_API_URL=https://r.jina.ai
   MAX_PARALLEL_WEBSITES=5
   RETRIEVAL_TIMEOUT_MS=30000
   ENABLE_WEBSITE_ANALYZER=false
   ```

7. 点击 "Create Web Service"

**方式 B：使用 render.yaml（自动化）**

1. 确保 `render.yaml` 在项目根目录
2. 在 Render Dashboard 点击 "New +" → "Blueprint"
3. 连接仓库并选择 `render.yaml`
4. 设置环境变量
5. 点击 "Apply"

#### 4. 获取 URL

部署完成后，Render 会提供一个 URL：
```
https://financial-compliance-backend.onrender.com
```

#### 5. 验证部署

```bash
curl https://your-app.onrender.com/health
```

### 解决冷启动问题

Render 免费层会在 15 分钟不活动后休眠。你可以：

**选项 1：使用 Cron Job 保持唤醒**

创建一个免费的 Cron 服务（如 cron-job.org）每 10 分钟访问一次：
```
https://your-app.onrender.com/health
```

**选项 2：升级到付费计划**

Render Starter 计划：$7/月，不会休眠。

---

## 🚀 方案二：Fly.io（推荐，免费且不休眠）

### 优点
- ✅ 完全免费（有额度限制）
- ✅ 不会休眠
- ✅ 全球 CDN
- ✅ 性能优秀

### 缺点
- ⚠️ 配置稍复杂
- ⚠️ 需要信用卡验证（不会扣费）

### 免费额度
- 3 个共享 CPU VM（256MB RAM）
- 3GB 持久化存储
- 160GB 出站流量/月

### 部署步骤

#### 1. 安装 Fly CLI

```bash
# macOS
brew install flyctl

# 或使用 curl
curl -L https://fly.io/install.sh | sh

# 验证安装
flyctl version
```

#### 2. 登录 Fly.io

```bash
flyctl auth login
```

#### 3. 初始化项目

```bash
cd backend
flyctl launch

# 按提示操作：
# - App name: financial-compliance-backend
# - Region: Singapore (sin)
# - PostgreSQL: No (我们用 Supabase)
# - Redis: No (我们用 Upstash)
# - Deploy now: No
```

这会创建 `fly.toml` 配置文件。

#### 4. 配置 fly.toml

我已经为你创建了配置文件（见下方）。

#### 5. 设置环境变量

```bash
# 设置所有环境变量
flyctl secrets set \
  NODE_ENV=production \
  PORT=3000 \
  TZ=Asia/Shanghai \
  DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com \
  DB_PORT=5432 \
  DB_NAME=postgres \
  DB_USER=postgres \
  DB_PASSWORD=your-supabase-password \
  REDIS_HOST=your-redis.upstash.io \
  REDIS_PORT=6379 \
  REDIS_PASSWORD=your-upstash-password \
  JWT_SECRET=$(openssl rand -base64 32) \
  JWT_EXPIRES_IN=7d \
  LLM_API_URL=your-llm-url \
  LLM_API_KEY=your-llm-key \
  LLM_MODEL=claude-sonnet-4 \
  LLM_API_KEY_HEADER=Authorization \
  LLM_AUTH_PREFIX=Bearer \
  JINA_READER_API_URL=https://r.jina.ai \
  MAX_PARALLEL_WEBSITES=5 \
  RETRIEVAL_TIMEOUT_MS=30000 \
  ENABLE_WEBSITE_ANALYZER=false
```

#### 6. 部署

```bash
flyctl deploy
```

#### 7. 获取 URL

```bash
flyctl info

# 或直接访问
# https://financial-compliance-backend.fly.dev
```

#### 8. 查看日志

```bash
flyctl logs
```

---

## 💻 方案三：自己的 VPS

### 适合场景
- 需要完全控制
- 有运维经验
- 想要最佳性能

### 推荐 VPS 提供商

| 提供商 | 价格 | 配置 | 推荐度 |
|--------|------|------|--------|
| **Vultr** | $3.5/月 | 1 CPU, 512MB RAM | ⭐⭐⭐⭐ |
| **DigitalOcean** | $4/月 | 1 CPU, 512MB RAM | ⭐⭐⭐⭐⭐ |
| **Linode** | $5/月 | 1 CPU, 1GB RAM | ⭐⭐⭐⭐ |
| **阿里云** | ¥9.9/月 | 1 CPU, 1GB RAM | ⭐⭐⭐⭐ |

### 部署步骤

#### 1. 创建 VPS

选择：
- **OS**: Ubuntu 22.04 LTS
- **Region**: Singapore 或 Tokyo
- **Size**: 最小配置即可

#### 2. 连接到 VPS

```bash
ssh root@your-vps-ip
```

#### 3. 安装依赖

```bash
# 更新系统
apt update && apt upgrade -y

# 安装 Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# 安装 PM2（进程管理器）
npm install -g pm2

# 安装 Nginx（反向代理）
apt install -y nginx

# 验证安装
node --version
npm --version
pm2 --version
```

#### 4. 部署代码

```bash
# 克隆代码
cd /var/www
git clone your-repo-url financial-compliance
cd financial-compliance/backend

# 安装依赖
npm install

# 构建
npm run build

# 创建环境变量文件
cat > .env << EOF
NODE_ENV=production
PORT=3000
TZ=Asia/Shanghai

DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-password

REDIS_HOST=your-redis.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=your-password

JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRES_IN=7d

LLM_API_URL=your-url
LLM_API_KEY=your-key
LLM_MODEL=claude-sonnet-4
LLM_API_KEY_HEADER=Authorization
LLM_AUTH_PREFIX=Bearer

JINA_READER_API_URL=https://r.jina.ai
MAX_PARALLEL_WEBSITES=5
RETRIEVAL_TIMEOUT_MS=30000
ENABLE_WEBSITE_ANALYZER=false
EOF
```

#### 5. 使用 PM2 启动

```bash
# 启动应用
pm2 start dist/index.js --name financial-compliance-backend

# 设置开机自启
pm2 startup
pm2 save

# 查看状态
pm2 status

# 查看日志
pm2 logs
```

#### 6. 配置 Nginx

```bash
# 创建 Nginx 配置
cat > /etc/nginx/sites-available/financial-compliance << 'EOF'
server {
    listen 80;
    server_name your-domain.com;  # 或使用 IP

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# 启用配置
ln -s /etc/nginx/sites-available/financial-compliance /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

#### 7. 配置 HTTPS（可选但推荐）

```bash
# 安装 Certbot
apt install -y certbot python3-certbot-nginx

# 获取 SSL 证书
certbot --nginx -d your-domain.com

# 自动续期
certbot renew --dry-run
```

#### 8. 配置防火墙

```bash
# 允许 HTTP/HTTPS
ufw allow 80
ufw allow 443
ufw allow 22  # SSH
ufw enable
```

---

## 📊 方案对比总结

### 完全免费方案

```
Vercel (前端) + Render (后端) + Supabase + Upstash
总成本: $0/月
```

**优点**: 完全免费
**缺点**: 后端会休眠

### 最佳性价比方案

```
Vercel (前端) + Fly.io (后端) + Supabase + Upstash
总成本: $0/月（在免费额度内）
```

**优点**: 免费且不休眠
**缺点**: 需要信用卡验证

### 最稳定方案

```
Vercel (前端) + VPS (后端) + Supabase + Upstash
总成本: $3-5/月
```

**优点**: 完全控制，性能最好
**缺点**: 需要运维知识

---

## 🎯 我的推荐

### 如果你是个人项目/演示
→ 使用 **Render 免费层**

### 如果你想要最佳体验且不想付费
→ 使用 **Fly.io**

### 如果你有运维经验且想要完全控制
→ 使用 **VPS**

---

## 📝 下一步

选择一个方案后：

1. **Render**: 运行 `./scripts/deploy-render.sh`
2. **Fly.io**: 运行 `./scripts/deploy-flyio.sh`
3. **VPS**: 查看 `DEPLOY_VPS.md`

我可以为你创建对应的部署脚本和详细文档。你想使用哪个方案？
