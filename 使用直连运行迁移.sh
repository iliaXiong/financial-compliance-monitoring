#!/bin/bash

# 使用直连模式运行迁移（仅用于本地迁移）
# Render 部署时仍然使用 Connection Pooler

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "使用直连模式运行数据库迁移"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  请确保输入正确的 Reference ID（不是项目名称）"
echo "   如何获取：Settings → General → Reference ID"
echo "   格式：16 个小写字母，如 'abcdefghijklmnop'"
echo ""

read -p "请输入 Supabase Reference ID: " PROJECT_ID
echo ""

if [ -z "$PROJECT_ID" ]; then
    echo "❌ Reference ID 不能为空"
    exit 1
fi

if [ ${#PROJECT_ID} -ne 20 ]; then
    echo "⚠️  警告：Reference ID 通常是 20 个字符"
    echo "   你输入的是：$PROJECT_ID (${#PROJECT_ID} 个字符)"
    read -p "确定继续吗？(y/N): " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo "已取消"
        exit 0
    fi
fi

read -sp "请输入数据库密码: " DB_PASSWORD
echo ""
echo ""

if [ -z "$DB_PASSWORD" ]; then
    echo "❌ 密码不能为空"
    exit 1
fi

# 使用直连模式（端口 5432）
export DB_HOST="db.${PROJECT_ID}.supabase.co"
export DB_PORT="5432"
export DB_NAME="postgres"
export DB_USER="postgres"
export DB_PASSWORD="$DB_PASSWORD"

echo "数据库配置（直连模式）："
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  User: $DB_USER"
echo ""

echo "正在运行迁移..."
cd backend
npm run migrate

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 数据库迁移成功！"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "重要：Render 部署时使用 Connection Pooler"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "在 Render 环境变量中使用以下配置："
    echo ""
    echo "DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com"
    echo "DB_PORT=6543"
    echo "DB_NAME=postgres"
    echo "DB_USER=postgres.$PROJECT_ID"
    echo "DB_PASSWORD=$DB_PASSWORD"
    echo ""
    
    # 保存 Render 配置
    JWT_SECRET=$(cat ../.jwt_secret.txt 2>/dev/null || openssl rand -base64 32)
    
    cat > ../.render-env.txt << EOF
NODE_ENV=production
PORT=3000
TZ=Asia/Shanghai

DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com
DB_PORT=6543
DB_NAME=postgres
DB_USER=postgres.$PROJECT_ID
DB_PASSWORD=$DB_PASSWORD

JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d

LLM_API_URL=https://office.webullbroker.com/api/oa-ai/open/chat/completions
LLM_API_KEY=dcb0d1c8-82c7-478f-bd9a-7c3023cac4d8
LLM_MODEL=us.anthropic.claude-sonnet-4-20250514-v1:0
LLM_API_KEY_HEADER=authorization
LLM_AUTH_PREFIX=Bearer

JINA_READER_API_URL=https://r.jina.ai
MAX_PARALLEL_WEBSITES=5
RETRIEVAL_TIMEOUT_MS=30000
ENABLE_WEBSITE_ANALYZER=true
DEMO_MODE=false
EOF
    
    echo "💾 Render 环境变量已保存到 .render-env.txt"
    echo ""
    echo "现在可以继续部署："
    echo "  1. 在 Render 创建 Web Service"
    echo "  2. 复制 .render-env.txt 中的环境变量到 Render"
    echo "  3. 部署前端到 Vercel"
    echo ""
else
    echo ""
    echo "❌ 迁移失败"
    echo ""
    echo "请检查："
    echo "  1. 数据库密码是否正确"
    echo "  2. Supabase 项目是否已完全创建（等待 2-3 分钟）"
    echo "  3. 网络连接是否正常"
    echo ""
    exit 1
fi
