# Railway 启用演示模式

## 问题
前端显示"未提供认证令牌"，因为后端要求JWT认证，但前端还没有实现完整的登录系统。

## 解决方案
启用演示模式（DEMO_MODE=true），这样后端会跳过JWT认证检查。

## 操作步骤

### 方法1: 在Railway Dashboard中更新（推荐）

1. 访问 Railway Dashboard: https://railway.app/dashboard
2. 选择你的项目: `financial-compliance-monitoring`
3. 点击后端服务
4. 进入 "Variables" 标签
5. 找到 `DEMO_MODE` 变量
6. 将值从 `false` 改为 `true`
7. 点击保存
8. Railway会自动重新部署

### 方法2: 使用Railway CLI

```bash
# 安装Railway CLI（如果还没安装）
npm i -g @railway/cli

# 登录
railway login

# 链接到项目
railway link

# 设置环境变量
railway variables set DEMO_MODE=true

# 重新部署
railway up
```

## 验证

1. 等待Railway重新部署完成（约2-3分钟）
2. 访问 https://financial-compliance-monitoring.vercel.app
3. 应该能够正常加载任务列表，不再显示认证错误

## 技术说明

当 `DEMO_MODE=true` 时：
- 后端会自动为所有请求添加一个演示用户
- 用户ID: `00000000-0000-0000-0000-000000000000`
- 用户邮箱: `demo@example.com`
- 所有API端点都可以正常访问，无需JWT令牌

这是一个临时解决方案，适合演示和测试。生产环境应该实现完整的用户认证系统。

## 当前环境变量配置

已更新 `.render-env.txt` 文件，将 `DEMO_MODE` 设置为 `true`。
