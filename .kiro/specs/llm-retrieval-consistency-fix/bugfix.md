# Bugfix Requirements Document

## Introduction

修复 LLM 检索结果不一致的问题。相同的任务配置（相同的关键词、相同的目标网站）在不同时间执行时，LLM 返回了不同的检索结果。第一次执行找到了关键词，第二次执行未找到关键词，且第一次执行产生了重复的检索结果。

根本原因包括：
1. LLM 响应解析后缺少去重逻辑，导致重复的关键词结果被存储
2. LLM 本身的非确定性行为（即使 temperature=0.1）
3. 关键词配置使用了中文逗号，可能导致解析错误

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN LLM 返回包含重复关键词的检索结果 THEN 系统将所有重复结果都存储到数据库中，导致同一个关键词有多条记录

1.2 WHEN 相同的任务配置在不同时间执行 THEN LLM 可能返回完全不同的检索结果（第一次找到关键词，第二次未找到）

1.3 WHEN 用户在任务配置中使用中文标点符号（如中文逗号）分隔关键词 THEN 系统接受该输入但可能导致关键词解析错误

### Expected Behavior (Correct)

2.1 WHEN LLM 返回包含重复关键词的检索结果 THEN 系统 SHALL 对结果进行去重，每个关键词只保留一条记录（优先保留 found=true 的记录）

2.2 WHEN 相同的任务配置在不同时间执行 THEN 系统 SHALL 实现重试机制，如果 LLM 返回的结果与历史结果差异过大（如所有关键词从找到变为未找到），自动重试一次并记录差异

2.3 WHEN 用户在任务配置中使用中文标点符号分隔关键词 THEN 系统 SHALL 在前端和后端验证输入，拒绝包含中文标点符号的关键词配置并提示用户使用英文逗号

### Unchanged Behavior (Regression Prevention)

3.1 WHEN LLM 返回不包含重复关键词的检索结果 THEN 系统 SHALL CONTINUE TO 正常存储所有检索结果

3.2 WHEN 用户使用正确格式的关键词配置（英文逗号分隔） THEN 系统 SHALL CONTINUE TO 正常解析和处理关键词

3.3 WHEN LLM 检索成功找到关键词 THEN 系统 SHALL CONTINUE TO 正确提取和存储关键词的内容、上下文和来源 URL

3.4 WHEN 任务执行失败或 LLM API 调用失败 THEN 系统 SHALL CONTINUE TO 正确记录错误信息并标记执行状态为 failed
