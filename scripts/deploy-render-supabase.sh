#!/bin/bash

# Render + Supabase 部署脚本（只用 PostgreSQL，不需要 Redis）

set -e

echo "🚀 部署到 Render + Supabase（完全免费）"
echo "========================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}这个方案使用 PostgreSQL 替代 Redis + BullMQ${NC}"
echo "优点："
echo "  ✅ 完全免费（只需 Supabase）"
echo "  ✅ 架构更简单"
echo "  ✅ 配置更少"
echo ""

read -p "继续部署? (y/n): " CONFIRM
if [ "$CONFIRM" != "y" ]; then
    exit 0
fi

echo ""
echo "📋 第一步：Supabase 配置"
echo "========================"
echo ""
echo "请先在浏览器中完成："
echo "1. 访问 https://supabase.com"
echo "2. 创建项目: financial-compliance-monitoring"
echo "3. 设置数据库密码并保存"
echo "4. 获取连接信息"
echo ""
read -p "完成后按 Enter 继续..."
echo ""

read -p "Supabase DB_HOST (例如: aws-0-ap-southeast-1.pooler.supabase.com): " DB_HOST
read -sp "Supabase DB_PASSWORD: " DB_PASSWORD
echo ""

if [ -z "$DB_HOST" ] || [ -z "$DB_PASSWORD" ]; then
    echo -e "${RED}❌ 数据库信息不能为空${NC}"
    exit 1
fi

echo ""
echo "📋 第二步：运行数据库迁移"
echo "========================"
echo ""

export DB_HOST="$DB_HOST"
export DB_PORT=5432
export DB_NAME=postgres
export DB_USER=postgres
export DB_PASSWORD="$DB_PASSWORD"

echo "正在运行数据库迁移..."
cd backend
npm install
npm run migrate

echo ""
echo -e "${GREEN}✅ 数据库迁移完成${NC}"
echo ""

cd ..

echo "📋 第三步：LLM 配置"
echo "=================="
echo ""

read -p "LLM_API_URL: " LLM_API_URL
read -sp "LLM_API_KEY: " LLM_API_KEY
echo ""

# 生成 JWT Secret
JWT_SECRET=$(openssl rand -base64 32)

echo ""
echo "📋 第四步：Render 部署"
echo "====================="
echo ""

echo "请在 Render Dashboard 完成以下操作："
echo ""
echo "1. 访问 https://render.com"
echo "2. 点击 'New +' → 'Web Service'"
echo "3. 连接你的 GitHub 仓库"
echo ""
echo "4. 配置服务："
echo "   - Name: financial-compliance-backend"
echo "   - Region: Singapore"
echo "   - Branch: main"
echo "   - Root Directory: backend"
echo "   - Runtime: Node"
echo "   - Build Command: npm install && npm run build"
echo "   - Start Command: node dist/index.pgboss.js"
echo "   - Plan: Free"
echo ""
echo "5. 添加环境变量（复制以下内容）："
echo ""
echo "=========================================="
cat << EOF
NODE_ENV=production
PORT=3000
TZ=Asia/Shanghai

DB_HOST=$DB_HOST
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=$DB_PASSWORD

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
echo "=========================================="
echo ""

echo -e "${GREEN}✅ 配置信息已生成${NC}"
echo ""
echo "📝 重要提示："
echo "  - 不需要 REDIS_HOST、REDIS_PORT、REDIS_PASSWORD"
echo "  - 使用 PostgreSQL 作为任务队列（pg-boss）"
echo "  - Start Command 必须是: node dist/index.pgboss.js"
echo ""
echo "下一步："
echo "1. 在 Render 添加上述环境变量"
echo "2. 点击 'Create Web Service'"
echo "3. 等待部署完成（约 5 分钟）"
echo "4. 测试: curl https://your-app.onrender.com/health"
echo ""

echo -e "${GREEN}🎉 配置完成！${NC}"
