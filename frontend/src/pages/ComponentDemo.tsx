import { useState } from 'react';
import { Button, Input, Card, Badge, Modal, Loading } from '../components/common';

export const ComponentDemo = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">组件演示</h1>

      {/* Buttons */}
      <Card>
        <h2 className="text-xl font-semibold mb-4">按钮组件</h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary">主要按钮</Button>
          <Button variant="secondary">次要按钮</Button>
          <Button variant="success">成功按钮</Button>
          <Button variant="warning">警告按钮</Button>
          <Button variant="error">错误按钮</Button>
          <Button variant="outline">轮廓按钮</Button>
          <Button loading>加载中</Button>
          <Button disabled>禁用按钮</Button>
        </div>
        <div className="flex gap-3 mt-4">
          <Button size="sm">小按钮</Button>
          <Button size="md">中按钮</Button>
          <Button size="lg">大按钮</Button>
        </div>
      </Card>

      {/* Inputs */}
      <Card>
        <h2 className="text-xl font-semibold mb-4">输入框组件</h2>
        <div className="space-y-4 max-w-md">
          <Input
            label="用户名"
            placeholder="请输入用户名"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <Input
            label="邮箱"
            type="email"
            placeholder="请输入邮箱"
            helperText="我们不会分享您的邮箱"
          />
          <Input
            label="密码"
            type="password"
            placeholder="请输入密码"
            error="密码长度至少8位"
          />
        </div>
      </Card>

      {/* Badges */}
      <Card>
        <h2 className="text-xl font-semibold mb-4">标签组件</h2>
        <div className="flex flex-wrap gap-3">
          <Badge variant="success">成功</Badge>
          <Badge variant="warning">警告</Badge>
          <Badge variant="error">错误</Badge>
          <Badge variant="info">信息</Badge>
          <Badge variant="default">默认</Badge>
        </div>
        <div className="flex gap-3 mt-4">
          <Badge size="sm">小标签</Badge>
          <Badge size="md">中标签</Badge>
        </div>
      </Card>

      {/* Modal */}
      <Card>
        <h2 className="text-xl font-semibold mb-4">模态框组件</h2>
        <Button onClick={() => setIsModalOpen(true)}>打开模态框</Button>
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="示例模态框"
          size="md"
        >
          <p className="text-gray-600">
            这是一个模态框的示例内容。您可以在这里放置任何内容。
          </p>
          <div className="mt-4 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              取消
            </Button>
            <Button onClick={() => setIsModalOpen(false)}>确认</Button>
          </div>
        </Modal>
      </Card>

      {/* Loading */}
      <Card>
        <h2 className="text-xl font-semibold mb-4">加载组件</h2>
        <div className="flex gap-8 items-center">
          <Loading size="sm" />
          <Loading size="md" />
          <Loading size="lg" />
          <Loading size="md" text="加载中..." />
        </div>
      </Card>

      {/* Cards */}
      <div>
        <h2 className="text-xl font-semibold mb-4">卡片组件</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card padding="sm">
            <h3 className="font-semibold">小内边距</h3>
            <p className="text-sm text-gray-600">这是一个小内边距的卡片</p>
          </Card>
          <Card padding="md">
            <h3 className="font-semibold">中内边距</h3>
            <p className="text-sm text-gray-600">这是一个中内边距的卡片</p>
          </Card>
          <Card padding="lg" hover>
            <h3 className="font-semibold">大内边距 + 悬停效果</h3>
            <p className="text-sm text-gray-600">鼠标悬停时会有阴影效果</p>
          </Card>
        </div>
      </div>
    </div>
  );
};
