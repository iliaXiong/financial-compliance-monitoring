-- 创建演示用户
-- 用于DEMO_MODE=true时的演示访问

INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'demo@example.com',
  '$2b$10$dummyhashfordemopurposesonly',  -- 演示用的密码哈希（不会被使用）
  'Demo User',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO NOTHING;  -- 如果已存在则跳过

-- 验证用户已创建
SELECT id, email, name, created_at FROM users WHERE id = '00000000-0000-0000-0000-000000000000';
