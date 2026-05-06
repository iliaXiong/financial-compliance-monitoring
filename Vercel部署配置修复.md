# Vercel部署配置修复

## 问题诊断

**症状**: 
- 部署状态显示 Ready ✅
- Deployment Protection 已关闭 ✅
- 但网站仍然无法访问 ❌

**根本原因**: 
项目从**根目录**部署，但配置指向 `frontend/dist`，导致Vercel找不到正确的文件。

## 解决方案

有两个选择：

### 方案A: 从frontend目录部署（推荐）✅

这是最简单、最可靠的方法。

#### 步骤1: 在Vercel Dashboard中修改设置

1. 进入项目设置
2. Settings → General → Root Directory
3. 设置为: `frontend`
4. 点击 Save

#### 步骤2: 重新部署

1. 返回 Deployments
2. 点击最新部署
3. 点击 Redeploy

#### 步骤3: 验证

访问 https://financial-compliance-monitoring.vercel.app/

---

### 方案B: 使用CLI从frontend目录部署

如果方案A不行，使用CLI：

```bash
# 1. 进入frontend目录
cd frontend

# 2. 删除旧的Vercel配置
rm -rf .vercel

# 3. 重新部署
vercel --prod

# 4. 按提示操作：
# - Set up and deploy? Yes
# - Which scope? 选择你的账号
# - Link to existing project? Yes
# - Project name? financial-compliance-monitoring
# - Override settings? No
```

---

### 方案C: 修复根目录配置（复杂）

如果必须从根目录部署，需要确保配置正确。

#### 检查vercel.json

根目录的 `vercel.json` 应该是：

```json
{
  "buildCommand": "cd frontend && npm install && npm run build",
  "outputDirectory": "frontend/dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

#### 检查构建输出

在Vercel Dashboard中：
1. 点击最新部署
2. 查看 Build Logs
3. 确认看到：
   ```
   ✓ Building...
   ✓ Compiled successfully
   dist/index.html
   dist/assets/...
   ```

#### 检查部署文件

在部署详情页面：
1. 点击 "Source" 标签
2. 确认看到：
   ```
   frontend/
     dist/
       index.html
       assets/
         index-*.js
         index-*.css
   ```

---

## 快速修复（推荐方案A）

### 通过Dashboard修改Root Directory

1. **登录Vercel Dashboard**
   - https://vercel.com/dashboard

2. **进入项目设置**
   - 找到 `financial-compliance-monitoring`
   - 点击 Settings

3. **修改Root Directory**
   - 找到 "Root Directory" 设置
   - 点击 "Edit"
   - 输入: `frontend`
   - 点击 "Save"

4. **重新部署**
   - 返回 Deployments
   - 点击 "Redeploy"
   - 等待1-2分钟

5. **测试访问**
   - 打开浏览器隐私模式
   - 访问 https://financial-compliance-monitoring.vercel.app/
   - 应该能看到应用界面

---

## 验证修复

修复后，运行以下测试：

### 1. 基础访问测试
```bash
curl -I https://financial-compliance-monitoring.vercel.app/
# 应该返回: HTTP/2 200
```

### 2. 页面内容测试
```bash
curl https://financial-compliance-monitoring.vercel.app/ | grep "金融合规"
# 应该找到匹配内容
```

### 3. 静态资源测试
```bash
# 在浏览器中打开开发者工具
# Network标签应该显示所有资源都是200 OK
```

---

## 如果还是不行

### 检查清单

- [ ] Root Directory 设置为 `frontend`
- [ ] 部署状态为 Ready
- [ ] Deployment Protection 全部关闭
- [ ] 清除浏览器缓存
- [ ] 使用隐私模式测试
- [ ] 等待5分钟（DNS传播）

### 获取部署URL

在Vercel Dashboard中：
1. 点击最新部署
2. 查看 "Domains" 部分
3. 应该看到：
   - Production: `financial-compliance-monitoring.vercel.app`
   - Preview: `financial-compliance-monitoring-xxx.vercel.app`

尝试访问Preview URL，如果Preview可以访问但Production不行，说明是域名配置问题。

### 检查部署文件

在部署详情页面：
1. 点击 "Source" 标签
2. 确认文件结构：
   ```
   index.html          ← 必须在根目录
   assets/
     index-*.js
     index-*.css
   ```

如果 `index.html` 不在根目录，说明 Root Directory 设置不正确。

---

## 常见错误

### 错误1: 404 Not Found

**原因**: Root Directory 设置错误

**解决**: 设置 Root Directory 为 `frontend`

### 错误2: 空白页面

**原因**: 静态资源路径错误

**解决**: 
1. 检查 `frontend/vite.config.ts` 中的 `base` 设置
2. 应该是 `base: '/'` 或不设置

### 错误3: 连接超时

**原因**: DNS未解析或访问保护

**解决**:
1. 检查 Deployment Protection
2. 等待DNS传播
3. 尝试Preview URL

---

## 推荐的最终配置

### 项目结构
```
project-root/
  frontend/          ← Vercel Root Directory指向这里
    dist/            ← 构建输出
      index.html
      assets/
    src/
    package.json
    vercel.json      ← 前端配置
  backend/
  vercel.json        ← 可以删除或忽略
```

### frontend/vercel.json
```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Vercel项目设置
- Root Directory: `frontend`
- Framework Preset: Vite
- Build Command: `npm run build`
- Output Directory: `dist`

---

## 立即执行

**最快的修复方法**（2分钟）：

1. 打开 https://vercel.com/dashboard
2. 进入项目 → Settings → General
3. Root Directory 改为 `frontend`
4. Save
5. Deployments → Redeploy
6. 等待1-2分钟
7. 测试访问

**如果还是不行**，使用方案B（CLI部署）：

```bash
cd frontend
rm -rf .vercel
vercel --prod
```

---

**创建时间**: 2026-05-06  
**优先级**: 高  
**预计修复时间**: 2-5分钟
