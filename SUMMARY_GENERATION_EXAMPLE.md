# 总结文档生成流程实例

## 1. 数据流程概述

当搜索任务完成后，系统会将**所有找到的检索结果**（`found: true`）传递给LLM来生成总结文档。

## 2. 实际执行实例

### 执行信息
- **执行ID**: `cad19fd2-6267-4469-a578-e54c5fb49ac3`
- **任务**: 搜索 NYSE 网站上的专业订阅者和非专业订阅者相关信息
- **关键词**: 
  1. `professional subscriber`
  2. `non-professional subscriber`
- **目标网站**: `https://www.nyse.com/index`

### 检索结果（传递给LLM的数据）

#### 结果 1: Professional Subscriber
```
网站: https://www.nyse.com/index
关键词: professional subscriber
找到: true
来源URL: https://www.nyse.com/index

内容:
In the Contracts section of the pricing policies page, Professional Subscriber Agreement documents are listed as available contracts for electronic and hard copy formats, indicating these are formal agreements for professional users accessing NYSE market data services.

上下文:
In the Contracts section of the pricing policies page, Professional Subscriber Agreement documents are listed as available contracts for electronic and hard copy formats, indicating these are formal agreements for professional users accessing NYSE market data services.
```

#### 结果 2: Non-Professional Subscriber
```
网站: https://www.nyse.com/index
关键词: non-professional subscriber
找到: true
来源URL: https://www.nyse.com/index

内容:
In the Contracts section, Exhibit B specifically covers Nonprofessional and Metered Usage Addendum, which governs the terms for non-professional subscribers who access NYSE market data under different pricing and usage structures compared to professional subscribers.

上下文:
In the Contracts section, Exhibit B specifically covers Nonprofessional and Metered Usage Addendum, which governs the terms for non-professional subscribers who access NYSE market data under different pricing and usage structures compared to professional subscribers.
```

## 3. 发送给LLM的完整提示词

```
你是一个金融合规政策分析专家。请根据以下检索结果生成一份简洁的摘要文档（使用Markdown格式）。

检索结果：

## 网站: https://www.nyse.com/index
关键词: professional subscriber
内容:
In the Contracts section of the pricing policies page, Professional Subscriber Agreement documents are listed as available contracts for electronic and hard copy formats, indicating these are formal agreements for professional users accessing NYSE market data services.

上下文:
In the Contracts section of the pricing policies page, Professional Subscriber Agreement documents are listed as available contracts for electronic and hard copy formats, indicating these are formal agreements for professional users accessing NYSE market data services.

---

## 网站: https://www.nyse.com/index
关键词: non-professional subscriber
内容:
In the Contracts section, Exhibit B specifically covers Nonprofessional and Metered Usage Addendum, which governs the terms for non-professional subscribers who access NYSE market data under different pricing and usage structures compared to professional subscribers.

上下文:
In the Contracts section, Exhibit B specifically covers Nonprofessional and Metered Usage Addendum, which governs the terms for non-professional subscribers who access NYSE market data under different pricing and usage structures compared to professional subscribers.

---

请生成摘要，包括：
1. 每个关键词的定义和解释
2. 关键要点
3. 信息来源引用

使用Markdown格式，清晰易读。
```

## 4. LLM生成的总结文档

```markdown
# NYSE市场数据订阅者分类政策摘要

## 1. 关键词定义与解释

### Professional Subscriber（专业订阅者）
- **定义**：访问NYSE市场数据服务的专业用户
- **合规框架**：受Professional Subscriber Agreement正式协议约束
- **文档形式**：提供电子版和纸质版合同格式

### Non-Professional Subscriber（非专业订阅者）
- **定义**：以非专业身份访问NYSE市场数据的用户
- **合规框架**：受Exhibit B - Nonprofessional and Metered Usage Addendum管辖
- **特殊条款**：适用不同于专业订阅者的定价和使用结构

## 2. 关键要点

### 订阅者分类体系
- NYSE建立了明确的**双层订阅者分类制度**
- 专业与非专业订阅者适用**不同的合规要求**和**定价结构**

### 合规文档架构
- **专业订阅者**：独立的Professional Subscriber Agreement
- **非专业订阅者**：通过Exhibit B附录形式管理
- 所有合同文件均在定价政策页面的合同部分公开列示

### 使用条款差异化
- 两类订阅者在**定价**和**使用结构**方面存在显著区别
- 非专业订阅者享有**计量使用**（Metered Usage）条款

## 3. 信息来源

**来源网站**：[NYSE官方网站](https://www.nyse.com/index)
**文档位置**：定价政策页面 > 合同部分
**检索时间**：基于当前可获取的公开信息

---
*本摘要基于NYSE官方网站公开信息整理，建议查阅最新版本的正式合同文件以获取完整条款详情。*
```

## 5. 数据结构说明

### RetrievalResult 结构
每个检索结果包含以下字段：
```typescript
{
  id: string;                    // 结果ID
  executionId: string;           // 执行ID
  websiteUrl: string;            // 网站URL
  keyword: string;               // 搜索关键词
  found: boolean;                // 是否找到（只有true的会传给LLM）
  content: string;               // LLM提取的内容（完整定义）
  context: string;               // 上下文信息
  sourceUrl: string;             // 来源URL（可能是子页面或文档）
  documentUrl?: string;          // 文档URL（如果来自PDF等）
  createdAt: string;             // 创建时间
}
```

### 传递给LLM的数据特点

1. **只传递找到的结果**: `found: true` 的结果
2. **包含完整内容**: `content` 字段包含LLM从网页中提取的完整定义
3. **包含上下文**: `context` 字段提供额外的上下文信息
4. **来源可追溯**: 包含 `sourceUrl` 用于引用

## 6. 当前系统的优势

1. **智能提取**: 使用LLM从网页内容中智能提取关键词的完整定义
2. **上下文保留**: 保留上下文信息，帮助理解定义的背景
3. **来源追溯**: 记录来源URL，便于验证和进一步查阅
4. **结构化输出**: 生成的总结文档使用Markdown格式，结构清晰

## 7. 改进建议

如果需要优化总结文档的质量，可以考虑：

1. **增强提示词**: 添加更具体的格式要求或输出示例
2. **添加元数据**: 在提示词中包含任务名称、执行时间等信息
3. **分类汇总**: 按网站或关键词类别组织内容
4. **对比分析**: 如果有多个网站，可以要求LLM进行对比分析
5. **合规重点**: 强调金融合规相关的关键信息提取
