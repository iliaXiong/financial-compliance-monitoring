import React from 'react';
import { Card, Badge, Button } from '../common';
import type { Task } from '../../types';

export interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onPause: (taskId: string) => void;
  onResume: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onExecute: (taskId: string) => void;
  onViewDetail: (task: Task) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onEdit,
  onPause,
  onResume,
  onDelete,
  onExecute,
  onViewDetail,
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">活跃</Badge>;
      case 'paused':
        return <Badge variant="warning">已暂停</Badge>;
      case 'deleted':
        return <Badge variant="error">已删除</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const getScheduleText = (schedule: Task['schedule']) => {
    switch (schedule.type) {
      case 'once':
        return '执行一次';
      case 'daily':
        return `每天 ${schedule.time || ''}`;
      case 'weekly':
        return `每周${['日', '一', '二', '三', '四', '五', '六'][schedule.dayOfWeek || 0]} ${schedule.time || ''}`;
      case 'monthly':
        return `每月${schedule.dayOfMonth}日 ${schedule.time || ''}`;
      default:
        return schedule.type;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '未执行';
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card hover className="transition-all duration-200">
      <div className="flex flex-col space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{task.name}</h3>
            <div className="flex items-center space-x-2">
              {getStatusBadge(task.status)}
              <span className="text-sm text-gray-500">{getScheduleText(task.schedule)}</span>
            </div>
          </div>
        </div>

        {/* Keywords */}
        <div>
          <p className="text-sm text-gray-600 mb-1">关键词:</p>
          <div className="flex flex-wrap gap-1">
            {task.keywords.map((keyword, index) => (
              <Badge key={index} variant="info" size="sm">
                {keyword}
              </Badge>
            ))}
          </div>
        </div>

        {/* Target Websites */}
        <div>
          <p className="text-sm text-gray-600 mb-1">目标网站:</p>
          <div className="flex flex-col space-y-1">
            {task.targetWebsites.slice(0, 2).map((website, index) => (
              <p key={index} className="text-sm text-gray-700 truncate">
                {website}
              </p>
            ))}
            {task.targetWebsites.length > 2 && (
              <p className="text-sm text-gray-500">
                +{task.targetWebsites.length - 2} 个网站
              </p>
            )}
          </div>
        </div>

        {/* Execution Info */}
        <div className="flex items-center justify-between text-sm text-gray-600 pt-2 border-t border-gray-100">
          <div>
            <span className="font-medium">上次执行:</span> {formatDate(task.lastExecutedAt)}
          </div>
          {task.status === 'active' && task.nextExecutionAt && (
            <div>
              <span className="font-medium">下次执行:</span> {task.nextExecutionAt}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2 pt-2">
          <Button size="sm" variant="outline" onClick={() => onViewDetail(task)}>
            查看详情
          </Button>
          <Button size="sm" variant="secondary" onClick={() => onEdit(task)}>
            编辑
          </Button>
          {task.status === 'active' ? (
            <Button size="sm" variant="warning" onClick={() => onPause(task.id)}>
              暂停
            </Button>
          ) : (
            <Button size="sm" variant="success" onClick={() => onResume(task.id)}>
              恢复
            </Button>
          )}
          <Button size="sm" variant="primary" onClick={() => onExecute(task.id)}>
            立即执行
          </Button>
          <Button size="sm" variant="error" onClick={() => onDelete(task.id)}>
            删除
          </Button>
        </div>
      </div>
    </Card>
  );
};
