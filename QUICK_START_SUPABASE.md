# 🚀 5 分钟快速开始 - Supabase 部署

## 改造完成！

你的代码已经改造完成，现在可以只使用 Supabase PostgreSQL 部署，不需要 Redis！

---

## 立即开始

### 1. 安装新依赖（30 秒）

```bash
cd backend
npm install
cd ..
```

### 2. 创建 Supabase 项目（3 分钟）

1. 访问 https://supabase.com
2. 创建项目：`financial-compliance-monitoring`
3. 记录数据库密码

### 3. 运行迁移（1 分钟）

```bash
export DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com
export DB_PASSWORD=你的密码
cd backend && npm run migrate && cd ..
```

### 4. 部署（5 分钟）

```bash
./scripts/deploy-render-supabase.sh
```

---

## 完成！

现在你有：
- ✅ 完全免费的部署
- ✅ 只需要 Supabase（不需要 Redis）
- ✅ 更简单的架构

---

## 详细文档

- [完整部署指南](./DEPLOY_SUPABASE_COMPLETE.md)
- [技术细节](./DEPLOY_SUPABASE_ONLY.md)

---

**准备好了吗？** 运行 `./scripts/deploy-render-supabase.sh` 开始！
