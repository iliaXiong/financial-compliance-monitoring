import React, { useEffect, useState } from 'react';
import { Card, Badge, Button, Loading } from '../common';
import type { Task, Execution } from '../../types';
import { resultApi } from '../../services/api';

export interface TaskDetailProps {
  task: Task;
  onClose: () => void;
  onEdit: (task: Task) => void;
  onViewExecution: (executionId: string) => void;
}

export const TaskDetail: React.FC<TaskDetailProps> = ({
  task,
  onClose,
  onEdit,
  onViewExecution,
}) => {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchExecutions();
  }, [task.id]);

  const fetchExecutions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await resultApi.getTaskExecutions(task.id, 1, 10);
      setExecutions(data.executions);
    } catch (err: any) {
      setError(err.message || '获取执行历史失败');
    } finally {
      setLoading(false);
    }
  };

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

  const getExecutionStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success">已完成</Badge>;
      case 'running':
        return <Badge variant="info">执行中</Badge>;
      case 'failed':
        return <Badge variant="error">失败</Badge>;
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
      second: '2-digit',
    });
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    if (!endTime) return '-';
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    const duration = Math.floor((end - start) / 1000);
    if (duration < 60) return `${duration}秒`;
    if (duration < 3600) return `${Math.floor(duration / 60)}分${duration % 60}秒`;
    return `${Math.floor(duration / 3600)}小时${Math.floor((duration % 3600) / 60)}分`;
  };

  return (
    <div className="space-y-6">
      {/* Task Info */}
      <Card>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{task.name}</h2>
            <div className="flex items-center space-x-2">
              {getStatusBadge(task.status)}
              <span className="text-sm text-gray-500">{getScheduleText(task.schedule)}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button size="sm" variant="secondary" onClick={() => onEdit(task)}>
              编辑
            </Button>
            <Button size="sm" variant="outline" onClick={onClose}>
              关闭
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {/* Keywords */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">关键词</h3>
            <div className="flex flex-wrap gap-2">
              {task.keywords.map((keyword, index) => (
                <Badge key={index} variant="info">
                  {keyword}
                </Badge>
              ))}
            </div>
          </div>

          {/* Target Websites */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">目标网站</h3>
            <div className="space-y-1">
              {task.targetWebsites.map((website, index) => (
                <div key={index} className="text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded">
                  {website}
                </div>
              ))}
            </div>
          </div>

          {/* Execution Times */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
            <div>
              <p className="text-sm text-gray-600">上次执行时间</p>
              <p className="text-sm font-medium text-gray-900">{formatDate(task.lastExecutedAt)}</p>
            </div>
            {task.status === 'active' && task.nextExecutionAt && (
              <div>
                <p className="text-sm text-gray-600">下次执行时间</p>
                <p className="text-sm font-medium text-gray-900">
                  {task.nextExecutionAt}
                </p>
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
            <div>
              <p className="text-sm text-gray-600">创建时间</p>
              <p className="text-sm font-medium text-gray-900">{formatDate(task.createdAt)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">更新时间</p>
              <p className="text-sm font-medium text-gray-900">{formatDate(task.updatedAt)}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Execution History */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">执行历史</h3>

        {loading ? (
          <Loading />
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-error">{error}</p>
            <Button size="sm" variant="outline" onClick={fetchExecutions} className="mt-4">
              重试
            </Button>
          </div>
        ) : executions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">暂无执行记录</div>
        ) : (
          <div className="space-y-3">
            {executions.map((execution) => (
              <div
                key={execution.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    {getExecutionStatusBadge(execution.status)}
                    <span className="text-sm text-gray-600">
                      {formatDate(execution.startTime)}
                    </span>
                    {execution.status === 'completed' && (
                      <span className="text-sm text-gray-500">
                        耗时: {formatDuration(execution.startTime, execution.endTime)}
                      </span>
                    )}
                  </div>
                  {execution.errorMessage && (
                    <p className="text-sm text-error">{execution.errorMessage}</p>
                  )}
                </div>
                {execution.status === 'completed' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onViewExecution(execution.id)}
                  >
                    查看结果
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
