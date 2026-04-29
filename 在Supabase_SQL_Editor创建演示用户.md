# 在Supabase SQL Editor中创建演示用户

## 问题
创建任务时显示"数据库约束违反"，因为演示用户ID在数据库中不存在。

## 解决方案
在Supabase SQL Editor中直接执行SQL创建演示用户。

## 操作步骤

### 1. 打开Supabase SQL Editor

1. 访问 https://supabase.com/dashboard
2. 选择你的项目（Project ID: `ynbaatdsceqtqwmqhlgu`）
3. 在左侧菜单中点击 "SQL Editor"
4. 点击 "New query" 创建新查询

### 2. 执行以下SQL

复制并粘贴以下SQL到编辑器中：

```sql
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
SELECT id, email, name, created_at 
FROM users 
WHERE id = '00000000-0000-0000-0000-000000000000';
```

### 3. 运行查询

1. 点击右下角的 "Run" 按钮（或按 Ctrl+Enter / Cmd+Enter）
2. 查看结果，应该显示：
   ```
   id: 00000000-0000-0000-0000-000000000000
   email: demo@example.com
   name: Demo User
   created_at: [当前时间]
   ```

### 4. 验证

1. 返回前端应用: https://financial-compliance-monitoring.vercel.app
2. 尝试创建一个新任务
3. 应该能够成功创建，不再显示"数据库约束违反"错误

## 为什么需要这个用户？

当 `DEMO_MODE=true` 时：
- 后端会自动为所有请求使用用户ID `00000000-0000-0000-0000-000000000000`
- 但数据库的 `tasks` 表有外键约束：`user_id REFERENCES users(id)`
- 如果这个用户不存在，创建任务时会违反外键约束
- 创建这个演示用户后，所有任务都会关联到这个用户

## 技术说明

- 用户ID: `00000000-0000-0000-0000-000000000000` (固定的UUID)
- Email: `demo@example.com`
- Password Hash: 演示用的哈希值（不会被使用，因为演示模式跳过认证）
- `ON CONFLICT (id) DO NOTHING`: 如果用户已存在则跳过，避免重复插入错误

## 故障排查

如果执行SQL时出错：

1. **错误: relation "users" does not exist**
   - 说明users表还没创建
   - 需要先运行完整的数据库迁移脚本

2. **错误: duplicate key value violates unique constraint**
   - 说明用户已经存在
   - 这是正常的，可以忽略
   - 直接运行验证查询确认用户存在

3. **错误: permission denied**
   - 检查你是否有数据库的写权限
   - 确保使用的是项目所有者账号
