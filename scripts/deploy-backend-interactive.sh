#!/bin/bash

# 交互式后端部署脚本
# 引导用户完成 Supabase + Upstash + Railway 部署

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

clear

echo -e "${CYAN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║        金融合规监测系统 - 后端部署向导                    ║"
echo "║                                                            ║"
echo "║        Supabase + Upstash + Railway                       ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# 检查必要工具
echo -e "${BLUE}[检查] 验证必要工具...${NC}"
echo ""

if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI 未安装${NC}"
    echo ""
    echo "请运行以下命令安装："
    echo "  npm install -g @railway/cli"
    echo ""
    exit 1
fi

if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠️  PostgreSQL 客户端未安装（可选，用于测试连接）${NC}"
fi

echo -e "${GREEN}✅ Railway CLI 已安装${NC}"
echo ""

# 步骤 1: Supabase 配置
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}步骤 1/4: 配置 Supabase 数据库${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "请先在浏览器中完成以下操作："
echo "1. 访问 https://supabase.com"
echo "2. 创建新项目（名称: financial-compliance-monitoring）"
echo "3. 设置数据库密码并保存"
echo "4. 等待项目创建完成（约 2 分钟）"
echo "5. 进入 Settings → Database 获取连接信息"
echo ""
read -p "完成后按 Enter 继续..."
echo ""

echo "请输入 Supabase 数据库连接信息："
echo ""
read -p "DB_HOST (例如: aws-0-ap-southeast-1.pooler.supabase.com): " DB_HOST
read -sp "DB_PASSWORD: " DB_PASSWORD
echo ""
echo ""

if [ -z "$DB_HOST" ] || [ -z "$DB_PASSWORD" ]; then
    echo -e "${RED}❌ 数据库信息不能为空${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Supabase 配置已记录${NC}"
echo ""

# 步骤 2: Upstash 配置
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}步骤 2/4: 配置 Upstash Redis${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "请先在浏览器中完成以下操作："
echo "1. 访问 https://upstash.com"
echo "2. 创建新数据库（名称: financial-compliance-redis）"
echo "3. 选择 Regional, 区域选择 Singapore 或 Tokyo"
echo "4. 启用 TLS"
echo "5. 获取连接信息"
echo ""
read -p "完成后按 Enter 继续..."
echo ""

echo "请输入 Upstash Redis 连接信息："
echo ""
read -p "REDIS_HOST (例如: your-redis.upstash.io): " REDIS_HOST
read -sp "REDIS_PASSWORD: " REDIS_PASSWORD
echo ""
echo ""

if [ -z "$REDIS_HOST" ] || [ -z "$REDIS_PASSWORD" ]; then
    echo -e "${RED}❌ Redis 信息不能为空${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Upstash 配置已记录${NC}"
echo ""

# 步骤 3: 运行数据库迁移
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}步骤 3/4: 运行数据库迁移${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo ""

echo "正在设置环境变量..."
export DB_HOST="$DB_HOST"
export DB_PORT=5432
export DB_NAME=postgres
export DB_USER=postgres
export DB_PASSWORD="$DB_PASSWORD"

echo "正在运行数据库迁移..."
echo ""

cd backend
if npm run migrate; then
    echo ""
    echo -e "${GREEN}✅ 数据库迁移成功！${NC}"
else
    echo ""
    echo -e "${RED}❌ 数据库迁移失败${NC}"
    echo "请检查数据库连接信息是否正确"
    exit 1
fi
cd ..

echo ""
echo "请在 Supabase Dashboard → Table Editor 验证表已创建"
read -p "验证完成后按 Enter 继续..."
echo ""

# 步骤 4: LLM 配置
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}步骤 4/4: 配置 LLM API${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo ""

echo "请输入 Webull 内部 LLM API 配置："
echo ""
read -p "LLM_API_URL: " LLM_API_URL
read -sp "LLM_API_KEY: " LLM_API_KEY
echo ""
read -p "LLM_MODEL (默认: claude-sonnet-4): " LLM_MODEL
LLM_MODEL=${LLM_MODEL:-claude-sonnet-4}
echo ""

if [ -z "$LLM_API_URL" ] || [ -z "$LLM_API_KEY" ]; then
    echo -e "${RED}❌ LLM API 信息不能为空${NC}"
    exit 1
fi

echo -e "${GREEN}✅ LLM 配置已记录${NC}"
echo ""

# 生成 JWT Secret
echo "正在生成 JWT Secret..."
JWT_SECRET=$(openssl rand -base64 32)
echo -e "${GREEN}✅ JWT Secret 已生成${NC}"
echo ""

# 配置摘要
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}配置摘要${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "数据库: $DB_HOST"
echo "Redis: $REDIS_HOST"
echo "LLM Model: $LLM_MODEL"
echo "JWT Secret: (已自动生成)"
echo ""

read -p "确认配置并部署到 Railway? (y/n): " CONFIRM

if [ "$CONFIRM" != "y" ]; then
    echo -e "${YELLOW}❌ 已取消部署${NC}"
    exit 0
fi

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}部署到 Railway${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo ""

# 登录 Railway
echo "正在登录 Railway..."
if ! railway whoami &> /dev/null; then
    echo "需要登录 Railway..."
    railway login
fi

echo -e "${GREEN}✅ 已登录 Railway${NC}"
echo ""

# 初始化项目（如果需要）
if ! railway status &> /dev/null; then
    echo "正在初始化 Railway 项目..."
    railway init
fi

echo ""
echo "正在设置环境变量..."

# 设置所有环境变量
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

echo -e "${GREEN}✅ 环境变量设置完成${NC}"
echo ""

# 部署
echo "正在部署后端到 Railway..."
echo ""

cd backend
railway up

echo ""
echo -e "${GREEN}✅ 部署完成！${NC}"
echo ""

cd ..

# 生成域名
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}生成域名${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo ""

echo "请在 Railway Dashboard 生成域名："
echo "1. 访问 https://railway.app/dashboard"
echo "2. 选择你的项目"
echo "3. 点击 Settings → Domains"
echo "4. 点击 Generate Domain"
echo ""
read -p "完成后，请输入生成的 URL: " BACKEND_URL

if [ -z "$BACKEND_URL" ]; then
    echo -e "${YELLOW}⚠️  未输入 URL，跳过验证${NC}"
else
    echo ""
    echo "正在验证后端服务..."
    sleep 5  # 等待服务启动
    
    if curl -f -s "${BACKEND_URL}/health" > /dev/null; then
        echo -e "${GREEN}✅ 后端服务正常运行！${NC}"
    else
        echo -e "${YELLOW}⚠️  后端健康检查失败，请稍后手动验证${NC}"
        echo "运行: curl ${BACKEND_URL}/health"
    fi
fi

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 后端部署完成！${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo ""

echo "📋 部署信息："
echo "  数据库: Supabase PostgreSQL"
echo "  缓存: Upstash Redis"
echo "  后端: Railway"
if [ -n "$BACKEND_URL" ]; then
    echo "  URL: $BACKEND_URL"
fi
echo ""

echo "🔍 下一步："
echo "  1. 测试后端: curl ${BACKEND_URL}/health"
echo "  2. 查看日志: railway logs"
echo "  3. 部署前端: 查看 DEPLOY_BACKEND_NOW.md"
echo ""

echo "📚 重要信息（请保存）："
echo "  DB_HOST=$DB_HOST"
echo "  REDIS_HOST=$REDIS_HOST"
if [ -n "$BACKEND_URL" ]; then
    echo "  BACKEND_URL=$BACKEND_URL"
fi
echo "  JWT_SECRET=$JWT_SECRET"
echo ""

echo -e "${GREEN}祝使用愉快！🚀${NC}"
