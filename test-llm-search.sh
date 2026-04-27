#!/bin/bash

# 测试LLM搜索功能的脚本

echo "========================================="
echo "测试LLM智能搜索功能"
echo "========================================="
echo ""

# 检查后端服务是否运行
echo "1. 检查后端服务状态..."
if curl -s http://localhost:3000/health > /dev/null; then
    echo "✓ 后端服务正在运行"
else
    echo "✗ 后端服务未运行，请先启动服务"
    exit 1
fi
echo ""

# 检查LLM API配置
echo "2. 检查LLM API配置..."
if docker exec financial-compliance-backend printenv | grep -q "LLM_API_KEY"; then
    echo "✓ LLM_API_KEY 已配置"
else
    echo "⚠ LLM_API_KEY 未配置，将使用降级方案"
fi
echo ""

# 创建测试任务
echo "3. 创建测试任务..."
TASK_RESPONSE=$(curl -s -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "name": "LLM搜索测试",
    "keywords": ["professional subscriber"],
    "targetWebsites": ["https://www.nyse.com"],
    "schedule": {
      "type": "once"
    }
  }')

TASK_ID=$(echo $TASK_RESPONSE | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TASK_ID" ]; then
    echo "✗ 创建任务失败"
    echo "响应: $TASK_RESPONSE"
    exit 1
fi

echo "✓ 任务创建成功，ID: $TASK_ID"
echo ""

# 手动触发执行
echo "4. 触发任务执行..."
EXEC_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/tasks/$TASK_ID/execute")
EXEC_ID=$(echo $EXEC_RESPONSE | grep -o '"executionId":"[^"]*"' | cut -d'"' -f4)

if [ -z "$EXEC_ID" ]; then
    echo "✗ 触发执行失败"
    echo "响应: $EXEC_RESPONSE"
    exit 1
fi

echo "✓ 执行已触发，ID: $EXEC_ID"
echo ""

# 等待执行完成
echo "5. 等待执行完成（最多120秒）..."
for i in {1..24}; do
    sleep 5
    STATUS=$(curl -s "http://localhost:3000/api/executions/$EXEC_ID" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    
    if [ "$STATUS" = "completed" ]; then
        echo "✓ 执行完成"
        break
    elif [ "$STATUS" = "failed" ]; then
        echo "✗ 执行失败"
        curl -s "http://localhost:3000/api/executions/$EXEC_ID" | jq .
        exit 1
    else
        echo "  等待中... ($i/24) 状态: $STATUS"
    fi
done
echo ""

# 查看执行结果
echo "6. 查看执行结果..."
RESULT=$(curl -s "http://localhost:3000/api/executions/$EXEC_ID")

# 检查是否找到关键词
FOUND=$(echo $RESULT | grep -o '"found":true')

if [ -n "$FOUND" ]; then
    echo "✓ 成功找到关键词！"
    echo ""
    echo "详细结果:"
    echo $RESULT | jq '.results[] | {keyword, found, sourceUrl, context}'
else
    echo "✗ 未找到关键词"
    echo ""
    echo "详细结果:"
    echo $RESULT | jq .
fi
echo ""

# 查看后端日志
echo "7. 查看后端日志（最后30行）..."
echo "----------------------------------------"
docker logs financial-compliance-backend --tail 30
echo "----------------------------------------"
echo ""

echo "========================================="
echo "测试完成"
echo "========================================="
