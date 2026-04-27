#!/bin/bash

# Financial Compliance Monitoring System - Setup Script
# This script helps set up the development environment

set -e

echo "=========================================="
echo "金融合规政策监测系统 - 环境设置"
echo "=========================================="
echo ""

# Check Node.js version
echo "检查 Node.js 版本..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装。请安装 Node.js >= 18.x"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 版本过低。需要 >= 18.x，当前版本: $(node -v)"
    exit 1
fi
echo "✓ Node.js 版本: $(node -v)"

# Check npm
echo "检查 npm..."
if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装"
    exit 1
fi
echo "✓ npm 版本: $(npm -v)"

# Check PostgreSQL
echo "检查 PostgreSQL..."
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL 命令行工具未找到"
    echo "   请确保 PostgreSQL 已安装并运行"
else
    echo "✓ PostgreSQL 已安装"
fi

# Check Redis
echo "检查 Redis..."
if ! command -v redis-cli &> /dev/null; then
    echo "⚠️  Redis 命令行工具未找到"
    echo "   请确保 Redis 已安装并运行"
else
    echo "✓ Redis 已安装"
fi

echo ""
echo "=========================================="
echo "安装依赖"
echo "=========================================="

# Install root dependencies
echo "安装根目录依赖..."
npm install

# Install backend dependencies
echo "安装后端依赖..."
cd backend && npm install && cd ..

# Install frontend dependencies
echo "安装前端依赖..."
cd frontend && npm install && cd ..

echo "✓ 所有依赖安装完成"

echo ""
echo "=========================================="
echo "配置环境变量"
echo "=========================================="

# Setup backend .env
if [ ! -f backend/.env ]; then
    echo "创建后端环境变量文件..."
    cp backend/.env.example backend/.env
    echo "✓ 已创建 backend/.env"
    echo "  请编辑此文件填入实际配置"
else
    echo "✓ backend/.env 已存在"
fi

# Setup frontend .env
if [ ! -f frontend/.env ]; then
    echo "创建前端环境变量文件..."
    cp frontend/.env.example frontend/.env
    echo "✓ 已创建 frontend/.env"
else
    echo "✓ frontend/.env 已存在"
fi

echo ""
echo "=========================================="
echo "设置完成！"
echo "=========================================="
echo ""
echo "下一步："
echo "1. 启动 PostgreSQL 和 Redis (或使用 docker-compose up -d)"
echo "2. 创建数据库: createdb financial_compliance"
echo "3. 运行数据库迁移: cd backend && npm run migrate"
echo "4. 启动后端: npm run dev:backend"
echo "5. 启动前端: npm run dev:frontend"
echo ""
echo "访问应用:"
echo "- 前端: http://localhost:5173"
echo "- 后端: http://localhost:3000"
echo ""
