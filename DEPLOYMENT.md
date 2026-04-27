# 部署指南

本文档提供金融合规政策监测系统的详细部署说明。

## 目录

- [生产环境部署](#生产环境部署)
- [云平台部署](#云平台部署)
- [监控和维护](#监控和维护)
- [备份和恢复](#备份和恢复)
- [性能调优](#性能调优)

## 生产环境部署

### 前置要求

- Docker Engine 20.10+
- Docker Compose 2.0+
- 至少 2GB RAM
- 至少 10GB 磁盘空间
- 域名（可选，用于 HTTPS）

### 部署步骤

#### 1. 准备服务器

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 验证安装
docker --version
docker-compose --version
```

#### 2. 克隆项目

```bash
# 克隆代码
git clone <repository-url>
cd financial-compliance-monitoring

# 或者上传代码到服务器
scp -r ./financial-compliance-monitoring user@server:/path/to/deploy
```

#### 3. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量（重要！）
nano .env
```

**必须修改的配置**:

```bash
# 生成强随机 JWT 密钥
JWT_SECRET=$(openssl rand -base64 32)

# 配置 OpenAI API
OPENAI_API_KEY=sk-your-actual-api-key
OPENAI_MODEL=gpt-4

# 配置数据库密码（可选，建议修改）
POSTGRES_PASSWORD=your-strong-password
```

#### 4. 配置生产环境的 docker-compose

创建 `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: financial-compliance-db
    environment:
      POSTGRES_DB: financial_compliance
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgres}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app-network
    restart: always

  redis:
    image: redis:7-alpine
    container_name: financial-compliance-redis
    command: redis-server --requirepass ${REDIS_PASSWORD:-}
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app-network
    restart: always

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: financial-compliance-backend
    environment:
      NODE_ENV: production
      PORT: 3000
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: financial_compliance
      DB_USER: postgres
      DB_PASSWORD: ${POSTGRES_PASSWORD:-postgres}
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: ${REDIS_PASSWORD:-}
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRES_IN: 7d
      JINA_READER_API_URL: https://r.jina.ai
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      OPENAI_MODEL: ${OPENAI_MODEL:-gpt-4}
      MAX_PARALLEL_WEBSITES: 5
      RETRIEVAL_TIMEOUT_MS: 30000
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - app-network
    restart: always
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        VITE_API_BASE_URL: ${FRONTEND_API_URL:-http://localhost:3000}
    container_name: financial-compliance-frontend
    depends_on:
      - backend
    networks:
      - app-network
    restart: always
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  nginx:
    image: nginx:alpine
    container_name: financial-compliance-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - frontend
      - backend
    networks:
      - app-network
    restart: always

volumes:
  postgres_data:
  redis_data:

networks:
  app-network:
    driver: bridge
```

#### 5. 构建和启动服务

```bash
# 构建镜像
docker-compose -f docker-compose.prod.yml build

# 启动服务
docker-compose -f docker-compose.prod.yml up -d

# 查看服务状态
docker-compose -f docker-compose.prod.yml ps

# 查看日志
docker-compose -f docker-compose.prod.yml logs -f
```

#### 6. 初始化数据库

```bash
# 进入后端容器
docker-compose -f docker-compose.prod.yml exec backend sh

# 运行数据库迁移
npm run migrate

# 退出容器
exit
```

#### 7. 验证部署

```bash
# 检查健康状态
curl http://localhost:3000/health

# 访问前端
curl http://localhost
```

### HTTPS 配置（使用 Let's Encrypt）

#### 1. 安装 Certbot

```bash
sudo apt install certbot python3-certbot-nginx -y
```

#### 2. 获取 SSL 证书

```bash
# 停止 nginx 容器
docker-compose -f docker-compose.prod.yml stop nginx

# 获取证书
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# 证书将保存在 /etc/letsencrypt/live/your-domain.com/
```

#### 3. 配置 Nginx

创建 `nginx/nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:3000;
    }

    upstream frontend {
        server frontend:80;
    }

    # HTTP 重定向到 HTTPS
    server {
        listen 80;
        server_name your-domain.com www.your-domain.com;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS 配置
    server {
        listen 443 ssl http2;
        server_name your-domain.com www.your-domain.com;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;

        # 安全头
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;

        # 前端
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # 后端 API
        location /api {
            proxy_pass http://backend;
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
}
```

#### 4. 挂载证书并重启

```bash
# 创建 SSL 目录
mkdir -p nginx/ssl

# 复制证书
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/
sudo chmod 644 nginx/ssl/*

# 重启 nginx
docker-compose -f docker-compose.prod.yml restart nginx
```

#### 5. 自动续期

```bash
# 添加 cron 任务
sudo crontab -e

# 添加以下行（每月 1 号凌晨 2 点检查并续期）
0 2 1 * * certbot renew --quiet && cp /etc/letsencrypt/live/your-domain.com/*.pem /path/to/nginx/ssl/ && docker-compose -f /path/to/docker-compose.prod.yml restart nginx
```

## 云平台部署

### AWS 部署

#### 使用 ECS (Elastic Container Service)

1. **创建 ECR 仓库**
```bash
aws ecr create-repository --repository-name financial-compliance-backend
aws ecr create-repository --repository-name financial-compliance-frontend
```

2. **推送镜像**
```bash
# 登录 ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# 构建并推送
docker build -t financial-compliance-backend ./backend
docker tag financial-compliance-backend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/financial-compliance-backend:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/financial-compliance-backend:latest
```

3. **创建 RDS 和 ElastiCache**
   - RDS PostgreSQL 实例
   - ElastiCache Redis 集群

4. **配置 ECS 任务定义和服务**

### Google Cloud Platform 部署

#### 使用 Cloud Run

```bash
# 构建并推送到 GCR
gcloud builds submit --tag gcr.io/PROJECT_ID/financial-compliance-backend ./backend
gcloud builds submit --tag gcr.io/PROJECT_ID/financial-compliance-frontend ./frontend

# 部署到 Cloud Run
gcloud run deploy financial-compliance-backend \
  --image gcr.io/PROJECT_ID/financial-compliance-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated

gcloud run deploy financial-compliance-frontend \
  --image gcr.io/PROJECT_ID/financial-compliance-frontend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### Azure 部署

#### 使用 Azure Container Instances

```bash
# 创建资源组
az group create --name financial-compliance-rg --location eastus

# 创建容器注册表
az acr create --resource-group financial-compliance-rg --name financialcomplianceacr --sku Basic

# 推送镜像
az acr build --registry financialcomplianceacr --image financial-compliance-backend:latest ./backend
az acr build --registry financialcomplianceacr --image financial-compliance-frontend:latest ./frontend

# 部署容器
az container create \
  --resource-group financial-compliance-rg \
  --name financial-compliance-backend \
  --image financialcomplianceacr.azurecr.io/financial-compliance-backend:latest \
  --dns-name-label financial-compliance-backend \
  --ports 3000
```

## 监控和维护

### 日志管理

#### 使用 ELK Stack

```yaml
# 添加到 docker-compose.prod.yml
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.8.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    networks:
      - app-network

  logstash:
    image: docker.elastic.co/logstash/logstash:8.8.0
    volumes:
      - ./logstash/config:/usr/share/logstash/pipeline
    depends_on:
      - elasticsearch
    networks:
      - app-network

  kibana:
    image: docker.elastic.co/kibana/kibana:8.8.0
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch
    networks:
      - app-network
```

### 性能监控

#### 使用 Prometheus + Grafana

```yaml
# 添加到 docker-compose.prod.yml
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
    ports:
      - "9090:9090"
    networks:
      - app-network

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
    depends_on:
      - prometheus
    networks:
      - app-network
```

### 健康检查脚本

创建 `scripts/health-check.sh`:

```bash
#!/bin/bash

# 健康检查脚本
BACKEND_URL="http://localhost:3000/health"
FRONTEND_URL="http://localhost"

# 检查后端
if curl -f -s -o /dev/null "$BACKEND_URL"; then
    echo "✓ Backend is healthy"
else
    echo "✗ Backend is down"
    # 发送告警
    # curl -X POST "https://hooks.slack.com/services/YOUR/WEBHOOK/URL" \
    #   -d '{"text":"Backend is down!"}'
fi

# 检查前端
if curl -f -s -o /dev/null "$FRONTEND_URL"; then
    echo "✓ Frontend is healthy"
else
    echo "✗ Frontend is down"
fi
```

添加到 crontab:
```bash
*/5 * * * * /path/to/scripts/health-check.sh
```

## 备份和恢复

### 数据库备份

#### 自动备份脚本

创建 `scripts/backup-db.sh`:

```bash
#!/bin/bash

BACKUP_DIR="/backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份数据库
docker-compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U postgres financial_compliance > $BACKUP_FILE

# 压缩备份
gzip $BACKUP_FILE

# 删除 7 天前的备份
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: ${BACKUP_FILE}.gz"
```

添加到 crontab（每天凌晨 3 点备份）:
```bash
0 3 * * * /path/to/scripts/backup-db.sh
```

#### 恢复数据库

```bash
# 解压备份
gunzip backup_20240115_030000.sql.gz

# 恢复数据库
docker-compose -f docker-compose.prod.yml exec -T postgres \
  psql -U postgres financial_compliance < backup_20240115_030000.sql
```

### Redis 备份

```bash
# 手动触发 Redis 保存
docker-compose -f docker-compose.prod.yml exec redis redis-cli SAVE

# 复制 RDB 文件
docker cp financial-compliance-redis:/data/dump.rdb ./backups/redis/dump_$(date +%Y%m%d).rdb
```

## 性能调优

### PostgreSQL 优化

编辑 `postgresql.conf`:

```conf
# 连接设置
max_connections = 100
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 2621kB
min_wal_size = 1GB
max_wal_size = 4GB
```

### Redis 优化

```conf
# redis.conf
maxmemory 256mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

### Node.js 后端优化

```javascript
// 使用 PM2 进程管理
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'financial-compliance-backend',
    script: './dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
```

### Nginx 优化

```nginx
# nginx.conf
worker_processes auto;
worker_rlimit_nofile 65535;

events {
    worker_connections 4096;
    use epoll;
    multi_accept on;
}

http {
    # 启用 Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # 缓存配置
    proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=1g inactive=60m;
    proxy_cache_key "$scheme$request_method$host$request_uri";

    # 连接超时
    keepalive_timeout 65;
    client_max_body_size 10M;
}
```

## 故障恢复

### 服务重启

```bash
# 重启所有服务
docker-compose -f docker-compose.prod.yml restart

# 重启特定服务
docker-compose -f docker-compose.prod.yml restart backend

# 强制重新创建容器
docker-compose -f docker-compose.prod.yml up -d --force-recreate
```

### 回滚部署

```bash
# 查看镜像历史
docker images

# 使用旧版本镜像
docker-compose -f docker-compose.prod.yml down
docker tag financial-compliance-backend:old financial-compliance-backend:latest
docker-compose -f docker-compose.prod.yml up -d
```

## 安全加固

### 防火墙配置

```bash
# 使用 ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 定期更新

```bash
# 更新系统包
sudo apt update && sudo apt upgrade -y

# 更新 Docker 镜像
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

### 安全扫描

```bash
# 使用 Trivy 扫描镜像漏洞
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image financial-compliance-backend:latest
```

---

**注意**: 请根据实际生产环境调整配置参数。定期检查日志和监控指标，确保系统稳定运行。
