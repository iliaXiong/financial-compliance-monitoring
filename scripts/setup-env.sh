#!/bin/bash

# 环境变量设置脚本
# 用于快速配置 Railway 后端环境变量

set -e

echo "🚀 金融合规监测系统 - Railway 环境变量配置"
echo "================================================"
echo ""

# 检查是否安装了 Railway CLI
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI 未安装"
    echo "请运行: npm install -g @railway/cli"
    exit 1
fi

echo "✅ Railway CLI 已安装"
echo ""

# 提示用户输入配置
echo "请输入以下配置信息："
echo ""

read -p "Supabase 数据库 Host (例如: aws-0-ap-southeast-1.pooler.supabase.com): " DB_HOST
read -sp "Supabase 数据库密码: " DB_PASSWORD
echo ""

read -p "Upstash Redis Host (例如: your-redis.upstash.io): " REDIS_HOST
read -sp "Upstash Redis 密码: " REDIS_PASSWORD
echo ""

read -p "LLM API URL: " LLM_API_URL
read -sp "LLM API Key: " LLM_API_KEY
echo ""

read -p "LLM Model (默认: claude-sonnet-4): " LLM_MODEL
LLM_MODEL=${LLM_MODEL:-claude-sonnet-4}

# 生成 JWT Secret
JWT_SECRET=$(openssl rand -base64 32)

echo ""
echo "📝 配置摘要："
echo "  数据库: $DB_HOST"
echo "  Redis: $REDIS_HOST"
echo "  LLM Model: $LLM_MODEL"
echo "  JWT Secret: (已自动生成)"
echo ""

read -p "确认配置并部署到 Railway? (y/n): " CONFIRM

if [ "$CONFIRM" != "y" ]; then
    echo "❌ 已取消"
    exit 0
fi

echo ""
echo "🔧 正在设置环境变量..."

# 设置环境变量
railway variables set NODE_ENV=production
railway variables set PORT=3000
railway variables set TZ=Asia/Shanghai

railway variables set DB_HOST="$DB_HOST"
railway variables set DB_PORT=5432
railway variables set DB_NAME=postgres
railway variables set DB_USER=postgres
railway variables set DB_PASSWORD="$DB_PASSWORD"

railway variables set REDIS_HOST="$REDIS_HOST"
railway variables set REDIS_PORT=6379
railway variables set REDIS_PASSWORD="$REDIS_PASSWORD"

railway variables set JWT_SECRET="$JWT_SECRET"
railway variables set JWT_EXPIRES_IN=7d

railway variables set LLM_API_URL="$LLM_API_URL"
railway variables set LLM_API_KEY="$LLM_API_KEY"
railway variables set LLM_MODEL="$LLM_MODEL"
railway variables set LLM_API_KEY_HEADER=Authorization
railway variables set LLM_AUTH_PREFIX=Bearer

railway variables set JINA_READER_API_URL=https://r.jina.ai
railway variables set MAX_PARALLEL_WEBSITES=5
railway variables set RETRIEVAL_TIMEOUT_MS=30000
railway variables set ENABLE_WEBSITE_ANALYZER=false
railway variables set DEMO_MODE=false

echo ""
echo "✅ 环境变量设置完成！"
echo ""
echo "🚀 开始部署..."

cd backend
railway up

echo ""
echo "🎉 部署完成！"
echo ""
echo "下一步："
echo "1. 在 Railway Dashboard 生成域名"
echo "2. 测试健康检查: curl https://your-app.railway.app/health"
echo "3. 更新 vercel.json 中的后端 URL"
echo "4. 部署前端到 Vercel"
