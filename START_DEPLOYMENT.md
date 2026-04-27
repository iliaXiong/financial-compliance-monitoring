# 🚀 开始部署

欢迎！这个文档将指导你快速部署金融合规监测系统到生产环境。

## 📋 部署前准备

### 1. 注册账号（全部免费或低成本）

- [ ] [Vercel](https://vercel.com) - 前端托管（免费）
- [ ] [Railway](https://railway.app) - 后端托管（$5/月）
- [ ] [Supabase](https://supabase.com) - PostgreSQL 数据库（免费 500MB）
- [ ] [Upstash](https://upstash.com) - Redis 服务（免费 10K 命令/天）

### 2. 安装工具

```bash
# 安装 Railway CLI
npm install -g @railway/cli

# 安装 Vercel CLI
npm install -g vercel

# 验证安装
railway --version
vercel --version
```

## 🎯 三种部署方式

### 方式一：一键自动部署（推荐，最快）⚡

适合：想要快速部署，不想手动配置

```bash
# 1. 准备数据库（需要手动在网页上操作）
# - 访问 https://supabase.com 创建项目
# - 访问 https://upstash.com 创建 Redis

# 2. 运行数据库迁移
export DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com
export DB_PASSWORD=your-supabase-password
cd backend && npm run migrate && cd ..

# 3. 配置环境变量（交互式）
./scripts/setup-env.sh

# 4. 一键部署
./scripts/deploy-all.sh

# 5. 检查部署状态
./scripts/check-deployment.sh
```

**预计时间**: 15-20 分钟

---

### 方式二：分步手动部署（推荐，更可控）📝

适合：想要了解每一步的细节，或需要自定义配置

**完整指南**: [VERCEL_SUPABASE_DEPLOYMENT.md](./VERCEL_SUPABASE_DEPLOYMENT.md)

**步骤概览**:
1. 部署数据库到 Supabase（5 分钟）
2. 部署 Redis 到 Upstash（3 分钟）
3. 部署后端到 Railway（10 分钟）
4. 部署前端到 Vercel（5 分钟）
5. 验证部署（5 分钟）

**预计时间**: 30-40 分钟

---

### 方式三：快速部署（适合有经验的开发者）🏃

适合：熟悉这些平台，只需要命令参考

**快速指南**: [QUICK_DEPLOY_GUIDE.md](./QUICK_DEPLOY_GUIDE.md)

**命令速查**:
```bash
# Supabase: 网页创建 + 运行迁移
cd backend && npm run migrate

# Railway: 设置变量 + 部署
railway variables set KEY=VALUE
railway up

# Vercel: 部署
vercel --prod
```

**预计时间**: 10-15 分钟

---

## 📚 文档索引

### 核心文档

| 文档 | 用途 | 适合人群 |
|------|------|----------|
| [VERCEL_SUPABASE_DEPLOYMENT.md](./VERCEL_SUPABASE_DEPLOYMENT.md) | 完整的分步部署指南 | 所有人 |
| [QUICK_DEPLOY_GUIDE.md](./QUICK_DEPLOY_GUIDE.md) | 5 分钟快速部署 | 有经验的开发者 |
| [README_DEPLOYMENT.md](./README_DEPLOYMENT.md) | 部署概览和索引 | 想要了解架构 |
| [deploy-checklist.md](./deploy-checklist.md) | 部署检查清单 | 确保不遗漏步骤 |
| [DEPLOYMENT_SUMMARY.md](./DEPLOYMENT_SUMMARY.md) | 部署配置总结 | 了解创建的文件 |

### 脚本工具

| 脚本 | 功能 | 使用场景 |
|------|------|----------|
| `scripts/setup-env.sh` | 配置 Railway 环境变量 | 首次部署 |
| `scripts/deploy-all.sh` | 一键部署前后端 | 自动化部署 |
| `scripts/check-deployment.sh` | 检查部署状态 | 验证部署 |

### 配置文件

| 文件 | 用途 |
|------|------|
| `vercel.json` | Vercel 部署配置 |
| `backend/railway.toml` | Railway 部署配置 |
| `backend/.env.production.example` | 生产环境变量模板 |
| `frontend/.env.production` | 前端环境变量 |

---

## 🎬 推荐流程

### 第一次部署

1. **阅读概览**（5 分钟）
   - 阅读 [README_DEPLOYMENT.md](./README_DEPLOYMENT.md)
   - 了解架构和成本

2. **准备账号**（10 分钟）
   - 注册所有必需的服务
   - 安装 CLI 工具

3. **执行部署**（20 分钟）
   - 使用方式一（一键部署）或方式二（分步部署）
   - 跟随文档操作

4. **验证功能**（10 分钟）
   - 运行 `./scripts/check-deployment.sh`
   - 手动测试核心功能

5. **完成配置**（可选）
   - 配置自定义域名
   - 设置监控告警

### 后续更新

```bash
# 更新后端
cd backend
railway up

# 更新前端
vercel --prod
```

---

## 💰 成本估算

| 服务 | 免费额度 | 实际成本 |
|------|----------|----------|
| Vercel | 100GB 带宽/月 | $0 |
| Supabase | 500MB 数据库 | $0 |
| Upstash | 10K 命令/天 | $0 |
| Railway | - | $5/月 |

**总成本**: $5/月

---

## ❓ 常见问题

### Q: 我必须使用 Railway 吗？

A: 不是。你也可以使用：
- Render（有免费层，但有限制）
- Fly.io（按使用量付费）
- Heroku（$7/月）
- 自己的 VPS

### Q: 可以完全免费部署吗？

A: 可以，使用 Render 的免费层代替 Railway，但有以下限制：
- 服务会在 15 分钟不活动后休眠
- 冷启动需要 30-60 秒
- 每月 750 小时运行时间

### Q: 部署失败怎么办？

A: 
1. 查看错误信息
2. 检查 [故障排除](./VERCEL_SUPABASE_DEPLOYMENT.md#故障排除) 章节
3. 运行 `./scripts/check-deployment.sh` 诊断
4. 查看服务日志：`railway logs` 或 `vercel logs`

### Q: 如何回滚到之前的版本？

A:
```bash
# Railway 回滚
railway rollback

# Vercel 回滚
vercel rollback
```

### Q: 数据会丢失吗？

A: 不会。Supabase 提供：
- 自动每日备份（Pro 计划）
- 数据持久化存储
- 可以手动导出数据

---

## 🆘 获取帮助

### 文档

- 查看 [完整部署指南](./VERCEL_SUPABASE_DEPLOYMENT.md)
- 查看 [故障排除](./VERCEL_SUPABASE_DEPLOYMENT.md#故障排除)
- 查看 [部署检查清单](./deploy-checklist.md)

### 日志

```bash
# 后端日志
railway logs --tail

# 前端日志
vercel logs

# 数据库日志
# 在 Supabase Dashboard → Database → Logs
```

### 社区

- 提交 Issue
- 查看项目文档
- 联系维护团队

---

## ✅ 部署检查清单

使用 [deploy-checklist.md](./deploy-checklist.md) 确保不遗漏任何步骤。

---

## 🎉 准备好了吗？

选择一种部署方式开始吧！

- **快速开始**: 运行 `./scripts/deploy-all.sh`
- **详细指南**: 阅读 [VERCEL_SUPABASE_DEPLOYMENT.md](./VERCEL_SUPABASE_DEPLOYMENT.md)
- **快速参考**: 查看 [QUICK_DEPLOY_GUIDE.md](./QUICK_DEPLOY_GUIDE.md)

祝部署顺利！🚀
