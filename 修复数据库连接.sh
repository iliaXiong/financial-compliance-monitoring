#!/bin/bash

# 使用正确的 Reference ID 重新运行迁移

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "重新运行数据库迁移"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

PROJECT_ID="ynbaatdsceqtqwmqhlgu"

echo "Reference ID: $PROJECT_ID"
echo ""
read -sp "请输入数据库密码: " DB_PASSWORD
echo ""
echo ""

if [ -z "$DB_PASSWORD" ]; then
    echo "❌ 密码不能为空"
    exit 1
fi

export DB_HOST="aws-0-ap-southeast-1.pooler.supabase.com"
export DB_PORT="6543"
export DB_NAME="postgres"
export DB_USER="postgres.$PROJECT_ID"
export DB_PASSWORD="$DB_PASSWORD"

echo "数据库配置："
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
    echo "现在可以继续部署："
    echo "  1. 部署后端到 Render"
    echo "  2. 部署前端到 Vercel"
    echo ""
    
    # 保存配置供后续使用
    cat > ../.db-config.txt << EOF
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
EOF
    
    echo "💾 数据库配置已保存到 .db-config.txt"
    echo ""
else
    echo ""
    echo "❌ 迁移失败"
    echo ""
    echo "请检查："
    echo "  1. 数据库密码是否正确"
    echo "  2. Supabase 项目是否已完全创建"
    echo "  3. 网络连接是否正常"
    echo ""
    exit 1
fi
