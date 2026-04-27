# Implementation Plan: 金融合规政策监测系统

## Overview

本实现计划将金融合规政策监测系统分解为可执行的编码任务。系统采用前后端分离架构，使用 TypeScript + React (前端) 和 TypeScript + Node.js + Express (后端)。实现将按照以下顺序进行：

1. 数据库和基础设施搭建
2. 后端核心服务实现（包括新增的 WebsiteAnalyzer 服务）
3. API 端点实现
4. 前端组件和页面实现
5. 集成和端到端测试

## Tasks

- [x] 1. 搭建项目结构和基础设施
  - 创建 monorepo 结构（frontend 和 backend 目录）
  - 配置 TypeScript、ESLint、Prettier
  - 设置 PostgreSQL 数据库连接
  - 设置 Redis 连接
  - 创建数据库迁移脚本（所有表结构）
  - 配置环境变量管理
  - _Requirements: 所有需求的基础_

- [x] 2. 实现数据模型和数据访问层
  - [x] 2.1 创建 TypeScript 类型定义
    - 定义所有接口类型（Task, Execution, RetrievalResult 等）
    - 创建 DTO 类型（CreateTaskDTO, UpdateTaskDTO 等）
    - _Requirements: 1.1, 1.2, 1.3, 1.5_

  - [x] 2.2 实现数据库访问层（Repository 模式）
    - 实现 TaskRepository（CRUD 操作）
    - 实现 ExecutionRepository
    - 实现 RetrievalResultRepository
    - 实现 SummaryDocumentRepository
    - 实现 ComparisonReportRepository
    - 实现 CrossSiteAnalysisRepository
    - _Requirements: 1.5, 2.3, 3.2, 3.3, 5.4, 6.3, 8.2_

  - [ ]* 2.3 编写数据模型属性测试
    - **Property 2: 任务创建往返**
    - **Validates: Requirements 1.5**
    - **Property 5: 检索结果持久化往返**
    - **Validates: Requirements 3.2, 3.3**

- [x]* 3. 实现 WebsiteAnalyzer 服务（网站页面分析器）
  - [x]* 3.1 创建 WebsiteAnalyzer 类和接口
    - 定义 WebsiteAnalyzer 接口
    - 实现网站页面结构分析逻辑
    - 识别可能包含政策内容的页面链接
    - 识别文档链接（PDF、DOC、DOCX、XLS、XLSX）
    - 返回结构化的分析结果（页面链接列表、文档链接列表）
    - _Requirements: 4.1_

  - [ ]* 3.2 编写 WebsiteAnalyzer 属性测试
    - **Property 7: 文档URL识别**
    - **Validates: Requirements 4.1**

  - [x]* 3.3 实现错误处理和重试机制
    - 处理网络超时和连接错误
    - 实现指数退避重试（最多3次）
    - 记录详细错误日志
    - _Requirements: 3.4_

- [x] 4. 实现 ContentRetriever 服务（内容检索服务）
  - [x] 4.1 创建 ContentRetriever 类
    - 集成 WebsiteAnalyzer 获取页面和文档链接
    - 实现 fetchPageContent 方法
    - 实现 readDocument 方法（集成 Jina Reader API）
    - 实现 searchKeywords 方法（在内容中搜索关键词）
    - 实现 extractContext 方法（提取关键词上下文）
    - _Requirements: 3.1, 3.2, 4.2, 4.3_

  - [ ]* 4.2 编写 ContentRetriever 单元测试
    - 测试关键词搜索准确性
    - 测试上下文提取
    - 测试 Jina Reader 集成
    - _Requirements: 3.1, 4.3_

  - [x] 4.3 实现错误容错逻辑
    - 单个网站失败不影响其他网站处理
    - 文档读取失败时继续处理页面内容
    - 记录所有错误但继续执行
    - _Requirements: 3.4, 4.4_

  - [ ]* 4.4 编写错误容错属性测试
    - **Property 6: 错误容错性**
    - **Validates: Requirements 3.4, 4.4**
    - **Property 8: 文档内容搜索**
    - **Validates: Requirements 4.3**

- [x] 5. 实现 SubagentOrchestrator 服务（并行处理编排器）
  - [x] 5.1 创建 SubagentOrchestrator 类
    - 实现 executeParallel 方法（为每个网站创建并行任务）
    - 实现超时控制机制
    - 实现结果收集和聚合
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ]* 5.2 编写并行处理属性测试
    - **Property 4: 多网站检索完整性**
    - **Validates: Requirements 3.1, 7.1, 7.3, 8.1**
    - **Property 12: 并行执行超时处理**
    - **Validates: Requirements 7.4**

- [x] 6. 实现 AnalysisService 服务（分析和总结服务）
  - [x] 6.1 创建 AnalysisService 类
    - 实现 generateSummary 方法（调用 LLM API 生成总结）
    - 实现 compareResults 方法（对比当前和历史结果）
    - 实现 analyzeCrossSite 方法（跨网站对比分析）
    - 实现 callLLM 私有方法（封装 OpenAI API 调用）
    - _Requirements: 5.1, 5.2, 5.3, 6.1, 6.2, 6.3, 6.4, 8.2, 8.3, 8.4, 8.5_

  - [ ]* 6.2 编写 AnalysisService 属性测试
    - **Property 9: 总结文档生成**
    - **Validates: Requirements 5.2, 5.3**
    - **Property 11: 对比报告完整性**
    - **Validates: Requirements 6.2, 6.3, 6.4**
    - **Property 13: 跨网站对比分析完整性**
    - **Validates: Requirements 8.2, 8.3, 8.4, 8.5**

  - [x] 6.3 实现历史数据获取逻辑
    - 查询上次执行的检索结果
    - 处理首次执行的情况（无历史数据）
    - _Requirements: 6.1, 6.5_

  - [ ]* 6.4 编写历史对比属性测试
    - **Property 10: 历史对比数据获取**
    - **Validates: Requirements 6.1**


- [x] 7. 实现 TaskManager 服务（任务管理服务）
  - [x] 7.1 创建 TaskManager 类
    - 实现 createTask 方法（验证和创建任务）
    - 实现 getTask 方法
    - 实现 listTasks 方法（支持分页和筛选）
    - 实现 updateTask 方法
    - 实现 deleteTask 方法（软删除，保留历史）
    - 实现 pauseTask 和 resumeTask 方法
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [ ]* 7.2 编写 TaskManager 属性测试
    - **Property 1: 任务创建表单验证**
    - **Validates: Requirements 1.1, 1.2, 1.4, 1.6**
    - **Property 15: 任务编辑往返**
    - **Validates: Requirements 10.2**
    - **Property 16: 任务状态管理往返**
    - **Validates: Requirements 10.3, 10.4**
    - **Property 17: 任务删除后历史保留**
    - **Validates: Requirements 10.5, 10.6**

- [x] 8. 实现 TaskScheduler 服务（任务调度服务）
  - [x] 8.1 创建 TaskScheduler 类
    - 集成 Bull 任务队列
    - 实现 scheduleTask 方法（根据时间计划创建定时任务）
    - 实现 unscheduleTask 方法
    - 实现 executeTask 方法（手动触发执行）
    - 实现 processExecution 私有方法（执行完整的检索流程）
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 8.2 实现任务执行流程编排
    - 创建 Execution 记录
    - 调用 SubagentOrchestrator 并行检索
    - 调用 AnalysisService 生成总结和对比
    - 更新 Execution 状态
    - 处理执行错误
    - _Requirements: 2.2, 2.3, 2.4, 3.1, 5.1, 6.1, 7.1_

  - [ ]* 8.3 编写 TaskScheduler 属性测试
    - **Property 3: 任务状态转换正确性**
    - **Validates: Requirements 2.2, 2.3, 2.4**

- [x] 9. Checkpoint - 确保后端核心服务测试通过
  - 运行所有后端单元测试和属性测试
  - 确认所有测试通过，如有问题请询问用户

- [x] 10. 实现 API 端点（任务管理）
  - [x] 10.1 创建 Express 应用和中间件配置
    - 配置 CORS、body-parser、错误处理中间件
    - 实现认证中间件（简单的 JWT 认证）
    - _Requirements: 所有需求的基础_

  - [x] 10.2 实现任务管理 API 端点
    - POST /api/tasks（创建任务）
    - GET /api/tasks（获取任务列表）
    - GET /api/tasks/:taskId（获取任务详情）
    - PUT /api/tasks/:taskId（更新任务）
    - PATCH /api/tasks/:taskId/status（暂停/恢复任务）
    - DELETE /api/tasks/:taskId（删除任务）
    - POST /api/tasks/:taskId/execute（手动触发执行）
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ]* 10.3 编写 API 端点集成测试
    - 测试所有端点的请求/响应格式
    - 测试错误处理和状态码
    - 测试认证和授权
    - _Requirements: 1.4, 1.6_

- [x] 11. 实现 API 端点（结果查询）
  - [x] 11.1 实现结果查询 API 端点
    - GET /api/tasks/:taskId/executions（获取执行历史）
    - GET /api/executions/:executionId（获取执行详情）
    - GET /api/executions/:executionId/summary（获取总结文档）
    - GET /api/executions/:executionId/comparison（获取对比报告）
    - GET /api/executions/:executionId/cross-site（获取跨网站对比）
    - GET /api/executions/:executionId/original/:websiteIndex（获取原始内容）
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 11.2 编写结果查询属性测试
    - **Property 14: 执行结果可访问性**
    - **Validates: Requirements 9.2, 9.3, 9.4, 9.5**

- [x] 12. 实现前端通用组件
  - [x] 12.1 创建基础 UI 组件
    - Button.tsx（按钮组件，支持不同样式和状态）
    - Input.tsx（输入框组件）
    - Card.tsx（卡片组件）
    - Badge.tsx（标签组件，用于状态显示）
    - Modal.tsx（模态框组件）
    - Loading.tsx（加载状态组件）
    - _Requirements: 所有前端需求的基础_

  - [x] 12.2 创建布局组件
    - Header.tsx（顶部导航栏）
    - Sidebar.tsx（侧边栏导航）
    - Layout.tsx（主布局容器）
    - _Requirements: 所有前端需求的基础_

  - [ ]* 12.3 编写通用组件单元测试
    - 测试组件渲染
    - 测试用户交互
    - 测试样式应用

- [x] 13. 实现前端状态管理和 API 服务
  - [x] 13.1 创建 API 调用封装
    - 实现 api.ts（封装所有 API 调用）
    - 实现请求拦截器（添加认证 token）
    - 实现响应拦截器（统一错误处理）
    - _Requirements: 所有前端需求的基础_

  - [x] 13.2 创建状态管理 Store
    - 实现 taskStore.ts（使用 Zustand 管理任务状态）
    - 实现 resultStore.ts（管理结果状态）
    - _Requirements: 1.5, 9.1, 10.1_

- [x] 14. 实现任务管理页面
  - [x] 14.1 创建任务相关组件
    - TaskList.tsx（任务列表，支持筛选）
    - TaskCard.tsx（任务卡片）
    - TaskForm.tsx（任务创建/编辑表单）
    - TaskDetail.tsx（任务详情）
    - _Requirements: 1.1, 1.2, 1.3, 10.1, 10.2_

  - [x] 14.2 实现 Tasks.tsx 页面
    - 集成任务列表和表单
    - 实现任务创建、编辑、暂停、恢复、删除功能
    - 实现手动触发执行功能
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ]* 14.3 编写任务管理页面测试
    - 测试表单验证
    - 测试任务操作
    - 测试错误处理

- [x] 15. 实现结果查看页面
  - [x] 15.1 创建结果相关组件
    - ResultDashboard.tsx（结果仪表板）
    - SummaryView.tsx（总结视图，Markdown 渲染）
    - ComparisonView.tsx（对比视图，差异高亮）
    - CrossSiteView.tsx（跨网站对比视图）
    - _Requirements: 9.2, 9.3, 9.4, 9.5_

  - [x] 15.2 实现 Results.tsx 页面
    - 集成任务选择器和执行历史时间线
    - 实现标签页切换（总结、对比、跨网站对比、原始内容）
    - 实现内容展示和交互
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 15.3 编写结果查看页面测试
    - 测试内容渲染
    - 测试标签页切换
    - 测试数据加载

- [x] 16. 实现仪表板页面
  - [x] 16.1 创建图表组件
    - TrendChart.tsx（趋势图表，使用 Chart.js 或 Recharts）
    - DiffVisualization.tsx（差异可视化）
    - _Requirements: 9.1_

  - [x] 16.2 实现 Dashboard.tsx 页面
    - 显示统计卡片（总任务数、活跃任务、今日执行、待处理警告）
    - 显示最近执行的任务列表
    - 显示趋势图表
    - _Requirements: 9.1, 10.1_

  - [ ]* 16.3 编写仪表板页面测试
    - 测试统计数据显示
    - 测试图表渲染

- [x] 17. 实现路由和应用入口
  - [x] 17.1 配置前端路由
    - 使用 React Router 配置路由
    - 实现路由守卫（认证检查）
    - 配置路由：/dashboard, /tasks, /results, /settings
    - _Requirements: 所有前端需求的基础_

  - [x] 17.2 创建 App.tsx 和入口文件
    - 集成 Layout 和路由
    - 配置全局样式（Tailwind CSS）
    - 实现错误边界
    - _Requirements: 所有前端需求的基础_

- [x] 18. Checkpoint - 确保前端组件测试通过
  - 运行所有前端单元测试
  - 确认所有测试通过，如有问题请询问用户

- [-] 19. 集成和端到端测试
  - [x] 19.1 编写集成测试
    - 测试完整的任务创建和执行流程
    - 测试数据库事务和数据一致性
    - 使用 Testcontainers 启动测试数据库和 Redis
    - _Requirements: 所有需求_

  - [ ]* 19.2 编写端到端测试
    - 使用 Playwright 测试完整用户流程
    - 测试任务创建、执行、结果查看流程
    - 测试任务管理操作
    - _Requirements: 所有需求_

- [x] 20. 最终检查和文档
  - [x] 20.1 代码审查和优化
    - 检查代码质量和一致性
    - 优化性能瓶颈
    - 确保错误处理完整
    - _Requirements: 所有需求_

  - [x] 20.2 创建部署配置
    - 编写 Dockerfile（前端和后端）
    - 编写 docker-compose.yml
    - 创建环境变量模板文件
    - _Requirements: 所有需求的基础_

  - [x] 20.3 编写 README 和使用文档
    - 项目介绍和功能说明
    - 安装和运行指南
    - API 文档
    - 环境变量配置说明
    - _Requirements: 所有需求的基础_

- [x] 21. 最终 Checkpoint - 完整系统验证
  - 运行所有测试（单元、属性、集成、端到端）
  - 验证所有功能正常工作
  - 确认所有需求已实现，如有问题请询问用户

## Notes

- 任务标记 `*` 的为可选任务，可以跳过以加快 MVP 开发
- 每个任务都引用了具体的需求编号，确保可追溯性
- Checkpoint 任务确保增量验证，及时发现问题
- 属性测试验证通用正确性属性，单元测试验证具体示例和边缘情况
- WebsiteAnalyzer 服务在 ContentRetriever 之前实现，确保依赖关系正确
- 所有代码使用 TypeScript 编写，确保类型安全
