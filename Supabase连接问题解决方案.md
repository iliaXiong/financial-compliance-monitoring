# Supabase 连接问题解决方案

## 当前问题

所有连接方式都失败：
- ❌ Direct Connection (5432): DNS 解析失败
- ❌ Transaction Pooler (6543): "Tenant or user not found"
- ❌ Session Pooler (6543): "Tenant or user not found"

项目状态：✅ Active
Reference ID：`ynbaatdsceqtqwmqhlgu`

## 可能的原因

根据截图显示的 **"Not IPv4 compatible"** 警告，这是一个 IPv6 项目，但你的网络可能只支持 IPv4。

## 解决方案

### 方案 1：启用 Connection Pooling（推荐）

1. 进入 Supabase Dashboard
2. Settings → Database
3. 滚动到 **"Connection Pooling"** 部分
4. 如果看到 **"Enable Connection Pooling"** 按钮，点击启用
5. 选择 **Pool Mode**：
   - **Transaction** (推荐用于迁移)
   - 或 **Session**
6. 启用后会显示新的连接信息

### 方案 2：购买 IPv4 Add-on

如果你需要直连（不使用 Pooler）：

1. 在 Supabase Dashboard
2. Settings → Add-ons
3. 购买 **IPv4 Add-on**
4. 这样 `db.ynbaatdsceqtqwmqhlgu.supabase.co` 就能解析了

### 方案 3：使用 Supabase SQL Editor 手动创建表

如果连接问题无法解决，可以手动运行迁移：

1. 在 Supabase Dashboard
2. 点击 **SQL Editor**
3. 点击 **New Query**
4. 复制粘贴迁移 SQL 文件内容
5. 点击 **Run** 执行

迁移文件位置：
```
backend/src/database/migrations/001_create_users_table.sql
backend/src/database/migrations/002_create_tasks_table.sql
backend/src/database/migrations/003_create_executions_table.sql
backend/src/database/migrations/004_create_retrieval_results_table.sql
backend/src/database/migrations/005_create_original_contents_table.sql
backend/src/database/migrations/006_create_summary_documents_table.sql
backend/src/database/migrations/007_create_comparison_reports_table.sql
backend/src/database/migrations/008_create_cross_site_analyses_table.sql
```

### 方案 4：重新创建项目（最后手段）

如果以上都不行：

1. 在 Supabase Dashboard 创建新项目
2. **重要**：选择 **IPv4 compatible** 选项（如果有）
3. 或者在创建时选择启用 Connection Pooling
4. 使用新项目的 Reference ID

## 下一步

请先尝试 **方案 1** 或 **方案 3**：

### 如果选择方案 1（启用 Connection Pooling）：
告诉我启用后显示的连接信息

### 如果选择方案 3（手动创建表）：
运行以下命令生成完整的 SQL：

```bash
cat backend/src/database/migrations/*.sql > complete-migration.sql
```

然后在 Supabase SQL Editor 中运行 `complete-migration.sql` 的内容。

## 临时解决方案：跳过迁移，直接部署

如果你想先部署看效果，可以：

1. 在 Supabase SQL Editor 中手动创建表
2. 直接部署后端到 Render（使用 Connection Pooler 配置）
3. 部署前端到 Vercel

这样至少可以让系统运行起来，之后再解决连接问题。

需要我帮你生成完整的 SQL 脚本吗？
