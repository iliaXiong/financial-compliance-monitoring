# 推送项目到 GitHub 指南

## 步骤 1：配置 Git 用户信息

在终端运行以下命令（替换成你的信息）：

```bash
git config --global user.email "your-email@example.com"
git config --global user.name "Your Name"
```

例如：
```bash
git config --global user.email "iliaxiong@example.com"
git config --global user.name "Ilia Xiong"
```

## 步骤 2：创建 GitHub 仓库

1. 访问：https://github.com/new
2. 填写信息：
   ```
   Repository name: financial-compliance-monitoring
   Description: 金融合规监测工具
   Visibility: Private (推荐) 或 Public
   ```
3. **不要**勾选 "Initialize this repository with a README"
4. 点击 **"Create repository"**

## 步骤 3：提交代码

在项目目录运行：

```bash
# 创建第一次提交
git commit -m "Initial commit: Financial Compliance Monitoring Tool"

# 设置主分支名称
git branch -M main
```

## 步骤 4：连接到 GitHub

GitHub 创建完成后，会显示一个页面，复制 "push an existing repository" 部分的命令。

应该类似这样（替换成你的用户名）：

```bash
git remote add origin https://github.com/YOUR_USERNAME/financial-compliance-monitoring.git
git push -u origin main
```

例如：
```bash
git remote add origin https://github.com/iliaxiong/financial-compliance-monitoring.git
git push -u origin main
```

## 步骤 5：输入 GitHub 凭证

首次推送时，会要求输入 GitHub 凭证：

- **Username**: 你的 GitHub 用户名
- **Password**: 使用 Personal Access Token（不是密码）

### 如何获取 Personal Access Token：

1. 访问：https://github.com/settings/tokens
2. 点击 **"Generate new token"** → **"Generate new token (classic)"**
3. 设置：
   ```
   Note: Render Deployment
   Expiration: 90 days (或更长)
   Scopes: 勾选 repo (完整的仓库访问权限)
   ```
4. 点击 **"Generate token"**
5. **复制 token**（只显示一次！）
6. 在推送时，用这个 token 作为密码

## 步骤 6：验证推送成功

推送成功后，访问你的 GitHub 仓库页面，应该能看到所有代码。

---

## 🚀 完成后：连接 Render

### 方法 1：通过 Render Dashboard

1. 访问：https://dashboard.render.com
2. 点击 **"New +"** → **"Web Service"**
3. 点击 **"Connect GitHub"**（如果是第一次）
4. 授权 Render 访问 GitHub
5. 选择你的仓库：`financial-compliance-monitoring`
6. 点击 **"Connect"**

### 方法 2：如果已经授权过 GitHub

1. 在 Render 的 "New Web Service" 页面
2. 应该能看到你的 GitHub 仓库列表
3. 找到 `financial-compliance-monitoring`
4. 点击 **"Connect"**

---

## 📝 完整命令总结

```bash
# 1. 配置 Git（只需要做一次）
git config --global user.email "your-email@example.com"
git config --global user.name "Your Name"

# 2. 提交代码
git commit -m "Initial commit: Financial Compliance Monitoring Tool"
git branch -M main

# 3. 连接到 GitHub（替换成你的仓库 URL）
git remote add origin https://github.com/YOUR_USERNAME/financial-compliance-monitoring.git
git push -u origin main
```

---

## ❓ 常见问题

### Q: 推送时要求输入密码，但密码不对？

A: GitHub 已经不支持密码认证，必须使用 Personal Access Token。

### Q: 如何创建 Personal Access Token？

A: 
1. https://github.com/settings/tokens
2. Generate new token (classic)
3. 勾选 `repo` 权限
4. 复制 token 并保存

### Q: 推送失败，提示 "remote: Repository not found"？

A: 
1. 检查仓库 URL 是否正确
2. 确认仓库已在 GitHub 上创建
3. 确认你有访问权限

### Q: 如何查看当前的 remote URL？

A: 运行 `git remote -v`

---

## 🎯 下一步

推送成功后：

1. ✅ 在 Render 中连接 GitHub 仓库
2. ✅ 配置 Render Web Service
3. ✅ 添加环境变量
4. ✅ 部署！

需要帮助吗？告诉我你在哪一步遇到问题！
