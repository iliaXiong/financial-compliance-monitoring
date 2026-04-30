#!/bin/bash

# 验证测试环境部署脚本

set -e

echo "=========================================="
echo "验证阶段一优化部署"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# 检查函数
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ $1${NC}"
        return 0
    else
        echo -e "${RED}✗ $1 失败${NC}"
        return 1
    fi
}

# 获取后端URL
echo -e "${CYAN}请输入你的Render后端URL:${NC}"
read -p "Backend URL (例如: https://your-app.onrender.com): " BACKEND_URL

if [ -z "$BACKEND_URL" ]; then
    echo -e "${RED}错误: Backend URL不能为空${NC}"
    exit 1
fi

echo ""
echo "=========================================="
echo "步骤 1: 检查后端健康状态"
echo "=========================================="
echo ""

HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/health")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$HEALTH_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ 后端服务正常运行${NC}"
    echo "响应: $RESPONSE_BODY"
else
    echo -e "${RED}✗ 后端服务异常 (HTTP $HTTP_CODE)${NC}"
    echo "响应: $RESPONSE_BODY"
    exit 1
fi

echo ""
echo "=========================================="
echo "步骤 2: 检查数据库连接"
echo "=========================================="
echo ""

if echo "$RESPONSE_BODY" | grep -q '"database":"up"'; then
    echo -e "${GREEN}✓ 数据库连接正常${NC}"
else
    echo -e "${RED}✗ 数据库连接失败${NC}"
    exit 1
fi

echo ""
echo "=========================================="
echo "步骤 3: 检查任务队列"
echo "=========================================="
echo ""

if echo "$RESPONSE_BODY" | grep -q '"queue":"pg-boss"'; then
    echo -e "${GREEN}✓ 任务队列正常 (pg-boss)${NC}"
else
    echo -e "${YELLOW}⚠ 任务队列状态未知${NC}"
fi

echo ""
echo "=========================================="
echo "步骤 4: 测试API端点"
echo "=========================================="
echo ""

# 测试任务列表API
echo "测试 GET /api/tasks..."
TASKS_RESPONSE=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/api/tasks")
TASKS_HTTP_CODE=$(echo "$TASKS_RESPONSE" | tail -n1)

if [ "$TASKS_HTTP_CODE" = "200" ] || [ "$TASKS_HTTP_CODE" = "401" ]; then
    echo -e "${GREEN}✓ 任务API端点可访问${NC}"
else
    echo -e "${RED}✗ 任务API端点异常 (HTTP $TASKS_HTTP_CODE)${NC}"
fi

echo ""
echo "=========================================="
echo "步骤 5: 检查环境变量配置"
echo "=========================================="
echo ""

echo -e "${YELLOW}请在Render Dashboard检查以下环境变量:${NC}"
echo ""
echo "必需的阶段一优化变量:"
echo "  - DEBUG_MODE=true"
echo "  - MAX_CHUNKS_PER_KEYWORD=30"
echo "  - CHUNK_MAX_SIZE=500"
echo "  - CHUNK_MIN_SIZE=100"
echo "  - CHUNK_OVERLAP=50"
echo ""
read -p "环境变量已配置? (y/n): " ENV_CONFIGURED

if [ "$ENV_CONFIGURED" = "y" ]; then
    echo -e "${GREEN}✓ 环境变量已配置${NC}"
else
    echo -e "${YELLOW}⚠ 请配置环境变量后重启服务${NC}"
fi

echo ""
echo "=========================================="
echo "步骤 6: 检查部署日志"
echo "=========================================="
echo ""

echo -e "${YELLOW}请在Render Dashboard查看日志，确认以下内容:${NC}"
echo ""
echo "1. 构建日志应包含:"
echo "   - npm install 成功"
echo "   - npm run build 成功"
echo "   - natural@8.1.1 安装成功"
echo ""
echo "2. 运行日志应包含:"
echo "   - Server started on port 3000"
echo "   - Database connected"
echo "   - pg-boss started"
echo ""
echo "3. 如果DEBUG_MODE=true，应该看到:"
echo "   - [ContentRetriever] Using optimized LLM search"
echo "   - [SimpleRetriever] Built index with X chunks"
echo "   - DEBUG INFO 输出"
echo ""
read -p "日志检查完成? (y/n): " LOGS_CHECKED

if [ "$LOGS_CHECKED" = "y" ]; then
    echo -e "${GREEN}✓ 日志检查完成${NC}"
else
    echo -e "${YELLOW}⚠ 请检查日志确认部署正常${NC}"
fi

echo ""
echo "=========================================="
echo "步骤 7: 创建测试任务（可选）"
echo "=========================================="
echo ""

read -p "是否创建测试任务? (y/n): " CREATE_TEST

if [ "$CREATE_TEST" = "y" ]; then
    echo ""
    echo "请提供认证token:"
    read -sp "JWT Token: " JWT_TOKEN
    echo ""
    
    if [ -n "$JWT_TOKEN" ]; then
        echo ""
        echo "创建测试任务..."
        
        TEST_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BACKEND_URL/api/tasks" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $JWT_TOKEN" \
            -d '{
                "name": "阶段一优化测试",
                "websites": ["https://example.com"],
                "keywords": ["example", "domain"],
                "schedule": "manual"
            }')
        
        TEST_HTTP_CODE=$(echo "$TEST_RESPONSE" | tail -n1)
        TEST_BODY=$(echo "$TEST_RESPONSE" | head -n-1)
        
        if [ "$TEST_HTTP_CODE" = "201" ] || [ "$TEST_HTTP_CODE" = "200" ]; then
            echo -e "${GREEN}✓ 测试任务创建成功${NC}"
            echo "响应: $TEST_BODY"
            
            # 提取任务ID
            TASK_ID=$(echo "$TEST_BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
            
            if [ -n "$TASK_ID" ]; then
                echo ""
                echo -e "${CYAN}任务ID: $TASK_ID${NC}"
                echo "查看任务详情: $BACKEND_URL/api/tasks/$TASK_ID"
                echo ""
                echo "请在Render日志中查看debug信息"
            fi
        else
            echo -e "${RED}✗ 测试任务创建失败 (HTTP $TEST_HTTP_CODE)${NC}"
            echo "响应: $TEST_BODY"
        fi
    else
        echo -e "${YELLOW}⚠ 未提供token，跳过测试任务创建${NC}"
    fi
else
    echo -e "${YELLOW}跳过测试任务创建${NC}"
fi

echo ""
echo "=========================================="
echo "验证总结"
echo "=========================================="
echo ""

echo -e "${GREEN}✓ 完成的检查:${NC}"
echo "  - 后端健康状态"
echo "  - 数据库连接"
echo "  - 任务队列状态"
echo "  - API端点可访问性"
echo ""

echo -e "${YELLOW}需要手动检查:${NC}"
echo "  - Render Dashboard环境变量"
echo "  - Render Dashboard日志"
echo "  - Debug信息输出"
echo "  - 性能指标"
echo ""

echo -e "${CYAN}下一步行动:${NC}"
echo "1. 在Render Dashboard查看完整日志"
echo "2. 创建真实任务测试功能"
echo "3. 收集性能数据（Token使用、成本、响应时间）"
echo "4. 验证Debug信息完整性"
echo "5. 对比优化前后的性能"
echo ""

echo -e "${GREEN}部署验证完成！${NC}"
echo ""
echo "详细文档:"
echo "  - 测试环境部署指南.md"
echo "  - 阶段一优化快速参考.md"
echo "  - 部署验证报告.md"
echo ""
