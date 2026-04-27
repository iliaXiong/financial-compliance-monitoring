#!/bin/bash

# 快速修复数据库连接问题

set -e

echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║                                                                    ║"
echo "║     🔧 数据库连接快速修复工具                                      ║"
echo "║                                                                    ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

echo "这个工具会帮你："
echo "  1. 验证 Reference ID 格式"
echo "  2. 测试数据库连接"
echo "  3. 运行数据库迁移"
echo ""

# 获取 Reference ID
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "步骤 1：输入 Supabase Reference ID"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📍 如何找到 Reference ID："
echo "   1. 访问 https://supabase.com/dashboard"
echo "   2. 选择你的项目"
echo "   3. Settings → General → Reference ID"
echo ""
echo "✅ 正确格式：20 个小写字母，如 'abcdefghijklmnop'"
echo "❌ 不是项目名称（如 'financial-compliance-monitoring'）"
echo ""

read -p "Reference ID: " PROJECT_ID

if [ -z "$PROJECT_ID" ]; then
    echo "❌ Reference ID 不能为空"
    exit 1
fi

# 验证格式
if [ ${#PROJECT_ID} -ne 20 ]; then
    echo ""
    echo "⚠️  警告：Reference ID 通常是 20 个字符"
    echo "   你输入的：$PROJECT_ID (${#PROJECT_ID} 个字符)"
    echo ""
    read -p "确定这是正确的 Reference ID 吗？(y/N): " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo ""
        echo "请重新运行脚本并输入正确的 Reference ID"
        exit 0
    fi
fi

# 获取密码
echo ""
read -sp "数据库密码: " DB_PASSWORD
echo ""

if [ -z "$DB_PASSWORD" ]; then
    echo "❌ 密码不能为空"
    exit 1
fi

# 测试连接
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "步骤 2：测试数据库连接"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 创建临时测试脚本
cat > backend/test-connection-temp.js << EOF
const { Pool } = require('pg');

async function testConnection() {
  const configs = [
    {
      name: 'Connection Pooler (生产环境)',
      config: {
        host: 'aws-0-ap-southeast-1.pooler.supabase.com',
        port: 6543,
        database: 'postgres',
        user: 'postgres.${PROJECT_ID}',
        password: '${DB_PASSWORD}',
        connectionTimeoutMillis: 5000,
      }
    },
    {
      name: 'Direct Connection (迁移用)',
      config: {
        host: 'db.${PROJECT_ID}.supabase.co',
        port: 5432,
        database: 'postgres',
        user: 'postgres',
        password: '${DB_PASSWORD}',
        connectionTimeoutMillis: 5000,
      }
    }
  ];

  let hasSuccess = false;

  for (const { name, config } of configs) {
    console.log(\`测试 \${name}...\`);
    const pool = new Pool(config);
    
    try {
      const result = await pool.query('SELECT current_database(), current_user');
      console.log(\`✅ \${name}: 连接成功\`);
      console.log(\`   数据库: \${result.rows[0].current_database}\`);
      console.log(\`   用户: \${result.rows[0].current_user}\`);
      console.log('');
      hasSuccess = true;
    } catch (error) {
      console.log(\`❌ \${name}: 连接失败\`);
      console.log(\`   错误: \${error.message}\`);
      console.log('');
    } finally {
      await pool.end();
    }
  }

  if (!hasSuccess) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('❌ 所有连接都失败了');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('可能的原因：');
    console.log('  1. Reference ID 不正确');
    console.log('  2. 数据库密码错误');
    console.log('  3. Supabase 项目还在创建中（等待 2-3 分钟）');
    console.log('  4. 项目已暂停（在 Dashboard 中恢复）');
    console.log('');
    console.log('请检查后重试。详细说明请查看：获取正确的Reference_ID.md');
    console.log('');
    process.exit(1);
  }
}

testConnection()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('测试失败:', error);
    process.exit(1);
  });
EOF

cd backend
node test-connection-temp.js

if [ $? -ne 0 ]; then
    rm -f test-connection-temp.js
    exit 1
fi

rm -f test-connection-temp.js
cd ..

# 运行迁移
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "步骤 3：运行数据库迁移"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

export DB_HOST="db.${PROJECT_ID}.supabase.co"
export DB_PORT="5432"
export DB_NAME="postgres"
export DB_USER="postgres"
export DB_PASSWORD="$DB_PASSWORD"

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

DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com
DB_PORT=6543
DB_NAME=postgres
DB_USER=postgres.${PROJECT_ID}
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
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "下一步：部署到 Render"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "1. 访问 https://dashboard.render.com"
    echo "2. 点击 'New +' → 'Web Service'"
    echo "3. 连接你的 GitHub 仓库"
    echo "4. 配置："
    echo "   - Name: financial-compliance-backend"
    echo "   - Region: Singapore"
    echo "   - Root Directory: backend"
    echo "   - Build Command: npm install && npm run build"
    echo "   - Start Command: node dist/index.pgboss.js"
    echo ""
    echo "5. 添加环境变量（从 .render-env.txt 复制）"
    echo "6. 点击 'Create Web Service'"
    echo ""
    echo "详细步骤请查看：数据库连接故障排查.md"
    echo ""
else
    cd ..
    echo ""
    echo "❌ 迁移失败"
    echo ""
    echo "请查看错误信息并重试"
    exit 1
fi
