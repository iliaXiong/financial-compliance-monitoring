# 如何获取正确的 Supabase Reference ID

## 问题
数据库连接失败，错误信息：
- Connection Pooler: "Tenant or user not found"
- Direct Connection: "getaddrinfo ENOTFOUND"

这说明 Reference ID 不正确。

## Reference ID vs 项目名称

⚠️ **重要区别**：
- **项目名称**：你创建项目时输入的名字（如 "financial-compliance-monitoring"）
- **Reference ID**：Supabase 自动生成的唯一标识符（如 "abcdefghijklmnop"）

## 如何找到正确的 Reference ID

### 方法 1：从 Supabase Dashboard

1. 访问 https://supabase.com/dashboard
2. 点击你的项目
3. 点击左侧 **Settings** (齿轮图标)
4. 点击 **General**
5. 在 "General settings" 部分找到：
   ```
   Reference ID: ynbaatdsceqtqwmqhlgu  ← 这个就是！
   ```

### 方法 2：从 Connection String

1. 在 Supabase Dashboard 中
2. 点击 **Settings** → **Database**
3. 找到 "Connection string" 部分
4. 查看 URI 格式的连接字符串：
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.ynbaatdsceqtqwmqhlgu.supabase.co:5432/postgres
                                              ^^^^^^^^^^^^^^^^
                                              这部分就是 Reference ID
   ```

### 方法 3：从 Connection Pooler

1. 在 **Settings** → **Database** 页面
2. 滚动到 "Connection Pooling" 部分
3. 查看 Host：
   ```
   Host: aws-0-ap-southeast-1.pooler.supabase.com
   Connection string:
   postgresql://postgres.ynbaatdsceqtqwmqhlgu:[YOUR-PASSWORD]@...
                         ^^^^^^^^^^^^^^^^
                         这部分就是 Reference ID
   ```

## Reference ID 的特征

✅ 正确的 Reference ID：
- 长度：16 个字符
- 格式：小写字母组成
- 示例：`ynbaatdsceqtqwmqhlgu`

❌ 不是 Reference ID：
- 项目名称：`financial-compliance-monitoring`
- 包含大写字母
- 包含特殊字符（除了字母）

## 下一步

找到正确的 Reference ID 后，运行：

```bash
./使用直连运行迁移.sh
```

输入正确的 Reference ID 和数据库密码。

## 常见问题

### Q: 我确定 Reference ID 是对的，但还是连接失败？

A: 可能的原因：
1. **项目还在创建中**：新项目需要 2-3 分钟才能完全启动
2. **密码错误**：确认数据库密码（创建项目时设置的）
3. **网络问题**：检查防火墙或 VPN 设置
4. **项目暂停**：免费项目 7 天不活动会暂停，需要在 Dashboard 中恢复

### Q: 如何验证 Reference ID 是否正确？

A: 运行测试脚本：
```bash
cd backend
node test-connection.js
```

如果看到 "✅ SUCCESS"，说明 Reference ID 正确。

### Q: 我忘记了数据库密码怎么办？

A: 在 Supabase Dashboard：
1. Settings → Database
2. 点击 "Reset database password"
3. 设置新密码
4. 更新你的 .env 文件

## 需要帮助？

如果仍然无法连接，请提供：
1. 完整的错误信息
2. 你的 Reference ID（前 4 个字符即可）
3. 项目创建时间（是否超过 5 分钟）
