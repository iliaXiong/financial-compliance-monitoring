# Vercel SPA 路由修复

## 问题
其他用户访问 `https://financial-compliance-monitoring.vercel.app/tasks` 时显示 404 错误。

## 原因
这是单页应用（SPA）的常见问题：
- React Router 在客户端处理路由
- 当用户直接访问 `/tasks` 时，Vercel服务器尝试查找 `tasks.html` 文件
- 该文件不存在，返回 404 错误
- 需要配置服务器将所有路由请求重定向到 `index.html`

## 解决方案
在 `frontend/vercel.json` 中添加 `rewrites` 配置：

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

这个配置告诉Vercel：
- 对于所有路径请求 `/(.*)`
- 都返回 `index.html` 文件
- React Router 会在客户端处理实际的路由

## 修复状态
✅ 已修复并推送到GitHub
⏳ Vercel正在自动重新部署（约1-2分钟）

## 验证步骤
等待Vercel重新部署完成后：

1. 直接访问 https://financial-compliance-monitoring.vercel.app/tasks
2. 应该能够正常显示任务列表页面
3. 刷新页面也不会出现 404 错误
4. 所有路由都应该正常工作：
   - `/` - 首页/仪表板
   - `/tasks` - 任务列表
   - `/results` - 结果查看
   - `/settings` - 设置

## 技术说明

### SPA 路由工作原理
1. 用户访问 `/tasks`
2. Vercel服务器收到请求
3. 通过 `rewrites` 规则返回 `index.html`
4. 浏览器加载 `index.html` 和 JavaScript
5. React Router 读取 URL 路径 `/tasks`
6. 渲染对应的 Tasks 组件

### 为什么需要这个配置
- 开发环境：Vite dev server 自动处理所有路由
- 生产环境：静态文件服务器需要明确配置
- 没有这个配置，只有首页 `/` 能正常访问
- 直接访问其他路由或刷新页面都会 404

### 其他部署平台的类似配置

**Netlify** (`_redirects` 文件):
```
/*    /index.html   200
```

**Nginx**:
```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

**Apache** (`.htaccess`):
```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [L]
```

## 相关文件
- `frontend/vercel.json` - Vercel配置文件
- `frontend/src/App.tsx` - React Router配置
- `frontend/src/main.tsx` - 应用入口

## 注意事项
- `rewrites` 规则会匹配所有路径，包括 API 请求
- 但由于我们的 API 在不同的域名（Railway），不会受影响
- 静态资源（如 `/assets/*`）也会被正确处理
- Vite 构建时会将资源放在 `assets` 目录，浏览器会直接请求这些文件
