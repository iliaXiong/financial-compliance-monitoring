# 贡献指南

感谢您对金融合规政策监测系统的关注！我们欢迎所有形式的贡献。

## 目录

- [行为准则](#行为准则)
- [如何贡献](#如何贡献)
- [开发流程](#开发流程)
- [代码规范](#代码规范)
- [提交规范](#提交规范)
- [测试要求](#测试要求)
- [文档贡献](#文档贡献)

## 行为准则

参与本项目即表示您同意遵守我们的行为准则：

- 尊重所有贡献者
- 接受建设性批评
- 关注对社区最有利的事情
- 对其他社区成员表现出同理心

## 如何贡献

### 报告 Bug

如果您发现 bug，请创建一个 Issue，包含以下信息：

- **清晰的标题**: 简洁描述问题
- **复现步骤**: 详细的步骤说明
- **预期行为**: 您期望发生什么
- **实际行为**: 实际发生了什么
- **环境信息**: 操作系统、Node.js 版本、浏览器等
- **截图/日志**: 如果适用

**Bug 报告模板**:

```markdown
## Bug 描述
简要描述 bug

## 复现步骤
1. 进入 '...'
2. 点击 '...'
3. 滚动到 '...'
4. 看到错误

## 预期行为
应该发生什么

## 实际行为
实际发生了什么

## 环境
- OS: [e.g. macOS 13.0]
- Node.js: [e.g. 18.16.0]
- Browser: [e.g. Chrome 120]

## 截图
如果适用，添加截图

## 额外信息
其他相关信息
```

### 提出新功能

如果您有新功能建议，请创建一个 Issue，包含：

- **功能描述**: 清晰描述新功能
- **使用场景**: 为什么需要这个功能
- **建议实现**: 如果有想法，描述如何实现
- **替代方案**: 考虑过的其他方案

### 提交代码

1. **Fork 仓库**
   ```bash
   # 在 GitHub 上点击 Fork 按钮
   ```

2. **克隆您的 Fork**
   ```bash
   git clone https://github.com/your-username/financial-compliance-monitoring.git
   cd financial-compliance-monitoring
   ```

3. **创建分支**
   ```bash
   git checkout -b feature/your-feature-name
   # 或
   git checkout -b fix/your-bug-fix
   ```

4. **安装依赖**
   ```bash
   npm run install:all
   ```

5. **进行更改**
   - 编写代码
   - 添加测试
   - 更新文档

6. **运行测试**
   ```bash
   npm test
   npm run lint
   ```

7. **提交更改**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

8. **推送到您的 Fork**
   ```bash
   git push origin feature/your-feature-name
   ```

9. **创建 Pull Request**
   - 在 GitHub 上打开 Pull Request
   - 填写 PR 模板
   - 等待代码审查

## 开发流程

### 分支策略

- `main`: 主分支，始终保持可部署状态
- `develop`: 开发分支，用于集成新功能
- `feature/*`: 功能分支，从 develop 创建
- `fix/*`: 修复分支，从 develop 或 main 创建
- `hotfix/*`: 紧急修复分支，从 main 创建

### 开发环境设置

1. **安装依赖**
   ```bash
   npm run install:all
   ```

2. **配置环境变量**
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   # 编辑 .env 文件
   ```

3. **启动数据库**
   ```bash
   docker-compose up -d postgres redis
   ```

4. **运行数据库迁移**
   ```bash
   cd backend
   npm run migrate
   ```

5. **启动开发服务器**
   ```bash
   # 终端 1: 后端
   npm run dev:backend

   # 终端 2: 前端
   npm run dev:frontend
   ```

### 代码审查流程

1. 提交 Pull Request
2. 自动运行 CI 检查（测试、lint、构建）
3. 至少一位维护者审查代码
4. 根据反馈进行修改
5. 审查通过后合并

## 代码规范

### TypeScript/JavaScript

我们使用 ESLint 和 Prettier 来保持代码一致性。

**运行 Lint**:
```bash
npm run lint
```

**自动修复**:
```bash
npm run lint -- --fix
```

**格式化代码**:
```bash
npm run format
```

### 命名约定

- **文件名**: 
  - 组件: `PascalCase.tsx` (e.g., `TaskCard.tsx`)
  - 工具函数: `camelCase.ts` (e.g., `formatDate.ts`)
  - 常量: `UPPER_SNAKE_CASE.ts` (e.g., `API_ENDPOINTS.ts`)

- **变量和函数**: `camelCase`
  ```typescript
  const userName = 'John';
  function getUserData() { }
  ```

- **类和接口**: `PascalCase`
  ```typescript
  class TaskManager { }
  interface TaskData { }
  ```

- **常量**: `UPPER_SNAKE_CASE`
  ```typescript
  const MAX_RETRY_COUNT = 3;
  ```

- **私有成员**: 前缀 `_`
  ```typescript
  class Example {
    private _privateField: string;
  }
  ```

### 代码风格

**函数**:
```typescript
// 好的
function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// 避免
function calc(i: any) {
  let s = 0;
  for (let x of i) s += x.price;
  return s;
}
```

**组件**:
```typescript
// 好的
export const TaskCard: React.FC<TaskCardProps> = ({ task, onEdit, onDelete }) => {
  const handleEdit = () => {
    onEdit(task.id);
  };

  return (
    <Card>
      <h3>{task.name}</h3>
      <Button onClick={handleEdit}>编辑</Button>
    </Card>
  );
};

// 避免
export default function TC(props: any) {
  return <div onClick={() => props.onEdit(props.task.id)}>{props.task.name}</div>;
}
```

**错误处理**:
```typescript
// 好的
try {
  const result = await fetchData();
  return result;
} catch (error) {
  logger.error('Failed to fetch data:', error);
  throw new AppError(500, 'FETCH_ERROR', '数据获取失败');
}

// 避免
try {
  return await fetchData();
} catch (e) {
  console.log(e);
}
```

### 注释规范

**函数注释**:
```typescript
/**
 * 创建新的监测任务
 * 
 * @param taskData - 任务配置数据
 * @returns 创建的任务对象
 * @throws {AppError} 当验证失败时
 * 
 * @example
 * const task = await createTask({
 *   name: '测试任务',
 *   keywords: ['关键词'],
 *   targetWebsites: ['https://example.com']
 * });
 */
async function createTask(taskData: CreateTaskDTO): Promise<Task> {
  // 实现
}
```

**复杂逻辑注释**:
```typescript
// 计算下次执行时间
// 对于每日任务，如果当前时间已过执行时间，则设置为明天
// 对于每周任务，计算到下一个指定星期几的时间
const nextExecutionTime = calculateNextExecution(schedule);
```

## 提交规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范。

### 提交消息格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式（不影响代码运行）
- `refactor`: 重构（既不是新功能也不是 bug 修复）
- `perf`: 性能优化
- `test`: 添加或修改测试
- `chore`: 构建过程或辅助工具的变动
- `ci`: CI 配置文件和脚本的变动

### Scope 范围

- `backend`: 后端相关
- `frontend`: 前端相关
- `api`: API 相关
- `db`: 数据库相关
- `docs`: 文档相关
- `deps`: 依赖更新

### 示例

```bash
# 新功能
git commit -m "feat(backend): add task scheduling service"

# Bug 修复
git commit -m "fix(frontend): resolve task list pagination issue"

# 文档更新
git commit -m "docs: update API documentation"

# 重构
git commit -m "refactor(backend): simplify error handling logic"

# 性能优化
git commit -m "perf(frontend): optimize task list rendering"

# 测试
git commit -m "test(backend): add unit tests for TaskManager"

# 带 body 的提交
git commit -m "feat(backend): add cross-site analysis

Implement cross-site comparison functionality that analyzes
differences and commonalities across multiple websites.

Closes #123"
```

## 测试要求

### 测试覆盖率

- 新功能必须包含测试
- 目标覆盖率: >80%
- 核心业务逻辑: >90%

### 测试类型

**单元测试**:
```typescript
// backend/src/services/__tests__/TaskManager.test.ts
describe('TaskManager', () => {
  it('should create a task with valid data', async () => {
    const taskData = {
      name: 'Test Task',
      keywords: ['keyword1'],
      targetWebsites: ['https://example.com'],
      schedule: { type: 'daily', time: '09:00' }
    };

    const task = await taskManager.createTask(taskData);

    expect(task.id).toBeDefined();
    expect(task.name).toBe('Test Task');
  });
});
```

**属性测试**:
```typescript
import fc from 'fast-check';

// Feature: financial-compliance-monitoring, Property 2: 任务创建往返
it('should retrieve the same task data after creation', async () => {
  await fc.assert(
    fc.asyncProperty(
      taskDataArbitrary(),
      async (taskData) => {
        const created = await taskManager.createTask(taskData);
        const retrieved = await taskManager.getTask(created.id);
        
        expect(retrieved.keywords).toEqual(taskData.keywords);
        expect(retrieved.targetWebsites).toEqual(taskData.targetWebsites);
      }
    ),
    { numRuns: 100 }
  );
});
```

**集成测试**:
```typescript
describe('Task Execution Integration', () => {
  it('should complete full task execution workflow', async () => {
    // 创建任务
    const task = await createTask(taskData);
    
    // 触发执行
    const executionId = await executeTask(task.id);
    
    // 等待完成
    await waitForCompletion(executionId);
    
    // 验证结果
    const execution = await getExecution(executionId);
    expect(execution.status).toBe('completed');
  });
});
```

### 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试文件
npm test -- TaskManager.test.ts

# 运行测试并生成覆盖率报告
npm test -- --coverage

# 监听模式
npm run test:watch
```

## 文档贡献

### 文档类型

- **README.md**: 项目概述和快速开始
- **API_DOCUMENTATION.md**: API 接口文档
- **DEPLOYMENT.md**: 部署指南
- **CONTRIBUTING.md**: 本文档
- **代码注释**: 函数和复杂逻辑的说明

### 文档规范

- 使用清晰、简洁的语言
- 提供代码示例
- 包含截图（如果适用）
- 保持文档与代码同步
- 使用中文编写

### 更新文档

当您的代码更改影响以下内容时，请更新相应文档：

- API 端点变更 → 更新 `API_DOCUMENTATION.md`
- 新功能添加 → 更新 `README.md`
- 部署流程变更 → 更新 `DEPLOYMENT.md`
- 环境变量变更 → 更新 `.env.example` 和相关文档

## Pull Request 检查清单

在提交 PR 之前，请确保：

- [ ] 代码遵循项目的代码规范
- [ ] 所有测试通过
- [ ] 添加了必要的测试
- [ ] 更新了相关文档
- [ ] 提交消息遵循规范
- [ ] 没有合并冲突
- [ ] PR 描述清晰，说明了更改内容和原因

## Pull Request 模板

```markdown
## 更改类型
- [ ] Bug 修复
- [ ] 新功能
- [ ] 重构
- [ ] 文档更新
- [ ] 其他

## 描述
简要描述此 PR 的更改内容

## 相关 Issue
Closes #(issue number)

## 更改内容
- 更改 1
- 更改 2
- 更改 3

## 测试
描述如何测试这些更改

## 截图（如果适用）
添加截图

## 检查清单
- [ ] 代码遵循项目规范
- [ ] 所有测试通过
- [ ] 添加了必要的测试
- [ ] 更新了文档
- [ ] 提交消息遵循规范
```

## 获取帮助

如果您在贡献过程中遇到问题：

- 查看现有的 Issues 和 Pull Requests
- 阅读项目文档
- 在 Issue 中提问
- 联系维护者

## 许可证

通过贡献代码，您同意您的贡献将在 MIT 许可证下发布。

---

再次感谢您的贡献！🎉
