# Docker 容器网络超时问题解决方案

## 问题描述
Docker 容器访问 nasdaq.com 时持续超时（30秒），导致无法获取网页内容。

## 已尝试的方案
1. ✅ 增加超时时间到 60秒 - 无效
2. ✅ 配置 DNS 服务器（8.8.8.8, 8.8.4.4）- 无效
3. ❌ 使用 host 网络模式 - 导致其他服务连接失败

## 推荐解决方案

### 方案A：更换测试网站（推荐，立即可用）

某些网站对 Docker 容器的请求有特殊限制。建议更换为更友好的测试网站：

**可用的测试网站：**
- https://www.sec.gov/ - 美国证券交易委员会
- https://www.finra.org/ - 金融业监管局
- https://www.cftc.gov/ - 商品期货交易委员会
- https://www.opraplan.com/ - 已验证可用

**如何更换：**
1. 在前端创建新任务时，使用上述网站替代 nasdaq.com
2. 或者修改现有任务的目标网站

### 方案B：配置 HTTP 代理

如果必须访问 nasdaq.com，可以配置代理服务器：

1. 在 `docker-compose.yml` 中添加代理环境变量：
```yaml
environment:
  HTTP_PROXY: http://your-proxy:port
  HTTPS_PROXY: http://your-proxy:port
  NO_PROXY: localhost,127.0.0.1,postgres,redis
```

2. 或在 `backend/.env` 中配置：
```env
HTTP_PROXY=http://your-proxy:port
HTTPS_PROXY=http://your-proxy:port
```

### 方案C：使用 Puppeteer/Playwright（长期方案）

对于难以访问的网站，可以使用无头浏览器：

**优点：**
- 模拟真实浏览器行为
- 绕过反爬虫机制
- 支持 JavaScript 渲染

**缺点：**
- 资源消耗更大
- 速度较慢
- 需要额外配置

### 方案D：重新启用 WebsiteAnalyzer（可选）

如果网络问题解决，可以重新启用 WebsiteAnalyzer：

1. 修改 `backend/.env`：
```env
ENABLE_WEBSITE_ANALYZER=true
```

2. 重启服务：
```bash
docker-compose restart backend
```

## 当前状态

- ✅ WebsiteAnalyzer 已禁用（避免额外的网络请求）
- ✅ DNS 配置已优化
- ✅ 失败的检索会保存错误记录
- ⚠️ nasdaq.com 仍然无法访问

## 建议

**短期：** 使用方案A，更换为可访问的测试网站  
**长期：** 如果需要访问特定网站，考虑方案B（代理）或方案C（无头浏览器）
