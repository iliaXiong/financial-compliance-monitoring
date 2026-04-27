#!/bin/bash

# Render 部署脚本

set -e

echo "🚀 部署到 Render（免费）"
echo "=========================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}Render 是完全免费的，但有以下限制：${NC}"
echo "  - 15 分钟不活动后服务会休眠"
echo "  - 冷启动需要 30-60 秒"
echo "  - 每月 750 小时运行时间"
echo ""

read -p "继续部署到 Render? (y/n): " CONFIRM
if [ "$CONFIRM" != "y" ]; then
    exit 0
fi

echo ""
echo "📋 部署步骤："
echo ""
echo "1. 访问 https://render.com"
echo "2. 使用 GitHub 账号登录"
echo "3. 点击 'New +' → 'Web Service'"
echo "4. 连接你的 GitHub 仓库"
echo ""
echo "5. 配置服务："
echo "   - Name: financial-compliance-backend"
echo "   - Region: Singapore"
echo "   - Branch: main"
echo "   - Root Directory: backend"
echo "   - Runtime: Node"
echo "   - Build Command: npm install && npm run build"
echo "   - Start Command: npm start"
echo "   - Plan: Free"
echo ""
echo "6. 添加环境变量（点击 'Advanced'）："
echo ""

# 生成 JWT Secret
JWT_SECRET=$(openssl rand -base64 32)

echo "复制以下环境变量到 Render："
echo ""
echo "NODE_ENV=production"
echo "PORT=3000"
echo "TZ=Asia/Shanghai"
echo ""
read -p "Supabase DB_HOST: " DB_HOST
read -sp "Supabase DB_PASSWORD: " DB_PASSWORD
echo ""
read -p "Upstash REDIS_HOST: " REDIS_HOST
read -sp "Upstash REDIS_PASSWORD: " REDIS_PASSWORD
echo ""
read -p "LLM_API_URL: " LLM_API_URL
read -sp "LLM_API_KEY: " LLM_API_KEY
echo ""

echo ""
echo "=== 复制以下内容到 Render 环境变量 ==="
echo ""
cat << EOF
DB_HOST=$DB_HOST
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=$DB_PASSWORD

REDIS_HOST=$REDIS_HOST
REDIS_PORT=6379
REDIS_PASSWORD=$REDIS_PASSWORD

JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d

LLM_API_URL=$LLM_API_URL
LLM_API_KEY=$LLM_API_KEY
LLM_MODEL=claude-sonnet-4
LLM_API_KEY_HEADER=Authorization
LLM_AUTH_PREFIX=Bearer

JINA_READER_API_URL=https://r.jina.ai
MAX_PARALLEL_WEBSITES=5
RETRIEVAL_TIMEOUT_MS=30000
ENABLE_WEBSITE_ANALYZER=false
DEMO_MODE=false
EOF
echo ""
echo "=========================================="
echo ""

echo -e "${GREEN}✅ 配置信息已生成${NC}"
echo ""
echo "下一步："
echo "1. 在 Render Dashboard 添加上述环境变量"
echo "2. 点击 'Create Web Service'"
echo "3. 等待部署完成（约 5 分钟）"
echo "4. 获取 URL: https://your-app.onrender.com"
echo ""
