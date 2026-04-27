# 🔧 Railway "No repositories found" 解决方案

## 问题原因

Railway 需要 GitHub 授权才能访问你的仓库。

---

## ✅ 解决方法 1：授权 Railway 访问 GitHub

### 步骤：

1. **在 Railway 中配置 GitHub**
   - 访问：https://railway.app/account
   - 或点击右上角头像 → "Settings"

2. **找到 GitHub 集成**
   - 查找 "GitHub" 或 "Integrations" 部分
   - 点击 "Configure GitHub App" 或 "Manage GitHub Access"

3. **授权仓库访问**
   - 会跳转到 GitHub 授权页面
   - 选择 "Only select repositories"
   - 勾选 `financial-compliance-monitoring`
   - 点击 "Install" 或 "Save"

4. **返回 Railway**
   - 刷新 Railway 页面
   - 再次点击 "New Project" → "Deploy from GitHub repo"
   - 现在应该能看到 `financial-compliance-monitoring` 了

---

## ✅ 解决方法 2：使用 Railway CLI（推荐，更快）

### 步骤：

1. **安装 Railway CLI**
   ```bash
   npm install -g @railway/cli
   # 或
   brew install railway
   ```

2. **登录 Railway**
   ```bash
   railway login
   ```
   会打开浏览器，用 GitHub 账号登录。

3. **初始化项目**
   ```bash
   cd /Users/iliaxiong/Desktop/金融合规监测工具0319
   railway init
   ```
   - 选择 "Create a new project"
   - 输入项目名称（如：financial-compliance-monitoring）

4. **链接到 GitHub**
   ```bash
   railway link
   ```

5. **添加环境变量**
   ```bash
   # 方法 A：一次性添加所有变量
   railway variables set NODE_ENV=production
   railway variables set PORT=3000
   railway variables set TZ=Asia/Shanghai
   railway variables set DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com
   railway variables set DB_PORT=6543
   railway variables set DB_NAME=postgres
   railway variables set DB_USER=postgres.ynbaatdsceqtqwmqhlgu
   railway variables set DB_PASSWORD=KhpGTR6dMFzZz7qq
   railway variables set JWT_SECRET=u7uEwPvtAxpLo1GafP/WiQhTpzT+9UDOXy5nmuuQ1fU=
   railway variables set JWT_EXPIRES_IN=7d
   railway variables set LLM_API_URL=https://office.webullbroker.com/api/oa-ai/open/chat/completions
   railway variables set LLM_API_KEY=dcb0d1c8-82c7-478f-bd9a-7c3023cac4d8
   railway variables set LLM_MODEL=us.anthropic.claude-sonnet-4-20250514-v1:0
   railway variables set LLM_API_KEY_HEADER=authorization
   railway variables set LLM_AUTH_PREFIX=Bearer
   railway variables set JINA_READER_API_URL=https://r.jina.ai
   railway variables set MAX_PARALLEL_WEBSITES=5
   railway variables set RETRIEVAL_TIMEOUT_MS=30000
   railway variables set ENABLE_WEBSITE_ANALYZER=true
   railway variables set DEMO_MODE=false
   
   # 方法 B：从文件批量导入
   railway variables set --from-file .render-env.txt
   ```

6. **部署**
   ```bash
   railway up
   ```

7. **生成公开 URL**
   ```bash
   railway domain
   ```
   会生成类似：`https://financial-compliance-monitoring-production.up.railway.app`

8. **查看日志**
   ```bash
   railway logs
   ```

---

## ✅ 解决方法 3：手动创建空项目

如果上述方法都不行：

1. **在 Railway 创建空项目**
   - 点击 "New Project"
   - 选择 "Empty Project"

2. **添加 GitHub 服务**
   - 在项目中点击 "New"
   - 选择 "GitHub Repo"
   - 如果还是看不到仓库，点击 "Configure GitHub App"
   - 授权后重试

3. **配置服务**
   - Root Directory: `backend`
   - Build Command: `npm install && npm run build`
   - Start Command: `node dist/index.pgboss.js`

4. **添加环境变量**（从 `.render-env.txt` 复制）

---

## 🎯 推荐方案

**使用方法 2（Railway CLI）**，因为：
- ✅ 最快速
- ✅ 不需要手动配置
- ✅ 可以直接从命令行管理
- ✅ 避免 UI 授权问题

---

## 📝 快速命令（复制粘贴）

```bash
# 1. 安装 CLI
npm install -g @railway/cli

# 2. 登录
railway login

# 3. 进入项目目录
cd /Users/iliaxiong/Desktop/金融合规监测工具0319

# 4. 初始化
railway init

# 5. 批量设置环境变量
railway variables set --from-file .render-env.txt

# 6. 部署
railway up

# 7. 生成域名
railway domain

# 8. 查看日志
railway logs
```

---

## 🐛 故障排查

### CLI 安装失败？
```bash
# 使用 brew
brew install railway

# 或使用 curl
curl -fsSL https://railway.app/install.sh | sh
```

### 登录失败？
- 确保浏览器没有阻止弹出窗口
- 尝试手动访问：https://railway.app/login

### 部署失败？
```bash
# 查看详细日志
railway logs --tail

# 检查环境变量
railway variables
```

---

## 🎉 完成后

部署成功后，你会得到一个 Railway URL，然后：

1. 复制 Railway URL
2. 在 Vercel 中设置环境变量：
   ```
   VITE_API_URL=https://your-app.up.railway.app
   ```
3. 测试应用：https://financial-compliance-monitoring.vercel.app

---

需要帮助？告诉我你选择哪个方法，我会继续协助！
