#!/bin/bash

echo "=========================================="
echo "测试任务创建API"
echo "=========================================="
echo ""

API_URL="https://financial-compliance-monitoring-production.up.railway.app"

echo "1. 测试健康检查..."
echo "─────────────────────────────────────────"
curl -s "${API_URL}/health" | jq '.'
echo ""
echo ""

echo "2. 测试根路径..."
echo "─────────────────────────────────────────"
curl -s "${API_URL}/" | jq '.'
echo ""
echo ""

echo "3. 测试创建任务..."
echo "─────────────────────────────────────────"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API_URL}/api/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "API测试任务",
    "keywords": ["测试", "API"],
    "targetWebsites": ["https://example.com"],
    "schedule": {
      "type": "once",
      "time": "10:00"
    }
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP状态码: $HTTP_CODE"
echo "响应内容:"
echo "$BODY" | jq '.'
echo ""

if [ "$HTTP_CODE" = "201" ]; then
  echo "✅ 任务创建成功！"
  TASK_ID=$(echo "$BODY" | jq -r '.taskId')
  echo "任务ID: $TASK_ID"
  echo ""
  echo "请在Supabase中执行以下SQL验证："
  echo "SELECT * FROM tasks WHERE id = '$TASK_ID';"
elif [ "$HTTP_CODE" = "401" ]; then
  echo "❌ 认证失败 - DEMO_MODE可能未启用"
  echo "请在Railway中添加环境变量: DEMO_MODE=true"
elif [ "$HTTP_CODE" = "500" ]; then
  echo "❌ 服务器内部错误"
  echo "请检查Railway部署日志"
else
  echo "❌ 请求失败"
  echo "请检查网络连接和API地址"
fi

echo ""
echo "=========================================="
echo "测试完成"
echo "=========================================="
