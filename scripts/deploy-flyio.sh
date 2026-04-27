#!/bin/bash

# Fly.io + Supabase 自动部署脚本

set -e

echo "🚀 部署到 Fly.io + Supabase"
echo "=============================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

# 检查 flyctl 是否安装
if ! command -v flyctl &> /dev/null; then
    echo -e "${RED}❌ flyctl 未安装${NC}"
    echo ""
    echo "请先安装 Fly.io CLI:"
    echo ""
    echo "macOS:"
    echo "  brew install flyctl"
    echo ""
    echo "Linux:"
    echo "  curl -L https://fly.io/install.sh | sh"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ flyctl 已安装${NC}"
echo ""

# 检查是否已登录
if ! flyctl auth whoami &> /dev/null; then
    echo -e "${YELLOW}请先登录 Fly.io${NC}"
    flyctl auth login
fi

echo -e "${GREEN}✅ 已登录 Fly.io${NC}"
echo ""

# 进入 backend 目录
cd backend

# 检查是否已经初始化
if [ ! -f "fly.toml" ]; then
    echo -e "${YELLOW}⚠️  fly.toml 不存在，将创建新应用${NC}"
    echo ""
    
    read -p "应用名称 (默认: financial-compliance-backend): " APP_NAME
    APP_NAME=${APP_NAME:-financial-compliance-backend}
    
    echo ""
    echo "选择区域:"
    echo "  1. sin (Singapore)"
    echo "  2. hkg (Hong Kong)"
    echo "  3. nrt (Tokyo)"
    read -p "选择 (1-3, 默认: 1): " REGION_CHOICE
    
    case $REGION_CHOICE in
        2) REGION="hkg" ;;
        3) REGION="nrt" ;;
        *) REGION="sin" ;;
    esac
    
    echo ""
    echo -e "${CYAN}创建应用: $APP_NAME (区域: $REGION)${NC}"
    
    flyctl launch --name "$APP_NAME" --region "$REGION" --no-deploy
fi

echo ""
echo -e "${CYAN}📋 配置环境变量${NC}"
echo ""

# 数据库配置
DB_HOST="db.tzvxumvbucztaaaqlugv.supabase.co"
DB_PASSWORD="KhpGTR6dMFzZz7qq"
JWT_SECRET="IVyGa5HGayEHQesrzZd3lVhdMynDks4vbbQQ/jnYRhI="
LLM_API_URL="https://office.webullbroker.com/api/oa-ai/open/chat/completions"
LLM_API_KEY="dcb0d1c8-82c7-478f-bd9a-7c3023cac4d8"
LLM_MODEL="us.anthropic.claude-sonnet-4-20250514-v1:0"

echo "设置环境变量..."

flyctl secrets set \
  DB_HOST="$DB_HOST" \
  DB_PORT=5432 \
  DB_NAME=postgres \
  DB_USER=postgres \
  DB_PASSWORD="$DB_PASSWORD" \
  JWT_SECRET="$JWT_SECRET" \
  JWT_EXPIRES_IN=7d \
  LLM_API_URL="$LLM_API_URL" \
  LLM_API_KEY="$LLM_API_KEY" \
  LLM_MODEL="$LLM_MODEL" \
  LLM_API_KEY_HEADER=authorization \
  LLM_AUTH_PREFIX=Bearer \
  NODE_ENV=production \
  JINA_READER_API_URL=https://r.jina.ai \
  MAX_PARALLEL_WEBSITES=5 \
  RETRIEVAL_TIMEOUT_MS=30000 \
  ENABLE_WEBSITE_ANALYZER=true \
  DEMO_MODE=false

echo ""
echo -e "${GREEN}✅ 环境变量配置完成${NC}"
echo ""

echo -e "${CYAN}🚀 开始部署...${NC}"
echo ""

flyctl deploy

echo ""
echo -e "${GREEN}🎉 部署完成！${NC}"
echo ""

# 获取应用 URL
APP_URL=$(flyctl info --json | grep -o '"Hostname":"[^"]*"' | cut -d'"' -f4)

echo "应用信息:"
echo "  URL: https://$APP_URL"
echo "  健康检查: https://$APP_URL/health"
echo ""

echo "验证部署:"
echo "  flyctl status"
echo "  flyctl logs"
echo ""

echo -e "${CYAN}测试健康检查...${NC}"
sleep 5

if curl -f "https://$APP_URL/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 健康检查通过！${NC}"
else
    echo -e "${YELLOW}⚠️  健康检查失败，请查看日志: flyctl logs${NC}"
fi

echo ""
echo -e "${GREEN}🎉 部署成功！${NC}"
echo ""
echo "下一步:"
echo "  1. 部署前端到 Vercel"
echo "  2. 更新前端 API URL: https://$APP_URL/api"
echo "  3. 测试完整功能"
echo ""
