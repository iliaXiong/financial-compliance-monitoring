#!/bin/bash

# 部署状态检查脚本
# 验证所有服务是否正常运行

set -e

echo "🔍 金融合规监测系统 - 部署状态检查"
echo "======================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查函数
check_service() {
    local name=$1
    local url=$2
    local expected=$3
    
    echo -n "检查 $name... "
    
    if response=$(curl -s -f "$url" 2>&1); then
        if [ -n "$expected" ]; then
            if echo "$response" | grep -q "$expected"; then
                echo -e "${GREEN}✅ 正常${NC}"
                return 0
            else
                echo -e "${YELLOW}⚠️  响应异常${NC}"
                echo "  预期: $expected"
                echo "  实际: $response"
                return 1
            fi
        else
            echo -e "${GREEN}✅ 正常${NC}"
            return 0
        fi
    else
        echo -e "${RED}❌ 失败${NC}"
        echo "  错误: $response"
        return 1
    fi
}

# 获取 URL
echo "请输入部署的 URL："
echo ""
read -p "后端 URL (例如: https://your-app.railway.app): " BACKEND_URL
read -p "前端 URL (例如: https://your-app.vercel.app): " FRONTEND_URL

if [ -z "$BACKEND_URL" ] || [ -z "$FRONTEND_URL" ]; then
    echo -e "${RED}❌ URL 不能为空${NC}"
    exit 1
fi

echo ""
echo "======================================"
echo "开始检查..."
echo "======================================"
echo ""

# 检查计数
total=0
passed=0

# 1. 检查后端健康检查
echo -e "${BLUE}[1/5] 后端服务${NC}"
if check_service "健康检查" "${BACKEND_URL}/health" "ok"; then
    ((passed++))
fi
((total++))
echo ""

# 2. 检查后端 API
echo -e "${BLUE}[2/5] 后端 API${NC}"
if check_service "API 端点" "${BACKEND_URL}/api/auth/me" ""; then
    ((passed++))
fi
((total++))
echo ""

# 3. 检查前端
echo -e "${BLUE}[3/5] 前端服务${NC}"
if check_service "前端页面" "${FRONTEND_URL}" ""; then
    ((passed++))
fi
((total++))
echo ""

# 4. 检查前端资源
echo -e "${BLUE}[4/5] 前端资源${NC}"
if check_service "静态资源" "${FRONTEND_URL}/assets" ""; then
    ((passed++))
fi
((total++))
echo ""

# 5. 检查 CORS
echo -e "${BLUE}[5/5] CORS 配置${NC}"
echo -n "检查 CORS... "
cors_response=$(curl -s -I -X OPTIONS \
    -H "Origin: ${FRONTEND_URL}" \
    -H "Access-Control-Request-Method: GET" \
    "${BACKEND_URL}/api/tasks" 2>&1)

if echo "$cors_response" | grep -qi "access-control-allow-origin"; then
    echo -e "${GREEN}✅ 正常${NC}"
    ((passed++))
else
    echo -e "${YELLOW}⚠️  可能存在问题${NC}"
    echo "  请确保后端配置了正确的 CORS"
fi
((total++))
echo ""

# 总结
echo "======================================"
echo "检查完成"
echo "======================================"
echo ""
echo "结果: ${passed}/${total} 项通过"
echo ""

if [ $passed -eq $total ]; then
    echo -e "${GREEN}🎉 所有检查通过！系统运行正常。${NC}"
    echo ""
    echo "下一步："
    echo "  1. 访问前端: ${FRONTEND_URL}"
    echo "  2. 注册账号并登录"
    echo "  3. 创建测试任务"
    echo "  4. 验证功能"
    exit 0
elif [ $passed -ge $((total * 3 / 4)) ]; then
    echo -e "${YELLOW}⚠️  大部分检查通过，但存在一些问题。${NC}"
    echo ""
    echo "建议："
    echo "  1. 查看上面的错误信息"
    echo "  2. 检查服务日志"
    echo "  3. 验证环境变量配置"
    exit 1
else
    echo -e "${RED}❌ 多项检查失败，请排查问题。${NC}"
    echo ""
    echo "故障排除："
    echo "  1. 检查 Railway 服务是否运行: railway status"
    echo "  2. 查看后端日志: railway logs"
    echo "  3. 查看前端日志: vercel logs"
    echo "  4. 验证环境变量: railway variables"
    echo "  5. 查看部署文档: VERCEL_SUPABASE_DEPLOYMENT.md"
    exit 1
fi
