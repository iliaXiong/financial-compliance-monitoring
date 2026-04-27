# 前端通用组件文档

本目录包含金融合规监测系统的所有可复用 UI 组件。所有组件都遵循设计系统的色彩方案和设计原则。

## 设计系统

### 色彩方案
- **主色调**: `#1E40AF` (深蓝色 - 专业可信)
- **辅助色**: `#3B82F6` (亮蓝色 - 年轻活力)
- **成功色**: `#10B981` (绿色)
- **警告色**: `#F59E0B` (橙色)
- **错误色**: `#EF4444` (红色)
- **背景色**: `#F9FAFB` (浅灰)

### 设计原则
- **简洁**: 去除不必要的装饰，突出核心功能
- **年轻化**: 使用圆角、渐变、微动效
- **专业**: 保持金融行业的严谨和可信
- **响应式**: 适配桌面和移动设备

## 基础 UI 组件

### Button (按钮组件)

支持多种样式和状态的按钮组件。

**Props:**
- `variant`: 按钮样式 - `'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'outline'`
- `size`: 按钮大小 - `'sm' | 'md' | 'lg'`
- `loading`: 是否显示加载状态
- `disabled`: 是否禁用

**示例:**
```tsx
import { Button } from '@/components/common';

<Button variant="primary" size="md">
  提交
</Button>

<Button variant="outline" loading>
  加载中
</Button>
```

### Input (输入框组件)

带标签和错误提示的输入框组件。

**Props:**
- `label`: 输入框标签
- `error`: 错误提示信息
- `helperText`: 辅助说明文字

**示例:**
```tsx
import { Input } from '@/components/common';

<Input
  label="用户名"
  placeholder="请输入用户名"
  error="用户名不能为空"
/>
```

### Card (卡片组件)

用于内容分组的卡片容器。

**Props:**
- `padding`: 内边距大小 - `'none' | 'sm' | 'md' | 'lg'`
- `hover`: 是否启用悬停效果

**示例:**
```tsx
import { Card } from '@/components/common';

<Card padding="md" hover>
  <h3>卡片标题</h3>
  <p>卡片内容</p>
</Card>
```

### Badge (标签组件)

用于状态显示的标签组件。

**Props:**
- `variant`: 标签样式 - `'success' | 'warning' | 'error' | 'info' | 'default'`
- `size`: 标签大小 - `'sm' | 'md'`

**示例:**
```tsx
import { Badge } from '@/components/common';

<Badge variant="success">已完成</Badge>
<Badge variant="warning">执行中</Badge>
<Badge variant="error">失败</Badge>
```

### Modal (模态框组件)

可自定义大小的模态框组件。

**Props:**
- `isOpen`: 是否打开
- `onClose`: 关闭回调函数
- `title`: 模态框标题
- `size`: 模态框大小 - `'sm' | 'md' | 'lg' | 'xl'`
- `showCloseButton`: 是否显示关闭按钮

**示例:**
```tsx
import { Modal, Button } from '@/components/common';
import { useState } from 'react';

const [isOpen, setIsOpen] = useState(false);

<Button onClick={() => setIsOpen(true)}>打开模态框</Button>

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="确认操作"
  size="md"
>
  <p>确定要执行此操作吗？</p>
  <div className="mt-4 flex justify-end gap-3">
    <Button variant="outline" onClick={() => setIsOpen(false)}>
      取消
    </Button>
    <Button onClick={() => setIsOpen(false)}>
      确认
    </Button>
  </div>
</Modal>
```

### Loading (加载状态组件)

显示加载状态的组件。

**Props:**
- `size`: 加载图标大小 - `'sm' | 'md' | 'lg'`
- `text`: 加载提示文字
- `fullScreen`: 是否全屏显示

**示例:**
```tsx
import { Loading } from '@/components/common';

<Loading size="md" text="加载中..." />

<Loading fullScreen text="正在处理，请稍候..." />
```

## 布局组件

### Header (顶部导航栏)

应用顶部导航栏，显示 Logo 和用户信息。

**Props:**
- `userName`: 用户名
- `onLogout`: 退出登录回调函数

**示例:**
```tsx
import { Header } from '@/components/layout';

<Header
  userName="张三"
  onLogout={() => console.log('退出登录')}
/>
```

### Sidebar (侧边栏导航)

应用侧边栏导航菜单。

**Props:**
- `activeRoute`: 当前激活的路由
- `onNavigate`: 导航回调函数

**示例:**
```tsx
import { Sidebar } from '@/components/layout';

<Sidebar
  activeRoute="/dashboard"
  onNavigate={(route) => console.log('导航到:', route)}
/>
```

### Layout (主布局容器)

应用主布局容器，集成 Header 和 Sidebar。

**Props:**
- `children`: 页面内容
- `userName`: 用户名
- `activeRoute`: 当前激活的路由
- `onNavigate`: 导航回调函数
- `onLogout`: 退出登录回调函数

**示例:**
```tsx
import { Layout } from '@/components/layout';

<Layout
  userName="张三"
  activeRoute="/dashboard"
  onNavigate={(route) => console.log('导航到:', route)}
  onLogout={() => console.log('退出登录')}
>
  <YourPageContent />
</Layout>
```

## 使用指南

### 导入组件

所有组件都可以从 `@/components` 导入：

```tsx
// 导入基础组件
import { Button, Input, Card, Badge, Modal, Loading } from '@/components/common';

// 导入布局组件
import { Header, Sidebar, Layout } from '@/components/layout';

// 或者一次性导入
import { Button, Input, Layout } from '@/components';
```

### 样式定制

所有组件都支持通过 `className` prop 添加自定义样式：

```tsx
<Button className="mt-4 w-full">
  全宽按钮
</Button>

<Card className="border-2 border-primary">
  自定义边框的卡片
</Card>
```

### 响应式设计

组件使用 Tailwind CSS 的响应式工具类，自动适配不同屏幕尺寸：

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <Card>卡片 1</Card>
  <Card>卡片 2</Card>
  <Card>卡片 3</Card>
</div>
```

## 开发指南

### 添加新组件

1. 在 `common/` 或 `layout/` 目录下创建新组件文件
2. 定义组件的 Props 接口
3. 实现组件逻辑
4. 在对应的 `index.ts` 中导出组件
5. 更新本文档

### 组件规范

- 所有组件必须使用 TypeScript
- 所有 Props 必须定义接口
- 使用 Tailwind CSS 进行样式设计
- 遵循设计系统的色彩方案
- 支持响应式设计
- 提供合理的默认值

## 测试

组件测试位于 `__tests__` 目录下，使用 Jest 和 React Testing Library：

```bash
# 运行所有测试
npm test

# 监听模式
npm run test:watch
```

## 演示页面

查看 `src/pages/ComponentDemo.tsx` 了解所有组件的使用示例。
