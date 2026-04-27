#!/bin/bash

# Supabase 连接问题快速修复脚本

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}🔧 Supabase 连接问题修复助手${NC}"
echo "========================================"
echo ""

echo -e "${YELLOW}问题诊断：${NC}"
echo "你遇到的错误表示 Supabase 主机名无法解析。"
echo ""
echo "可能的原因："
echo "  1. Supabase 项目不存在或已被删除"
echo "  2. 主机名拼写错误"
echo "  3. 环境变量未正确设置"
echo ""

read -p "是否已经有 Supabase 项目？(y/n): " HAS_PROJECT

if [ "$HAS_PROJECT" != "y" ]; then
    echo ""
    echo -e "${CYAN}📝 创建新的 Supabase 项目${NC}"
    echo "========================================"
    echo ""
    echo "请按照以下步骤操作："
    echo ""
    echo "1. 访问 https://supabase.com/dashboard"
    echo "2. 点击 'New Project'"
    echo "3. 填写项目信息："
    echo "   - Name: financial-compliance-monitoring"
    echo "   - Database Password: 设置一个强密码（保存好！）"
    echo "   - Region: 选择离你最近的区域"
    echo "4. 点击 'Create new project'"
    echo "5. 等待 2-3 分钟"
    echo ""
    read -p "完成后按 Enter 继续..."
fi

echo ""
echo -e "${CYAN}📋 获取连接信息${NC}"
echo "========================================"
echo ""
echo "请在 Supabase Dashboard 完成以下操作："
echo ""
echo "1. 选择你的项目"
echo "2. 点击 Settings → Database"
echo "3. 找到 'Connection string' 部分"
echo "4. 选择 'URI' 模式"
echo "5. 复制连接字符串"
echo ""
echo "连接字符串格式："
echo "  postgresql://postgres:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
echo ""
read -p "完成后按 Enter 继续..."

echo ""
echo -e "${CYAN}🔑 输入连接信息${NC}"
echo "========================================"
echo ""

read -p "DB_HOST (例如: aws-0-ap-southeast-1.pooler.supabase.com): " DB_HOST
read -sp "DB_PASSWORD: " DB_PASSWORD
echo ""

if [ -z "$DB_HOST" ] || [ -z "$DB_PASSWORD" ]; then
    echo -e "${RED}❌ 连接信息不能为空${NC}"
    exit 1
fi

# 导出环境变量
export DB_HOST="$DB_HOST"
export DB_PORT=5432
export DB_NAME=postgres
export DB_USER=postgres
export DB_PASSWORD="$DB_PASSWORD"

echo ""
echo -e "${CYAN}🧪 测试连接${NC}"
echo "========================================"
echo ""

# 测试 DNS 解析
echo "1. 测试 DNS 解析..."
if nslookup "$DB_HOST" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ DNS 解析成功${NC}"
else
    echo -e "${RED}❌ DNS 解析失败${NC}"
    echo ""
    echo "请检查："
    echo "  1. 主机名是否正确"
    echo "  2. Supabase 项目是否存在"
    echo "  3. 网络连接是否正常"
    echo ""
    exit 1
fi

# 测试端口
echo "2. 测试端口连接..."
if nc -z -w 5 "$DB_HOST" 5432 2>/dev/null; then
    echo -e "${GREEN}✓ 端口 5432 可访问${NC}"
else
    echo -e "${RED}❌ 端口 5432 无法访问${NC}"
    echo ""
    echo "可能的原因："
    echo "  1. 防火墙阻止连接"
    echo "  2. Supabase 项目暂停"
    echo ""
    exit 1
fi

echo ""
echo -e "${GREEN}✅ 连接测试通过！${NC}"
echo ""

# 保存环境变量到文件
echo -e "${CYAN}💾 保存配置${NC}"
echo "========================================"
echo ""

cat > backend/.env.local << EOF
# Supabase 数据库配置
DB_HOST=$DB_HOST
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=$DB_PASSWORD
EOF

echo -e "${GREEN}✓ 配置已保存到 backend/.env.local${NC}"
echo ""

# 询问是否运行迁移
read -p "是否立即运行数据库迁移？(y/n): " RUN_MIGRATE

if [ "$RUN_MIGRATE" = "y" ]; then
    echo ""
    echo -e "${CYAN}🚀 运行数据库迁移${NC}"
    echo "========================================"
    echo ""
    
    cd backend
    
    # 检查依赖
    if [ ! -d "node_modules" ]; then
        echo "安装依赖..."
        npm install
    fi
    
    # 运行迁移
    echo "运行迁移..."
    npm run migrate
    
    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}🎉 迁移成功！${NC}"
        echo ""
        echo "下一步："
        echo "  1. 继续部署到 Render"
        echo "  2. 查看 快速部署指南.md"
        echo ""
    else
        echo ""
        echo -e "${RED}❌ 迁移失败${NC}"
        echo ""
        echo "请检查："
        echo "  1. 数据库密码是否正确"
        echo "  2. 查看错误信息"
        echo "  3. 参考 数据库连接问题修复指南.md"
        echo ""
        exit 1
    fi
else
    echo ""
    echo "稍后可以手动运行迁移："
    echo "  export DB_HOST=$DB_HOST"
    echo "  export DB_PASSWORD=你的密码"
    echo "  cd backend && npm run migrate"
    echo ""
fi

echo -e "${GREEN}🎉 完成！${NC}"
echo ""
