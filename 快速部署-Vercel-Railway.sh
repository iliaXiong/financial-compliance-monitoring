#!/bin/bash

# Vercel + Railway 快速部署脚本

set -e

echo "=========================================="
echo "Vercel前端 + Railway后端 部署"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}部署架构:${NC}"
echo "  前端: Vercel (CDN加速)"
echo "  后端: Railway (持久运行)"
echo "  数据库: Supabase (PostgreSQL + pg-boss)"
echo ""

# 检查是否已安装CLI工具
echo "=========================================="
echo "步骤 1: 检查CLI工具"
echo "=========================================="
echo ""

# 检查Vercel CLI
if command -v vercel &> /dev/null; then
    echo -e "${GREEN}✓ Vercel CLI已安装${NC}"
else
    echo -e "${YELLOW}⚠ Vercel CLI未安装${NC}"
    read -p "是否安装Vercel CLI? (y/n): " INSTALL_VERCEL
    if [ "$INSTALL_VERCEL" = "y" ]; then
        npm install -g vercel
        echo -e "${GREEN}✓ Vercel CLI安装完成${NC}"
    fi
fi

# 检查Railway CLI
if command -v railway &> /dev/null; then
    echo -e "${GREEN}✓ Railway CLI已安装${NC}"
else
    echo -e "${YELLOW}⚠ Railway CLI未安装${NC}"
    read -p "是否安装Railway CLI? (y/n): " INSTALL_RAILWAY
    if [ "$INSTALL_RAILWAY" = "y" ]; then
        npm install -g @railway/cli
        echo -e "${GREEN}✓ Railway CLI安装完成${NC}"
    fi
fi

echo ""
echo "=========================================="
echo "步骤 2: 部署前端到Vercel"
echo "=========================================="
echo ""

read -p "是否部署前端到Vercel? (y/n): " DEPLOY_FRONTEND

if [ "$DEPLOY_FRONTEND" = "y" ]; then
    echo ""
    echo "配置前端环境变量..."
    echo ""
    
    read -p "后端URL (例如: https://your-app.railway.app): " BACKEND_URL
    
    if [ -n "$BACKEND_URL" ]; then
        # 创建前端环境变量文件
        cat > frontend/.env.production << EOF
VITE_API_BASE_URL=$BACKEND_URL
EOF
        echo -e "${GREEN}✓ 前端环境变量已配置${NC}"
    fi
    
    echo ""
    echo "开始部署前端..."
    cd frontend
    
    # 登录Vercel（如果需要）
    vercel login
    
    # 部署到生产环境
    vercel --prod
    
    cd ..
    echo -e "${GREEN}✓ 前端部署完成${NC}"
else
    echo -e "${YELLOW}跳过前端部署${NC}"
fi

echo ""
echo "=========================================="
echo "步骤 3: 部署后端到Railway"
echo "=========================================="
echo ""

read -p "是否部署后端到Railway? (y/n): " DEPLOY_BACKEND

if [ "$DEPLOY_BACKEND" = "y" ]; then
    echo ""
    echo -e "${CYAN}Railway部署方式:${NC}"
    echo "1. 使用CLI部署（自动）"
    echo "2. 使用GitHub集成（手动）"
    echo ""
    read -p "选择部署方式 (1/2): " DEPLOY_METHOD
    
    if [ "$DEPLOY_METHOD" = "1" ]; then
        echo ""
        echo "使用Railway CLI部署..."
        
        # 登录Railway
        railway login
        
        # 初始化项目（如果需要）
        if [ ! -f "railway.toml" ]; then
            railway init
        fi
        
        # 部署
        railway up
        
        echo -e "${GREEN}✓ 后端部署完成${NC}"
        echo ""
        echo "配置环境变量:"
        echo "  railway variables set DB_HOST=your-supabase-host"
        echo "  railway variables set DB_PASSWORD=your-password"
        echo "  railway variables set DEBUG_MODE=true"
        echo "  railway variables set MAX_CHUNKS_PER_KEYWORD=30"
        echo "  railway variables set CHUNK_MAX_SIZE=500"
        echo "  railway variables set CHUNK_MIN_SIZE=100"
        echo "  railway variables set CHUNK_OVERLAP=50"
        echo "  railway variables set LLM_API_URL=your-llm-url"
        echo "  railway variables set LLM_API_KEY=your-llm-key"
        
    else
        echo ""
        echo -e "${CYAN}使用GitHub集成部署:${NC}"
        echo ""
        echo "1. 访问 https://railway.app"
        echo "2. 点击 'New Project'"
        echo "3. 选择 'Deploy from GitHub repo'"
        echo "4. 选择你的仓库: financial-compliance-monitoring"
        echo "5. 配置:"
        echo "   - Root Directory: backend"
        echo "   - Build Command: npm install && npm run build"
        echo "   - Start Command: node dist/index.pgboss.js"
        echo ""
        echo "6. 添加环境变量（复制以下内容）:"
        echo ""
        echo "=========================================="
        cat << 'EOF'
NODE_ENV=production
PORT=3000

# 数据库配置
DB_HOST=your-supabase-host.supabase.com
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-password

# 阶段一优化配置
DEBUG_MODE=true
MAX_CHUNKS_PER_KEYWORD=30
CHUNK_MAX_SIZE=500
CHUNK_MIN_SIZE=100
CHUNK_OVERLAP=50

# LLM配置
LLM_API_URL=https://office.webullbroker.com/api/oa-ai/open/chat/completions
LLM_API_KEY=dcb0d1c8-82c7-478f-bd9a-7c3023cac4d8
LLM_MODEL=us.anthropic.claude-sonnet-4-20250514-v1:0
LLM_API_KEY_HEADER=authorization
LLM_AUTH_PREFIX=Bearer

# JWT配置
JWT_SECRET=your-generated-secret
JWT_EXPIRES_IN=7d

# 其他配置
JINA_READER_API_URL=https://r.jina.ai
MAX_PARALLEL_WEBSITES=5
RETRIEVAL_TIMEOUT_MS=30000
ENABLE_WEBSITE_ANALYZER=false
EOF
        echo "=========================================="
        echo ""
        read -p "完成后按 Enter 继续..."
    fi
else
    echo -e "${YELLOW}跳过后端部署${NC}"
fi

echo ""
echo "=========================================="
echo "步骤 4: 验证部署"
echo "=========================================="
echo ""

if [ -n "$BACKEND_URL" ]; then
    echo "验证后端健康状态..."
    curl -s "$BACKEND_URL/health" | jq '.' || echo "请手动检查: $BACKEND_URL/health"
fi

echo ""
echo "=========================================="
echo "部署完成！"
echo "=========================================="
echo ""

echo -e "${GREEN}✓ 部署总结:${NC}"
echo ""

if [ "$DEPLOY_FRONTEND" = "y" ]; then
    echo "前端: 已部署到Vercel"
    echo "  - 查看: https://vercel.com/dashboard"
fi

if [ "$DEPLOY_BACKEND" = "y" ]; then
    echo "后端: 已部署到Railway"
    echo "  - 查看: https://railway.app/dashboard"
fi

echo ""
echo -e "${CYAN}下一步:${NC}"
echo "1. 在Railway Dashboard检查后端日志"
echo "2. 验证环境变量配置"
echo "3. 测试API端点: curl \$BACKEND_URL/health"
echo "4. 在前端创建测试任务"
echo "5. 查看Railway日志中的debug信息"
echo ""

echo -e "${GREEN}部署完成！${NC}"
