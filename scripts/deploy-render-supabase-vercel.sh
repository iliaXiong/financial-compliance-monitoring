#!/bin/bash

# Render + Supabase + Vercel 完整部署脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}🚀 Render + Supabase + Vercel 部署助手${NC}"
echo "========================================"
echo ""
echo "这个脚本将帮助你："
echo "  1. 配置 Supabase 数据库"
echo "  2. 运行数据库迁移"
echo "  3. 生成 Render 配置"
echo "  4. 生成 Vercel 配置"
echo ""

# 检查必要的命令
command -v openssl >/dev/null 2>&1 || { echo -e "${RED}❌ 需要 openssl 命令${NC}"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo -e "${RED}❌ 需要 npm 命令${NC}"; exit 1; }

echo -e "${YELLOW}📋 第一步：Supabase 数据库配置${NC}"
echo "========================================"
echo ""
echo "请先在浏览器中完成以下步骤："
echo "1. 访问 https://supabase.com"
echo "2. 创建新项目: financial-compliance-monitoring"
echo "3. 设置数据库密码并保存"
echo "4. 在 Settings → Database 中找到连接信息"
echo ""
read -p "完成后按 Enter 继续..."
echo ""

# 获取数据库信息
read -p "Supabase DB_HOST (例如: aws-0-ap-southeast-1.pooler.supabase.com): " DB_HOST
read -sp "Supabase DB_PASSWORD: " DB_PASSWORD
echo ""

if [ -z "$DB_HOST" ] || [ -z "$DB_PASSWORD" ]; then
    echo -e "${RED}❌ 数据库信息不能为空${NC}"
    exit 1
fi

# 设置数据库环境变量
export DB_HOST="$DB_HOST"
export DB_PORT=5432
export DB_NAME=postgres
export DB_USER=postgres
export DB_PASSWORD="$DB_PASSWORD"

echo ""
echo -e "${YELLOW}📋 第二步：运行数据库迁移${NC}"
echo "========================================"
echo ""

cd backend
echo "安装依赖..."
npm install

echo "运行迁移..."
npm run migrate

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 数据库迁移完成${NC}"
else
    echo -e "${RED}❌ 数据库迁移失败${NC}"
    exit 1
fi

cd ..

echo ""
echo -e "${YELLOW}📋 第三步：生成配置信息${NC}"
echo "========================================"
echo ""

# 生成 JWT Secret
JWT_SECRET=$(openssl rand -base64 32)
echo -e "${GREEN}✅ JWT Secret 已生成${NC}"

# 获取 LLM 配置
echo ""
echo "请选择 LLM 配置方式："
echo "1. OpenAI"
echo "2. 自定义 LLM API（如 Webull 内部 API）"
read -p "选择 (1/2): " LLM_CHOICE

if [ "$LLM_CHOICE" = "1" ]; then
    read -p "OpenAI API Key: " OPENAI_API_KEY
    read -p "OpenAI Model (默认: gpt-4): " OPENAI_MODEL
    OPENAI_MODEL=${OPENAI_MODEL:-gpt-4}
    
    LLM_CONFIG="OPENAI_API_KEY=$OPENAI_API_KEY
OPENAI_MODEL=$OPENAI_MODEL"
else
    read -p "LLM API URL: " LLM_API_URL
    read -p "LLM API Key: " LLM_API_KEY
    read -p "LLM Model: " LLM_MODEL
    read -p "LLM API Key Header (默认: authorization): " LLM_API_KEY_HEADER
    LLM_API_KEY_HEADER=${LLM_API_KEY_HEADER:-authorization}
    read -p "LLM Auth Prefix (默认: Bearer): " LLM_AUTH_PREFIX
    LLM_AUTH_PREFIX=${LLM_AUTH_PREFIX:-Bearer}
    
    LLM_CONFIG="LLM_API_URL=$LLM_API_URL
LLM_API_KEY=$LLM_API_KEY
LLM_MODEL=$LLM_MODEL
LLM_API_KEY_HEADER=$LLM_API_KEY_HEADER
LLM_AUTH_PREFIX=$LLM_AUTH_PREFIX"
fi

echo ""
echo -e "${YELLOW}📋 第四步：Render 部署配置${NC}"
echo "========================================"
echo ""
echo "请在 Render Dashboard 完成以下操作："
echo ""
echo "1. 访问 https://render.com"
echo "2. 点击 'New +' → 'Web Service'"
echo "3. 连接你的 GitHub 仓库"
echo ""
echo "4. 配置服务："
echo "   - Name: financial-compliance-backend"
echo "   - Region: Singapore (或其他区域)"
echo "   - Branch: main"
echo "   - Root Directory: backend"
echo "   - Runtime: Node"
echo "   - Build Command: npm install && npm run build"
echo "   - Start Command: node dist/index.pgboss.js"
echo "   - Instance Type: Free"
echo ""
echo "5. 添加以下环境变量："
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

$LLM_CONFIG

JINA_READER_API_URL=https://r.jina.ai
MAX_PARALLEL_WEBSITES=5
RETRIEVAL_TIMEOUT_MS=30000
ENABLE_WEBSITE_ANALYZER=true
DEMO_MODE=false
EOF
echo "=========================================="
echo ""

# 保存配置到文件
cat > .env.render << EOF
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

$LLM_CONFIG

JINA_READER_API_URL=https://r.jina.ai
MAX_PARALLEL_WEBSITES=5
RETRIEVAL_TIMEOUT_MS=30000
ENABLE_WEBSITE_ANALYZER=true
DEMO_MODE=false
EOF

echo -e "${GREEN}✅ Render 配置已保存到 .env.render${NC}"
echo ""
read -p "完成 Render 部署后，输入你的后端 URL (例如: https://xxx.onrender.com): " BACKEND_URL

if [ -z "$BACKEND_URL" ]; then
    echo -e "${YELLOW}⚠️  未输入后端 URL，跳过 Vercel 配置${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}📋 第五步：Vercel 部署配置${NC}"
echo "========================================"
echo ""

# 创建前端环境变量文件
cat > frontend/.env.production << EOF
VITE_API_BASE_URL=$BACKEND_URL
EOF

echo -e "${GREEN}✅ 前端环境变量已保存到 frontend/.env.production${NC}"
echo ""

echo "现在可以部署前端到 Vercel："
echo ""
echo "方式 1: 使用 Vercel CLI"
echo "  cd frontend"
echo "  vercel --prod"
echo ""
echo "方式 2: 使用 Vercel Dashboard"
echo "  1. 访问 https://vercel.com"
echo "  2. 导入 GitHub 仓库"
echo "  3. Root Directory: frontend"
echo "  4. 添加环境变量: VITE_API_BASE_URL=$BACKEND_URL"
echo "  5. 部署"
echo ""

echo -e "${GREEN}🎉 配置完成！${NC}"
echo ""
echo "📝 配置文件已生成："
echo "  - .env.render (Render 环境变量)"
echo "  - frontend/.env.production (Vercel 环境变量)"
echo ""
echo "📚 详细部署步骤请查看: RENDER_SUPABASE_VERCEL_部署指南.md"
echo ""
echo "🔍 部署后验证："
echo "  curl $BACKEND_URL/health"
echo ""
