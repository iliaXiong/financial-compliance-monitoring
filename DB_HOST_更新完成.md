# ✅ DB_HOST 更新完成

## 更新内容

已将所有文档和脚本中的 Supabase DB_HOST 示例更新为新地址。

### 旧地址
```
db.xxx.supabase.co
```

### 新地址
```
aws-0-ap-southeast-1.pooler.supabase.com
```

---

## 更新的文件（25 个）

### 部署指南文档
- ✅ RENDER_SUPABASE_VERCEL_部署指南.md
- ✅ 快速部署指南.md
- ✅ 开始部署.md
- ✅ 部署检查清单.md
- ✅ 数据库连接问题修复指南.md
- ✅ DEPLOY_NOW.md
- ✅ DEPLOY_SUPABASE_COMPLETE.md
- ✅ DEPLOY_SUPABASE_ONLY.md
- ✅ DEPLOYMENT_COMMANDS.md
- ✅ DEPLOYMENT_COMPLETE.md
- ✅ DEPLOYMENT_SUMMARY.md
- ✅ QUICK_DEPLOY_GUIDE.md
- ✅ QUICK_START_SUPABASE.md
- ✅ README_DEPLOYMENT.md
- ✅ RENDER_VERCEL_部署完成.md
- ✅ START_DEPLOYMENT.md
- ✅ VERCEL_SUPABASE_DEPLOYMENT.md

### 部署脚本
- ✅ scripts/deploy-render-supabase.sh
- ✅ scripts/deploy-render-supabase-vercel.sh
- ✅ scripts/deploy-backend-interactive.sh
- ✅ scripts/fix-supabase-connection.sh
- ✅ scripts/test-supabase-connection.sh
- ✅ scripts/setup-env.sh

---

## DNS 解析验证

新地址已通过 DNS 解析测试：

```
$ nslookup aws-0-ap-southeast-1.pooler.supabase.com

Server:         192.168.40.100
Address:        192.168.40.100#53

Non-authoritative answer:
aws-0-ap-southeast-1.pooler.supabase.com canonical name = 
  pool-tcp-ap-southeast-1-a29b758-70b9dc10be58bc58.elb.ap-southeast-1.amazonaws.com
Name:   pool-tcp-ap-southeast-1-a29b758-70b9dc10be58bc58.elb.ap-southeast-1.amazonaws.com
Address: 54.255.219.82
Address: 52.77.146.31
Address: 52.74.252.201
```

✅ DNS 解析成功！

---

## 使用新地址

### 设置环境变量

```bash
export DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com
export DB_PORT=6543
export DB_NAME=postgres
export DB_USER=postgres.你的项目ID
export DB_PASSWORD=你的密码
```

⚠️ **注意**：
- 这是 Supabase 的 **Connection Pooler** 地址
- 端口是 **6543**（不是 5432）
- 用户名格式是 **postgres.项目ID**

### 运行迁移

```bash
cd backend
npm run migrate
```

### 或使用修复脚本

```bash
./scripts/fix-supabase-connection.sh
```

---

## Connection Pooler vs Direct Connection

### Connection Pooler（推荐用于生产环境）
```
Host: aws-0-ap-southeast-1.pooler.supabase.com
Port: 6543
User: postgres.项目ID
```

**优势**：
- ✅ 连接池管理
- ✅ 更好的性能
- ✅ 适合高并发
- ✅ 自动连接复用

### Direct Connection（适合开发环境）
```
Host: db.项目ID.supabase.co
Port: 5432
User: postgres
```

**优势**：
- ✅ 直接连接
- ✅ 支持所有 PostgreSQL 特性
- ✅ 适合开发调试

---

## 配置示例

### Render 环境变量

```bash
DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com
DB_PORT=6543
DB_NAME=postgres
DB_USER=postgres.你的项目ID
DB_PASSWORD=你的密码
```

### 连接字符串

```
postgresql://postgres.项目ID:密码@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
```

---

## 验证连接

### 使用 psql

```bash
psql "postgresql://postgres.项目ID:密码@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
```

### 使用测试脚本

```bash
export DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com
export DB_PORT=6543
export DB_USER=postgres.你的项目ID
export DB_PASSWORD=你的密码

./scripts/test-supabase-connection.sh
```

---

## 常见问题

### Q: 为什么端口是 6543 而不是 5432？

**A**: Connection Pooler 使用端口 6543。如果使用直连模式（db.项目ID.supabase.co），则使用端口 5432。

### Q: 用户名为什么要加项目 ID？

**A**: Connection Pooler 需要完整的用户名格式 `postgres.项目ID` 来路由到正确的数据库。

### Q: 如何获取项目 ID？

**A**: 在 Supabase Dashboard 的 Settings → General 中可以找到 Reference ID。

### Q: 应该使用 Pooler 还是 Direct Connection？

**A**: 
- **生产环境**：推荐使用 Connection Pooler（更好的性能和连接管理）
- **开发环境**：可以使用 Direct Connection（更简单）

---

## 下一步

1. ✅ DB_HOST 已更新
2. 设置正确的环境变量（包括端口 6543 和完整用户名）
3. 运行数据库迁移
4. 继续部署到 Render 和 Vercel

查看 [快速部署指南.md](./快速部署指南.md) 继续部署流程。
