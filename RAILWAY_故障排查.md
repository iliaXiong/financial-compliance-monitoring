# Railway 部署故障排查

## 当前状态
- ✅ 构建成功
- ❌ 健康检查失败：`/health` 端点无响应

## 需要检查的内容

### 1. 查看应用日志

在 Railway Dashboard：
1. 进入你的服务
2. 点击 "Deployments" 标签
3. 点击最新的部署
4. 查看 "Deploy Logs" 和 "Runtime Logs"

**查找这些错误**：
- 数据库连接失败
- 端口绑定错误
- 环境变量缺失
- pg-boss 初始化失败

### 2. 确认环境变量

在 Railway → Variables 标签，确认所有变量都已设置：

```
NODE_ENV=production
PORT=3000
TZ=Asia/Shanghai

DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com
DB_PORT=6543
DB_NAME=postgres
DB_USER=postgres.ynbaatdsceqtqwmqhlgu
DB_PASSWORD=KhpGTR6dMFzZz7qq

JWT_SECRET=u7uEwPvtAxpLo1GafP/WiQhTpzT+9UDOXy5nmuuQ1fU=
JWT_EXPIRES_IN=7d

LLM_API_URL=https://office.webullbroker.com/api/oa-ai/open/chat/completions
LLM_API_KEY=dcb0d1c8-82c7-478f-bd9a-7c3023cac4d8
LLM_MODEL=us.anthropic.claude-sonnet-4-20250514-v1:0
LLM_API_KEY_HEADER=authorization
LLM_AUTH_PREFIX=Bearer

JINA_READER_API_URL=https://r.jina.ai
MAX_PARALLEL_WEBSITES=5
RETRIEVAL_TIMEOUT_MS=30000
ENABLE_WEBSITE_ANALYZER=true
DEMO_MODE=false
```

### 3. 常见问题和解决方案

#### 问题 1：数据库连接失败
**症状**：日志显示 "connection refused" 或 "timeout"

**解决**：
- 确认 Supabase 项目在运行
- 检查 DB_HOST 是否正确（应该是 pooler 地址）
- 检查 DB_USER 格式：`postgres.ynbaatdsceqtqwmqhlgu`

#### 问题 2：pg-boss 表不存在
**症状**：日志显示 "relation does not exist"

**解决**：需要手动运行数据库迁移。有两个选择：

**选项 A：在 Railway 中运行一次性命令**
1. 在 Railway 服务页面
2. 点击 "..." 菜单
3. 选择 "Run Command"
4. 输入：`npm run migrate`

**选项 B：临时启用自动迁移**
修改 Dockerfile CMD：
```dockerfile
CMD ["sh", "-c", "npm run migrate && npm start"]
```
部署一次后再改回：
```dockerfile
CMD ["npm", "start"]
```

#### 问题 3：端口绑定错误
**症状**：日志显示 "EADDRINUSE" 或 "port already in use"

**解决**：
- 确认 PORT 环境变量设置为 3000
- Railway 会自动分配端口，应用应该监听 `process.env.PORT`

#### 问题 4：健康检查路径错误
**症状**：应用启动但健康检查失败

**解决**：
- 确认应用有 `/health` 端点
- 在 Railway Settings → Healthcheck 中设置：
  - Path: `/health`
  - Timeout: 30s
  - Interval: 30s

### 4. 禁用健康检查（临时）

如果需要先让应用运行起来：

1. 进入 Railway → Settings → Healthcheck
2. 暂时禁用健康检查
3. 查看应用是否能启动
4. 修复问题后再启用

### 5. 生成公开 URL

应用运行后：

1. 进入 Railway → Settings → Networking
2. 点击 "Generate Domain"
3. 会得到类似：`https://your-app.up.railway.app`

### 6. 测试部署

```bash
# 测试健康检查
curl https://your-app.up.railway.app/health

# 应该返回
{"status":"ok"}
```

## 下一步

1. **查看日志**：告诉我 Runtime Logs 里显示什么错误
2. **检查变量**：确认所有环境变量都已设置
3. **运行迁移**：如果是数据库表不存在的问题

---

## 快速修复命令

如果需要重新部署：

```bash
# 推送任何小改动触发重新部署
git commit --allow-empty -m "Trigger Railway redeploy"
git push origin main
```

## 联系我

把 Railway 的 Runtime Logs 发给我，我会帮你诊断具体问题。
