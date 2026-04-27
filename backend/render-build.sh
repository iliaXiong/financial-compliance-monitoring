#!/bin/bash

# Render 构建脚本
# 在 Render 上自动运行

set -e

echo "📦 安装依赖..."
npm install

echo "🔨 构建项目..."
npm run build

echo "✅ 构建完成！"
