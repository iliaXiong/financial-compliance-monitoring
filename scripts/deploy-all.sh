#!/bin/bash

# 一键部署脚本
# 自动部署前端到 Vercel，后端到 Railway

set -e

echo "🚀 金融合规监测系统 - 一键部署"
echo "=================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查必要的 CLI 工具
echo "📋 检查依赖..."

if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI 未安装${NC}"
    echo "请运行: npm install -g @railway/cli"
    exit 1
fi

if ! command -v vercel &> /dev/null; then
    echo -e "${RED}❌ Vercel CLI 未安装${NC}"
    echo "请运行: npm install -g vercel"
    exit 1
fi

echo -e "${GREEN}✅ 所有依赖已安装${NC}"
echo ""

# 步骤 1: 部署后端到 Railway
echo "=================================================="
echo "步骤 1/2: 部署后端到 Railway"
echo "=================================================="
echo ""

read -p "是否已在 Railway 设置好环境变量? (y/n): " RAILWAY_READY

if [ "$RAILWAY_READY" != "y" ]; then
    echo ""
    echo -e "${YELLOW}请先运行以下命令设置环境变量:${NC}"
    echo "  ./scripts/setup-env.sh"
    echo ""
    echo "或者手动在 Railway Dashboard 设置环境变量"
    echo "详细说明请查看: VERCEL_SUPABASE_DEPLOYMENT.md"
    exit 1
fi

echo ""
echo "🚀 开始部署后端..."
cd backend
railway up
cd ..

echo ""
echo -e "${GREEN}✅ 后端部署完成！${NC}"
echo ""

# 获取 Railway URL
echo "请在 Railway Dashboard 生成域名，然后输入："
read -p "Railway 后端 URL (例如: https://your-app.railway.app): " BACKEND_URL

if [ -z "$BACKEND_URL" ]; then
    echo -e "${RED}❌ 后端 URL 不能为空${NC}"
    exit 1
fi

# 验证后端健康检查
echo ""
echo "🔍 验证后端服务..."
if curl -f -s "${BACKEND_URL}/health" > /dev/null; then
    echo -e "${GREEN}✅ 后端服务正常运行${NC}"
else
    echo -e "${YELLOW}⚠️  后端健康检查失败，请检查 Railway 日志${NC}"
    read -p "是否继续部署前端? (y/n): " CONTINUE
    if [ "$CONTINUE" != "y" ]; then
        exit 1
    fi
fi

# 步骤 2: 更新配置文件
echo ""
echo "=================================================="
echo "步骤 2/3: 更新配置文件"
echo "=================================================="
echo ""

# 更新 vercel.json
echo "📝 更新 vercel.json..."
sed -i.bak "s|https://your-backend-url.railway.app|${BACKEND_URL}|g" vercel.json
rm -f vercel.json.bak

# 更新 frontend/.env.production
echo "📝 更新 frontend/.env.production..."
echo "VITE_API_BASE_URL=${BACKEND_URL}" > frontend/.env.production

echo -e "${GREEN}✅ 配置文件更新完成${NC}"

# 步骤 3: 部署前端到 Vercel
echo ""
echo "=================================================="
echo "步骤 3/3: 部署前端到 Vercel"
echo "=================================================="
echo ""

echo "🚀 开始部署前端..."
vercel --prod

echo ""
echo -e "${GREEN}✅ 前端部署完成！${NC}"
echo ""

# 完成
echo "=================================================="
echo "🎉 部署完成！"
echo "=================================================="
echo ""
echo "📋 部署信息："
echo "  后端 URL: ${BACKEND_URL}"
echo "  前端 URL: 请查看 Vercel 输出"
echo ""
echo "🔍 下一步："
echo "  1. 访问前端 URL 测试功能"
echo "  2. 注册账号并登录"
echo "  3. 创建测试任务"
echo "  4. 查看 Railway 日志: railway logs"
echo "  5. 查看 Vercel 日志: vercel logs"
echo ""
echo "📚 文档："
echo "  - 完整部署指南: VERCEL_SUPABASE_DEPLOYMENT.md"
echo "  - 快速部署指南: QUICK_DEPLOY_GUIDE.md"
echo "  - 部署检查清单: deploy-checklist.md"
echo ""
