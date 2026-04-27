# 部署检查清单

在部署之前，请确保完成以下步骤：

## ✅ 准备工作

- [ ] 已注册 Vercel 账号
- [ ] 已注册 Supabase 账号
- [ ] 已注册 Upstash 账号
- [ ] 已注册 Railway 账号
- [ ] 已安装 Node.js 18+
- [ ] 已安装 Git

## ✅ Supabase 数据库

- [ ] 创建 Supabase 项目
- [ ] 记录数据库密码
- [ ] 获取数据库连接信息（Host, Port, User, Password）
- [ ] 本地运行数据库迁移成功
- [ ] 在 Supabase Dashboard 验证表已创建

## ✅ Upstash Redis

- [ ] 创建 Upstash Redis 数据库
- [ ] 记录 Redis 连接信息（Host, Port, Password）
- [ ] 测试 Redis 连接成功

## ✅ Railway 后端

- [ ] 安装 Railway CLI
- [ ] 登录 Railway
- [ ] 创建 Railway 项目
- [ ] 设置所有环境变量（至少 15 个）
- [ ] 部署后端成功
- [ ] 生成 Railway 域名
- [ ] 测试健康检查端点：`curl https://your-app.railway.app/health`
- [ ] 查看日志确认服务正常运行

## ✅ Vercel 前端

- [ ] 安装 Vercel CLI
- [ ] 登录 Vercel
- [ ] 更新 `vercel.json` 中的后端 URL
- [ ] 更新 `frontend/.env.production` 中的 API URL
- [ ] 部署前端成功
- [ ] 在 Vercel Dashboard 设置环境变量
- [ ] 访问前端 URL 确认页面加载

## ✅ 功能测试

- [ ] 前端可以正常访问
- [ ] 可以注册新用户
- [ ] 可以登录系统
- [ ] 可以创建任务
- [ ] 可以手动执行任务
- [ ] 可以查看执行结果
- [ ] 可以查看总结文档
- [ ] 定时任务可以自动执行

## ✅ 监控和维护

- [ ] 设置 Railway 日志监控
- [ ] 设置 Vercel 部署通知
- [ ] 配置错误追踪（可选：Sentry）
- [ ] 配置服务可用性监控（可选：Uptime Robot）
- [ ] 记录所有密钥和密码到安全的地方

## ✅ 安全检查

- [ ] JWT_SECRET 使用强随机字符串
- [ ] 数据库密码足够复杂
- [ ] Redis 密码足够复杂
- [ ] 所有 API 调用使用 HTTPS
- [ ] 前端配置了安全响应头
- [ ] 后端配置了 CORS

## ✅ 性能优化

- [ ] 前端启用了 Gzip 压缩
- [ ] 数据库添加了必要的索引
- [ ] Redis 配置了合理的过期时间
- [ ] 后端配置了合理的超时时间

## 🎉 部署完成

恭喜！你的金融合规监测系统已成功部署到生产环境。

### 下一步

1. 配置自定义域名（可选）
2. 设置 CI/CD 自动部署
3. 添加更多监控和告警
4. 定期备份数据库
5. 定期更新依赖包

### 重要链接

- **前端**: https://your-app.vercel.app
- **后端**: https://your-app.railway.app
- **数据库**: Supabase Dashboard
- **Redis**: Upstash Console
- **后端日志**: Railway Dashboard
- **前端日志**: Vercel Dashboard

### 支持

如有问题，请查看：
- [完整部署指南](./VERCEL_SUPABASE_DEPLOYMENT.md)
- [快速部署指南](./QUICK_DEPLOY_GUIDE.md)
- [故障排除文档](./VERCEL_SUPABASE_DEPLOYMENT.md#故障排除)
