#!/bin/bash

# 快速修复Railway环境变量
# 用于恢复丢失的LLM配置

echo "🔧 开始修复Railway环境变量..."
echo ""

# 检查Railway CLI是否安装
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI未安装"
    echo "请运行: npm install -g @railway/cli"
    echo "或访问: https://docs.railway.app/develop/cli"
    exit 1
fi

echo "✅ Railway CLI已安装"
echo ""

# 检查是否已登录
echo "📝 检查Railway登录状态..."
if ! railway whoami &> /dev/null; then
    echo "❌ 未登录Railway"
    echo "请运行: railway login"
    exit 1
fi

echo "✅ 已登录Railway"
echo ""

# 设置LLM环境变量
echo "🔑 设置LLM环境变量..."
echo ""

echo "设置 LLM_API_KEY..."
railway variables set LLM_API_KEY=dcb0d1c8-82c7-478f-bd9a-7c3023cac4d8

echo "设置 LLM_API_URL..."
railway variables set LLM_API_URL=https://office.webullbroker.com/api/oa-ai/open/chat/completions

echo "设置 LLM_MODEL..."
railway variables set LLM_MODEL=us.anthropic.claude-sonnet-4-20250514-v1:0

echo "设置 LLM_API_KEY_HEADER..."
railway variables set LLM_API_KEY_HEADER=authorization

echo "设置 LLM_AUTH_PREFIX..."
railway variables set LLM_AUTH_PREFIX=Bearer

echo ""
echo "✅ LLM环境变量设置完成"
echo ""

# 验证设置
echo "🔍 验证环境变量..."
echo ""

if railway variables | grep -q "LLM_API_KEY"; then
    echo "✅ LLM_API_KEY 已设置"
else
    echo "❌ LLM_API_KEY 未找到"
fi

if railway variables | grep -q "LLM_API_URL"; then
    echo "✅ LLM_API_URL 已设置"
else
    echo "❌ LLM_API_URL 未找到"
fi

if railway variables | grep -q "LLM_MODEL"; then
    echo "✅ LLM_MODEL 已设置"
else
    echo "❌ LLM_MODEL 未找到"
fi

echo ""
echo "🎉 修复完成！"
echo ""
echo "📝 下一步："
echo "1. Railway会自动重新部署（约2-3分钟）"
echo "2. 等待部署完成后，创建新任务测试"
echo "3. 查看Railway日志确认LLM API调用成功"
echo ""
echo "💡 提示："
echo "- 查看所有变量: railway variables"
echo "- 查看日志: railway logs"
echo "- 重新部署: railway up"
