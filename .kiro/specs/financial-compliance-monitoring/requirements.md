# Requirements Document

## Introduction

本文档定义了金融合规政策监测网站的功能需求。该系统允许用户监测指定网站上的金融合规政策关键词，自动检索、总结和对比政策内容的变化，帮助用户及时了解合规政策的更新。

## Glossary

- **System**: 金融合规政策监测网站系统
- **User**: 使用本系统的金融合规人员或相关业务人员
- **Monitoring_Task**: 用户创建的监测任务，包含关键词、目标网站和执行时间
- **Target_Website**: 用户指定的需要监测的网站
- **Keyword**: 用户指定的需要监测的金融合规术语或政策名称
- **Retrieval_Result**: 系统从目标网站检索到的关键词定义、解释或描述
- **Summary_Document**: 系统生成的检索结果摘要文档
- **Original_Content**: 从目标网站获取的原始内容
- **Comparison_Report**: 系统生成的本次检索结果与上次检索结果的对比报告
- **Jina_Reader**: 用于读取URL中文档内容的工具
- **Subagent**: 用于并行处理多个网站检索任务的子代理

## Requirements

### Requirement 1: 创建监测任务

**User Story:** 作为用户，我希望能够创建监测任务，以便系统自动监测我关心的金融合规政策关键词。

#### Acceptance Criteria

1. THE System SHALL 允许 User 输入至少一个 Keyword
2. THE System SHALL 允许 User 指定至少一个 Target_Website
3. THE System SHALL 允许 User 设置任务执行的时间计划(每周几)
4. WHEN User 提交监测任务, THE System SHALL 验证所有必填字段已填写
5. WHEN User 提交有效的监测任务, THE System SHALL 保存 Monitoring_Task 并返回任务标识符
6. IF 必填字段缺失, THEN THE System SHALL 返回描述性错误消息

### Requirement 2: 定时执行监测任务

**User Story:** 作为用户，我希望系统能够按照我设置的时间自动执行监测任务，以便我不需要手动触发检索。

#### Acceptance Criteria

1. WHEN 到达 Monitoring_Task 的预定执行时间, THE System SHALL 自动触发任务执行
2. WHILE Monitoring_Task 正在执行, THE System SHALL 记录任务状态为执行中
3. WHEN Monitoring_Task 执行完成, THE System SHALL 更新任务状态为已完成
4. IF Monitoring_Task 执行失败, THEN THE System SHALL 记录错误信息并更新任务状态为失败

### Requirement 3: 检索关键词内容

**User Story:** 作为用户，我希望系统能够在指定网站中检索关键词的定义和解释，以便我了解该关键词的官方说明。

#### Acceptance Criteria

1. WHEN Monitoring_Task 执行时, THE System SHALL 在每个 Target_Website 中使用< web fetch > 搜索 Keyword 相关内容
2. THE System SHALL 通过搜索网站中的内容/文档，使用LLM分析 Keyword 的定义、解释或描述作为 Retrieval_Result
3. THE System SHALL 保存 Original_Content 供后续查看
4. IF Target_Website 无法访问, THEN THE System SHALL 记录错误并继续处理其他网站
5. IF 在 Target_Website 中未找到 Keyword, THEN THE System SHALL 记录未找到的状态

### Requirement 4: 读取网站文档内容

**User Story:** 作为用户，我希望系统能够读取网站页面中的文档内容，以便检索存储在PDF或其他文档格式中的政策信息。

#### Acceptance Criteria

1. WHEN Target_Website 页面包含文档链接, THE System SHALL 识别文档URL
2. WHEN 检测到文档URL, THE System SHALL 使用 Jina_Reader 读取文档内容
3. THE System SHALL 在文档内容中搜索 Keyword
4. IF 文档无法读取, THEN THE System SHALL 记录错误并继续处理页面的其他内容
5. IF 文档含有用户搜索 Keyword，将文档解析后的内容作为 Retrieval_Result 

### Requirement 5: 生成总结文档

**User Story:** 作为用户，我希望系统能够生成检索结果的总结文档，以便我快速了解关键信息而不需要阅读所有原文。

#### Acceptance Criteria

1. WHEN 检索完成, THE System SHALL 分析所有 Retrieval_Result
2. THE System SHALL 生成 Summary_Document 包含关键词定义的摘要
3. THE Summary_Document SHALL 包含信息来源的引用
4. THE System SHALL 保存 Summary_Document 供 User 查看

### Requirement 6: 对比检索结果

**User Story:** 作为用户，我希望系统能够对比本次和上次的检索结果，以便我了解政策内容是否发生了变化。

#### Acceptance Criteria

1. WHEN Monitoring_Task 不是首次执行, THE System SHALL 获取上次执行的 Retrieval_Result
2. THE System SHALL 对比本次 Retrieval_Result 与上次 Retrieval_Result
3. THE System SHALL 生成 Comparison_Report 标识内容的变化
4. THE Comparison_Report SHALL 突出显示新增、删除或修改的内容
5. WHERE Monitoring_Task 是首次执行, THE System SHALL 标记为无历史数据可对比

### Requirement 7: 并行处理多个网站

**User Story:** 作为用户，我希望系统能够同时检索多个网站，以便提高检索效率并节省时间。

#### Acceptance Criteria

1. WHEN Monitoring_Task 包含多个 Target_Website, THE System SHALL 为每个网站创建独立的 Subagent
2. THE System SHALL 并行执行所有 Subagent 的检索任务
3. WHEN 所有 Subagent 完成检索, THE System SHALL 收集所有结果
4. THE System SHALL 等待所有 Subagent 完成或超时后再生成最终报告

### Requirement 8: 对比不同网站的结果

**User Story:** 作为用户，我希望系统能够对比不同网站对同一关键词的解释，以便我了解不同来源的政策差异。

#### Acceptance Criteria

1. WHEN Monitoring_Task 包含多个 Target_Website, THE System SHALL 收集每个网站的 Retrieval_Result
2. THE System SHALL 生成跨网站对比分析
3. THE 跨网站对比分析 SHALL 标识不同网站间定义的差异
4. THE 跨网站对比分析 SHALL 标识不同网站间定义的共同点
5. THE System SHALL 在输出结果中包含跨网站对比分析

### Requirement 9: 查看监测结果

**User Story:** 作为用户，我希望能够查看监测任务的执行结果，以便我了解政策内容和变化情况。

#### Acceptance Criteria

1. THE System SHALL 允许 User 查看 Monitoring_Task 的执行历史
2. WHEN User 选择某次执行记录, THE System SHALL 显示 Summary_Document
3. THE System SHALL 允许 User 查看 Original_Content
4. THE System SHALL 允许 User 查看 Comparison_Report
5. THE System SHALL 允许 User 查看跨网站对比分析

### Requirement 10: 管理监测任务

**User Story:** 作为用户，我希望能够管理我的监测任务，以便我可以修改、暂停或删除不再需要的任务。

#### Acceptance Criteria

1. THE System SHALL 允许 User 查看所有已创建的 Monitoring_Task
2. THE System SHALL 允许 User 编辑 Monitoring_Task 的配置
3. THE System SHALL 允许 User 暂停 Monitoring_Task 的执行
4. THE System SHALL 允许 User 恢复已暂停的 Monitoring_Task
5. THE System SHALL 允许 User 删除 Monitoring_Task
6. WHEN User 删除 Monitoring_Task, THE System SHALL 保留历史执行记录
