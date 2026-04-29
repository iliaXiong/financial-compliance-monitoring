#!/bin/bash

# 在Supabase中创建演示用户
# 用于DEMO_MODE=true时的演示访问

echo "=========================================="
echo "在Supabase中创建演示用户"
echo "=========================================="
echo ""

# Supabase连接信息
DB_HOST="aws-0-ap-southeast-1.pooler.supabase.com"
DB_PORT="6543"
DB_NAME="postgres"
DB_USER="postgres.ynbaatdsceqtqwmqhlgu"
DB_PASSWORD="KhpGTR6dMFzZz7qq"

# 构建连接字符串
CONNECTION_STRING="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=require"

echo "正在连接到Supabase数据库..."
echo ""

# 执行SQL
psql "$CONNECTION_STRING" << 'EOF'
-- 创建演示用户
INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'demo@example.com',
  '$2b$10$dummyhashfordemopurposesonly',
  'Demo User',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO NOTHING;

-- 验证用户已创建
SELECT 
  id, 
  email, 
  name, 
  created_at 
FROM users 
WHERE id = '00000000-0000-0000-0000-000000000000';
EOF

if [ $? -eq 0 ]; then
  echo ""
  echo "=========================================="
  echo "✅ 演示用户创建成功！"
  echo "=========================================="
  echo ""
  echo "用户信息："
  echo "  ID: 00000000-0000-0000-0000-000000000000"
  echo "  Email: demo@example.com"
  echo "  Name: Demo User"
  echo ""
  echo "现在可以在前端创建任务了！"
else
  echo ""
  echo "=========================================="
  echo "❌ 创建演示用户失败"
  echo "=========================================="
  echo ""
  echo "请检查："
  echo "1. 数据库连接信息是否正确"
  echo "2. users表是否已创建"
  echo "3. 网络连接是否正常"
  exit 1
fi
