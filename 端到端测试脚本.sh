#!/bin/bash

# 端到端测试脚本
# 测试阶段一优化功能的完整流程

set -e  # 遇到错误立即退出

echo "=========================================="
echo "阶段一优化 - 端到端测试"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查函数
check_step() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ $1${NC}"
    else
        echo -e "${RED}✗ $1 失败${NC}"
        exit 1
    fi
}

# 1. 检查环境
echo "步骤 1: 检查环境配置"
echo "----------------------------"

# 检查Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo "Node.js版本: $NODE_VERSION"
else
    echo -e "${RED}错误: 未安装Node.js${NC}"
    exit 1
fi

# 检查npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    echo "npm版本: $NPM_VERSION"
else
    echo -e "${RED}错误: 未安装npm${NC}"
    exit 1
fi

# 检查.env文件
if [ -f "backend/.env" ]; then
    echo -e "${GREEN}✓ .env文件存在${NC}"
else
    echo -e "${YELLOW}⚠ .env文件不存在，将从.env.example复制${NC}"
    cp backend/.env.example backend/.env
    echo -e "${YELLOW}请编辑backend/.env文件，配置必要的环境变量${NC}"
    echo -e "${YELLOW}特别是LLM_API_KEY或OPENAI_API_KEY${NC}"
    exit 1
fi

echo ""

# 2. 安装依赖
echo "步骤 2: 安装依赖"
echo "----------------------------"
cd backend
npm install
check_step "依赖安装"
cd ..
echo ""

# 3. 编译TypeScript
echo "步骤 3: 编译TypeScript"
echo "----------------------------"
cd backend
npm run build
check_step "TypeScript编译"
cd ..
echo ""

# 4. 运行单元测试
echo "步骤 4: 运行单元测试"
echo "----------------------------"
cd backend
npm test -- --testPathPattern="SimpleRetriever|ContentRetriever.optimized" --silent
check_step "单元测试"
cd ..
echo ""

# 5. 检查环境变量
echo "步骤 5: 检查关键环境变量"
echo "----------------------------"
cd backend

# 检查LLM配置
if grep -q "^LLM_API_KEY=" .env || grep -q "^OPENAI_API_KEY=" .env; then
    echo -e "${GREEN}✓ LLM API密钥已配置${NC}"
else
    echo -e "${RED}✗ 未配置LLM API密钥${NC}"
    echo "请在backend/.env中配置LLM_API_KEY或OPENAI_API_KEY"
    exit 1
fi

# 检查DEBUG_MODE
if grep -q "^DEBUG_MODE=true" .env; then
    echo -e "${GREEN}✓ DEBUG_MODE已开启${NC}"
else
    echo -e "${YELLOW}⚠ DEBUG_MODE未开启，建议测试时开启${NC}"
fi

# 检查MAX_CHUNKS_PER_KEYWORD
if grep -q "^MAX_CHUNKS_PER_KEYWORD=" .env; then
    MAX_CHUNKS=$(grep "^MAX_CHUNKS_PER_KEYWORD=" .env | cut -d'=' -f2)
    echo -e "${GREEN}✓ MAX_CHUNKS_PER_KEYWORD=$MAX_CHUNKS${NC}"
else
    echo -e "${YELLOW}⚠ MAX_CHUNKS_PER_KEYWORD未配置，将使用默认值30${NC}"
fi

cd ..
echo ""

# 6. 测试总结
echo "=========================================="
echo "端到端测试准备完成"
echo "=========================================="
echo ""
echo "下一步操作："
echo "1. 启动后端服务: cd backend && npm run dev"
echo "2. 在另一个终端运行API测试"
echo "3. 验证debug信息输出"
echo ""
echo -e "${GREEN}所有检查通过！${NC}"
