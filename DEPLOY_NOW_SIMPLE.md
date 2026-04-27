# 🚀 立即部署 - 3 步完成

## 第 1 步：部署后端到 Render（10 分钟）

### 1.1 创建服务
访问 https://render.com → New + → Web Service

### 1.2 配置
```
Name: financial-compliance-backend
Root Directory: backend
Build Command: npm install && npm run build && npm run migrate
Start Command: node dist/index.pgboss.js
```

### 1.3 环境变量
复制 `RENDER_ENV_VARS.txt` 的全部内容到 Render

### 1.4 部署
点击 "Create Web Service"，等待完成

---

## 第 2 步：部署前端到 Vercel（5 分钟）

### 2.1 配置后端 URL
创建 `frontend/.env.production`：
```
VITE_API_URL=https://你的后端URL.onrender.com/api
```

### 2.2 部署
```bash
cd frontend
vercel --prod
```

---

## 第 3 步：测试（5 分钟）

### 3.1 验证后端
```bash
curl https://你的后端URL.onrender.com/health
```

### 3.2 测试前端
1. 访问 Vercel 提供的 URL
2. 创建测试任务
3. 执行任务
4. 查看结果

---

## ✅ 完成！

总用时：约 20 分钟
总成本：$0/月

需要详细指南？查看 `RENDER_DEPLOYMENT_GUIDE.md`
