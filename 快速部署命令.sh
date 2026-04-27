#!/bin/bash

# 快速部署命令集合
# 复制粘贴相应的命令到终端执行

echo "🚀 Render + Supabase + Vercel 快速部署命令"
echo "=========================================="
echo ""

cat << 'EOF'

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
第一步：生成 JWT Secret
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

openssl rand -base64 32

# 复制输出结果，稍后在 Render 中使用

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
第二步：运行数据库迁移
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# 设置环境变量（替换为你的实际值）
export DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com
export DB_PORT=6543
export DB_NAME=postgres
export DB_USER=postgres.你的项目ID
export DB_PASSWORD=你的密码

# 运行迁移
cd backend
npm install
npm run migrate

# 看到 "Migration completed successfully" 表示成功

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
第三步：验证后端部署（Render 部署完成后）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# 替换为你的 Render URL
curl https://your-app.onrender.com/health

# 应该返回 {"status":"healthy",...}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
第四步：部署前端到 Vercel
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# 安装 Vercel CLI（如果还没安装）
npm install -g vercel

# 创建前端环境变量文件（替换为你的 Render URL）
cat > frontend/.env.production << 'ENVEOF'
VITE_API_BASE_URL=https://your-app.onrender.com
ENVEOF

# 登录 Vercel
vercel login

# 部署到生产环境
cd frontend
vercel --prod

# 按照提示操作，完成部署

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
第五步：测试部署
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# 在浏览器中访问你的前端 URL
# 尝试注册、登录、创建任务

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
可选：配置 UptimeRobot 防止 Render 休眠
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. 访问 https://uptimerobot.com
2. 注册账号
3. 添加监控：
   - Monitor Type: HTTP(s)
   - URL: https://your-app.onrender.com/health
   - Monitoring Interval: 10 minutes

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎉 部署完成！

前端: https://your-app.vercel.app
后端: https://your-app.onrender.com
数据库: Supabase Dashboard

EOF
