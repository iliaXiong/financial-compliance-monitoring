#!/bin/bash

# 使用 Connection Pooler 运行迁移（解决 IPv4 兼容性问题）

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "使用 Connection Pooler 运行数据库迁移"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  注意：如果你的 Supabase 项目显示 'Not IPv4 compatible'"
echo "   必须使用 Connection Pooler 而不是直连"
echo ""

PROJECT_ID="ynbaatdsceqtqwmqhlgu"

echo "Reference ID: $PROJECT_ID"
echo ""

# 询问 Pooler 类型
echo "请选择 Connection Pooler 模式："
echo "  1) Transaction Pooler (推荐用于迁移)"
echo "  2) Session Pooler"
echo ""
read -p "选择 (1 或 2): " POOLER_MODE

if [ "$POOLER_MODE" = "1" ]; then
    POOLER_TYPE="Transaction"
    # Transaction mode 使用特殊用户名格式
    DB_USER="postgres.${PROJECT_ID}"
elif [ "$POOLER_MODE" = "2" ]; then
    POOLER_TYPE="Session"
    # Session mode 使用普通用户名
    DB_USER="postgres"
else
    echo "❌ 无效选择"
    exit 1
fi

echo ""
read -sp "请输入数据库密码: " DB_PASSWORD
echo ""
echo ""

if [ -z "$DB_PASSWORD" ]; then
    echo "❌ 密码不能为空"
    exit 1
fi

# 使用 Connection Pooler
export DB_HOST="aws-0-ap-southeast-1.pooler.supabase.com"
export DB_PORT="6543"
export DB_NAME="postgres"
export DB_USER="$DB_USER"
export DB_PASSWORD="$DB_PASSWORD"

echo "数据库配置（${POOLER_TYPE} Pooler）："
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  User: $DB_USER"
echo "  Database: $DB_NAME"
echo ""

# 先测试连接
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "步骤 1：测试连接"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 创建临时测试脚本
cat > backend/test-pooler-temp.js << EOF
const { Pool } = require('pg');

async function testConnection() {
  const pool = new Pool({
    host: '${DB_HOST}',
    port: ${DB_PORT},
    database: '${DB_NAME}',
    user: '${DB_USER}',
    password: '${DB_PASSWORD}',
    connectionTimeoutMillis: 10000,
  });
  
  try {
    console.log('正在测试连接...');
    const result = await pool.query('SELECT current_database(), current_user');
    console.log('✅ 连接成功！');
    console.log('   数据库:', result.rows[0].current_database);
    console.log('   用户:', result.rows[0].current_user);
    console.log('');
    return true;
  } catch (error) {
    console.log('❌ 连接失败');
    console.log('   错误:', error.message);
    console.log('');
    return false;
  } finally {
    await pool.end();
  }
}

testConnection()
  .then((success) => process.exit(success ? 0 : 1))
  .catch(() => process.exit(1));
EOF

cd backend
node test-pooler-temp.js

if [ $? -ne 0 ]; then
    rm -f test-pooler-temp.js
    echo ""
    echo "❌ 连接测试失败"
    echo ""
    echo "请检查："
    echo "  1. 密码是否正确"
    echo "  2. Connection Pooler 是否已启用"
    echo "  3. 在 Supabase Dashboard: Settings → Database → Connection Pooling"
    echo ""
    exit 1
fi

rm -f test-pooler-temp.js
cd ..

# 运行迁移
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "步骤 2：运行数据库迁移"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd backend
npm run migrate

if [ $? -eq 0 ]; then
    cd ..
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ 数据库迁移成功！"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # 生成 Render 环境变量
    JWT_SECRET=$(cat .jwt_secret.txt 2>/dev/null || openssl rand -base64 32)
    
    cat > .render-env.txt << EOF
NODE_ENV=production
PORT=3000
TZ=Asia/Shanghai

# 使用 Connection Pooler (IPv4 兼容)
DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com
DB_PORT=6543
DB_NAME=postgres
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}

JWT_SECRET=${JWT_SECRET}
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
    
    echo "💾 Render 环境变量已保存到：.render-env.txt"
    echo ""
    echo "下一步：部署到 Render"
    echo "  1. 访问 https://dashboard.render.com"
    echo "  2. 创建 Web Service"
    echo "  3. 复制 .render-env.txt 中的环境变量"
    echo ""
else
    cd ..
    echo ""
    echo "❌ 迁移失败"
    echo ""
    exit 1
fi
