# Web Interface Guide - 前端界面使用指南

## 概述 Overview

期权交易助手现在提供了一个现代化的 Web 界面，让您可以通过浏览器与系统进行交互。

The Options Trading Assistant now features a modern web interface that allows you to interact with the system through your browser.

## 快速启动 Quick Start

### 方式 1：启动 Web 服务器（推荐）

```bash
npm run web
```

然后在浏览器中打开：`http://localhost:3000`

### 方式 2：命令行演示

```bash
npm run demo
```

## 功能特性 Features

### 🎨 现代化界面
- 渐变色背景和卡片式设计
- 流畅的动画效果
- 响应式布局，支持移动端

### 💬 对话式交互
- 实时消息显示
- 用户和助手消息分离
- 快速操作按钮

### 🚀 快速开始
- 预设快捷按钮（AAPL、苹果、TSLA）
- 智能输入提示
- 键盘快捷键支持（Enter 发送）

### 📊 完整工作流
1. 标的资产选择和验证
2. 市场情绪分析
3. 期权合约推荐
4. 交易链接生成

## 界面说明 Interface Guide

### 头部 Header
- **Logo**: 期权交易助手标识
- **状态指示器**: 显示系统运行状态（绿色圆点表示正常）

### 欢迎卡片 Welcome Card
- 功能介绍网格
- 快速开始按钮
- 首次使用时显示，开始对话后自动隐藏

### 对话区域 Chat Area
- **用户消息**: 紫色渐变背景，右侧显示
- **助手消息**: 白色背景，左侧显示
- **操作按钮**: 每条助手消息下方可能包含快速操作按钮
- **自动滚动**: 新消息自动滚动到可见区域

### 输入区域 Input Area
- **输入框**: 支持多行文本输入
- **发送按钮**: 点击或按 Enter 发送消息
- **提示信息**: 显示支持的标的和快捷键

## 使用流程 Usage Flow

### 1. 选择标的 Select Underlying

输入股票代码或中文名称：
- `AAPL` 或 `苹果` → Apple Inc.
- `TSLA` 或 `特斯拉` → Tesla Inc.
- `MSFT` 或 `微软` → Microsoft Corp.

### 2. 确认标的 Confirm Underlying

系统显示标的信息：
- 公司名称和代码
- 当前价格
- 涨跌幅

点击"确认"继续，或"重新选择"返回。

### 3. 市场分析 Market Analysis

系统自动分析：
- 市场情绪（看涨/看跌/中性）
- 技术面分析
- 建议策略（Long Call/Long Put）

### 4. 期权合约 Option Contracts

系统推荐前 3-5 个合约，显示：
- 合约代码
- 行权价
- 到期日
- 权利金
- Delta 值
- 推荐评分
- 风险等级
- 分析说明

### 5. 选择合约 Select Contracts

输入序号选择合约：
- 单个：`1`
- 多个：`1,2,3` 或 `1 2 3`

### 6. 生成链接 Generate Links

系统生成：
- 交易链接（每个选中的合约）
- 自选列表确认

## 特殊命令 Special Commands

- `帮助` 或 `help` - 显示帮助信息
- `重新开始` 或 `restart` - 重置会话
- `退出` 或 `exit` - 退出程序（仅命令行模式）

## 技术架构 Technical Architecture

### 前端 Frontend
- **HTML**: `public/index.html` - 页面结构
- **CSS**: `public/styles.css` - 样式设计
- **JavaScript**: `public/app.js` - 交互逻辑

### 后端 Backend
- **Server**: `server.mjs` - HTTP 服务器
- **API**: 预留 API 端点用于未来集成

### 当前实现 Current Implementation

前端使用 **Mock 数据** 模拟完整的对话流程：
- 状态机逻辑在前端实现
- 模拟 DialogEngine 的响应
- 支持完整的工作流程

### 未来集成 Future Integration

后端 API 端点已预留：
- `POST /api/session/start` - 创建会话
- `POST /api/dialog/process` - 处理用户输入

集成步骤：
1. 在 `server.mjs` 中导入 DialogEngine
2. 实现 API 端点逻辑
3. 更新 `app.js` 中的 `processUserInput` 函数
4. 移除前端 Mock 逻辑

## 开发说明 Development Notes

### 文件结构
```
.
├── public/
│   ├── index.html      # 页面结构
│   ├── styles.css      # 样式文件
│   └── app.js          # 前端逻辑
├── server.mjs          # Web 服务器
├── demo-simple.mjs     # 命令行演示
└── WEB_INTERFACE.md    # 本文档
```

### 自定义端口

```bash
PORT=8080 npm run web
```

### 调试模式

打开浏览器开发者工具（F12）查看：
- Console: 日志和错误信息
- Network: API 请求（未来）
- Elements: DOM 结构和样式

## 浏览器兼容性 Browser Compatibility

支持的浏览器：
- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ 移动端浏览器

## 常见问题 FAQ

### Q: 为什么使用 Mock 数据？
A: 当前版本专注于前端界面开发，使用 Mock 数据可以快速验证 UI/UX 设计。后端集成将在下一阶段完成。

### Q: 如何切换到真实数据？
A: 参考 `SWITCH_TO_REAL_DATA.md` 文档，配置真实的数据源（如 Yahoo Finance API）。

### Q: 支持哪些标的？
A: 当前 Mock 版本支持 AAPL、TSLA、MSFT。集成真实数据源后将支持所有美股期权。

### Q: 如何部署到生产环境？
A: 
1. 集成真实的 DialogEngine 后端
2. 配置环境变量（API keys、数据源等）
3. 使用 PM2 或 Docker 部署
4. 配置反向代理（Nginx）
5. 启用 HTTPS

## 下一步 Next Steps

1. **后端集成**: 连接 DialogEngine 到 Web API
2. **数据源**: 集成真实的市场数据 API
3. **用户认证**: 添加登录和会话管理
4. **持久化**: 保存用户的自选列表和历史记录
5. **实时更新**: WebSocket 支持实时价格更新
6. **图表展示**: 添加价格走势和期权链可视化

## 反馈 Feedback

如有问题或建议，请通过以下方式反馈：
- 提交 Issue
- 发送邮件
- 参与讨论

---

**享受使用期权交易助手！ Enjoy using the Options Trading Assistant!** 🚀
