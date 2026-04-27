#!/bin/bash

# Supabase 连接测试脚本

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}🔍 Supabase 连接诊断工具${NC}"
echo "========================================"
echo ""

# 检查环境变量
echo -e "${YELLOW}1. 检查环境变量...${NC}"
if [ -z "$DB_HOST" ]; then
    echo -e "${RED}❌ DB_HOST 未设置${NC}"
    echo ""
    echo "请设置环境变量："
    echo "  export DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com"
    echo "  export DB_PASSWORD=你的密码"
    echo ""
    exit 1
else
    echo -e "${GREEN}✓ DB_HOST: $DB_HOST${NC}"
fi

if [ -z "$DB_PASSWORD" ]; then
    echo -e "${RED}❌ DB_PASSWORD 未设置${NC}"
    exit 1
else
    echo -e "${GREEN}✓ DB_PASSWORD: ***${NC}"
fi

echo ""

# 测试 DNS 解析
echo -e "${YELLOW}2. 测试 DNS 解析...${NC}"
if nslookup "$DB_HOST" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ DNS 解析成功${NC}"
    nslookup "$DB_HOST" | grep -A 2 "Non-authoritative answer:"
else
    echo -e "${RED}❌ DNS 解析失败${NC}"
    echo ""
    echo "可能的原因："
    echo "  1. Supabase 项目不存在或已被删除"
    echo "  2. 主机名拼写错误"
    echo "  3. 网络连接问题"
    echo ""
    echo "请检查："
    echo "  1. 访问 https://supabase.com/dashboard"
    echo "  2. 确认项目存在"
    echo "  3. 在 Settings → Database 中获取正确的连接信息"
    echo ""
    exit 1
fi

echo ""

# 测试端口连接
echo -e "${YELLOW}3. 测试端口连接...${NC}"
if nc -z -w 5 "$DB_HOST" 5432 2>/dev/null; then
    echo -e "${GREEN}✓ 端口 5432 可访问${NC}"
else
    echo -e "${RED}❌ 端口 5432 无法访问${NC}"
    echo ""
    echo "可能的原因："
    echo "  1. 防火墙阻止连接"
    echo "  2. Supabase 项目暂停"
    echo "  3. 网络问题"
    echo ""
    exit 1
fi

echo ""

# 测试数据库连接
echo -e "${YELLOW}4. 测试数据库连接...${NC}"

# 使用 psql 测试（如果安装了）
if command -v psql >/dev/null 2>&1; then
    export PGPASSWORD="$DB_PASSWORD"
    if psql -h "$DB_HOST" -p 5432 -U postgres -d postgres -c "SELECT version();" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ 数据库连接成功${NC}"
        psql -h "$DB_HOST" -p 5432 -U postgres -d postgres -c "SELECT version();" | head -3
    else
        echo -e "${RED}❌ 数据库连接失败${NC}"
        echo ""
        echo "可能的原因："
        echo "  1. 密码错误"
        echo "  2. 用户权限不足"
        echo "  3. 数据库不存在"
        echo ""
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  psql 未安装，跳过数据库连接测试${NC}"
    echo "   可以安装 PostgreSQL 客户端进行完整测试"
fi

echo ""
echo -e "${GREEN}🎉 所有检查通过！${NC}"
echo ""
echo "现在可以运行迁移："
echo "  cd backend && npm run migrate"
echo ""
