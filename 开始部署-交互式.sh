#!/bin/bash

# 交互式部署脚本
# Render + Supabase + Vercel

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
cat << 'EOF'
╔════════════════════════════════════════════════════════════════════╗
║                                                                    ║
║     🚀 Render + Supabase + Vercel 交互式部署                       ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo ""
echo "预计时间：20-30 分钟"
echo "需要准备：Supabase、Render、Vercel 账号"
echo ""

read -p "准备好了吗？按 Enter 开始..."
echo ""

# ============================================
# 第 1 步：生成 JWT Secret
# ============================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}第 1 步：生成 JWT Secret${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

JWT_SECRET=$(openssl rand -base64 32)
echo -e "${GREEN}✅ JWT Secret 已生成：${NC}"
echo ""
echo "$JWT_SECRET"
echo ""
echo "$JWT_SECRET" > .jwt_secret.txt
echo -e "${GREEN}💾 已保存到 .jwt_secret.txt 文件${NC}"
echo ""

read -p "按 Enter 继续..."
echo ""

# ============================================
# 第 2 步：Supabase 配置
# ============================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}第 2 步：Supabase 数据库配置${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "请在浏览器中完成以下操作："
echo ""
echo "1. 访问 https://supabase.com/dashboard"
echo "2. 点击 'New Project'"
echo "3. 填写信息："
echo "   - Name: financial-compliance-monitoring"
echo "   - Database Password: 设置一个强密码（务必保存！）"
echo "   - Region: Southeast Asia (Singapore)"
echo "4. 点击 'Create new project'"
echo "5. 等待 2-3 分钟"
echo ""
echo "项目创建完成后："
echo ""
echo "6. 点击 Settings → Database"
echo "7. 找到 'Connection Pooling' 部分"
echo "8. 模式选择 'Transaction'"
echo "9. 记录连接信息"
echo ""

read -p "完成后按 Enter 继续..."
echo ""

# 获取数据库信息
echo "请输入 Supabase 连接信息："
echo ""
read -p "项目 ID (Reference ID): " PROJECT_ID
read -sp "数据库密码: " DB_PASSWORD
echo ""
echo ""

if [ -z "$PROJECT_ID" ] || [ -z "$DB_PASSWORD" ]; then
    echo -e "${RED}❌ 项目ID和密码不能为空${NC}"
    exit 1
fi

DB_HOST="aws-0-ap-southeast-1.pooler.supabase.com"
DB_PORT="6543"
DB_NAME="postgres"
DB_USER="postgres.$PROJECT_ID"

echo -e "${GREEN}✅ 数据库信息已记录${NC}"
echo ""

# ============================================
# 第 3 步：运行数据库迁移
# ============================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}第 3 步：运行数据库迁移${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

export DB_HOST="$DB_HOST"
export DB_PORT="$DB_PORT"
export DB_NAME="$DB_NAME"
export DB_USER="$DB_USER"
export DB_PASSWORD="$DB_PASSWORD"

echo "正在安装依赖..."
cd backend
npm install > /dev/null 2>&1

echo "正在运行迁移..."
npm run migrate

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ 数据库迁移完成！${NC}"
else
    echo ""
    echo -e "${RED}❌ 数据库迁移失败${NC}"
    echo "请检查数据库连接信息是否正确"
    exit 1
fi

cd ..
echo ""

read -p "按 Enter 继续..."
echo ""

# ============================================
# 第 4 步：生成 Render 配置
# ============================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}第 4 步：Render 后端部署${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "请在浏览器中完成以下操作："
echo ""
echo "1. 访问 https://render.com"
echo "2. 使用 GitHub 登录"
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
echo "   - Start Command: node dist/index.pgboss.js"
echo "   - Instance Type: Free"
echo ""
echo "6. 点击 'Advanced' → 'Add Environment Variable'"
echo "7. 复制以下环境变量："
echo ""

# 生成环境变量配置
cat > .render-env.txt << EOF
NODE_ENV=production
PORT=3000
TZ=Asia/Shanghai

DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_NAME=$DB_NAME
DB_USER=$DB_USER
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

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat .render-env.txt
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}💾 环境变量已保存到 .render-env.txt${NC}"
echo ""
echo "8. 将上述环境变量逐个添加到 Render"
echo "9. 点击 'Create Web Service'"
echo "10. 等待部署完成（约 5-10 分钟）"
echo ""

read -p "部署完成后按 Enter 继续..."
echo ""

read -p "请输入你的 Render 后端 URL (例如: https://xxx.onrender.com): " BACKEND_URL

if [ -z "$BACKEND_URL" ]; then
    echo -e "${RED}❌ 后端 URL 不能为空${NC}"
    exit 1
fi

echo ""
echo "正在验证后端部署..."
sleep 2

if curl -s "$BACKEND_URL/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 后端部署成功！${NC}"
else
    echo -e "${YELLOW}⚠️  无法连接到后端，可能还在启动中${NC}"
    echo "   请稍后手动验证: curl $BACKEND_URL/health"
fi

echo ""
read -p "按 Enter 继续..."
echo ""

# ============================================
# 第 5 步：Vercel 前端部署
# ============================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}第 5 步：Vercel 前端部署${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 创建前端环境变量
cat > frontend/.env.production << EOF
VITE_API_BASE_URL=$BACKEND_URL
EOF

echo -e "${GREEN}✅ 前端环境变量已配置${NC}"
echo ""

# 检查 Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "正在安装 Vercel CLI..."
    npm install -g vercel
fi

echo "开始部署前端到 Vercel..."
echo ""
echo "请按照提示操作："
echo "  - Set up and deploy? → Yes"
echo "  - Which scope? → 选择你的账号"
echo "  - Link to existing project? → No"
echo "  - Project name? → financial-compliance-frontend"
echo "  - In which directory is your code located? → ./"
echo "  - Want to override the settings? → No"
echo ""

cd frontend
vercel --prod

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ 前端部署成功！${NC}"
else
    echo ""
    echo -e "${RED}❌ 前端部署失败${NC}"
    exit 1
fi

cd ..
echo ""

# ============================================
# 完成
# ============================================
echo -e "${GREEN}"
cat << 'EOF'
╔════════════════════════════════════════════════════════════════════╗
║                                                                    ║
║     🎉 部署完成！                                                   ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo ""
echo "你的应用已成功部署："
echo ""
echo -e "${CYAN}前端:${NC} 查看 Vercel 输出的 URL"
echo -e "${CYAN}后端:${NC} $BACKEND_URL"
echo -e "${CYAN}数据库:${NC} Supabase Dashboard"
echo ""
echo "配置文件已保存："
echo "  - .jwt_secret.txt (JWT Secret)"
echo "  - .render-env.txt (Render 环境变量)"
echo "  - frontend/.env.production (前端配置)"
echo ""
echo "下一步："
echo "  1. 访问前端 URL"
echo "  2. 创建测试任务"
echo "  3. 验证功能"
echo ""
echo -e "${GREEN}祝使用愉快！🚀${NC}"
echo ""
