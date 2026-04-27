import React, { useState } from 'react';
import { TaskCard } from './TaskCard';
import { Badge } from '../common';
import type { Task, TaskStatus } from '../../types';

export interface TaskListProps {
  tasks: Task[];
  loading?: boolean;
  onEdit: (task: Task) => void;
  onPause: (taskId: string) => void;
  onResume: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onExecute: (taskId: string) => void;
  onViewDetail: (task: Task) => void;
  onFilterChange: (status: TaskStatus | 'all') => void;
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  loading = false,
  onEdit,
  onPause,
  onResume,
  onDelete,
  onExecute,
  onViewDetail,
  onFilterChange,
}) => {
  const [activeFilter, setActiveFilter] = useState<TaskStatus | 'all'>('all');

  const handleFilterChange = (filter: TaskStatus | 'all') => {
    setActiveFilter(filter);
    onFilterChange(filter);
  };

  const getFilterCount = (status: TaskStatus | 'all') => {
    if (status === 'all') return tasks.length;
    return tasks.filter((task) => task.status === status).length;
  };

  const filters: Array<{ label: string; value: TaskStatus | 'all' }> = [
    { label: '全部', value: 'all' },
    { label: '活跃', value: 'active' },
    { label: '已暂停', value: 'paused' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-gray-200">
        {filters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => handleFilterChange(filter.value)}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              activeFilter === filter.value
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {filter.label}
            <Badge
              variant={activeFilter === filter.value ? 'info' : 'default'}
              size="sm"
              className="ml-2"
            >
              {getFilterCount(filter.value)}
            </Badge>
          </button>
        ))}
      </div>

      {/* Task Cards */}
      {tasks.length === 0 ? (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">暂无任务</h3>
          <p className="mt-1 text-sm text-gray-500">开始创建您的第一个监测任务</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={onEdit}
              onPause={onPause}
              onResume={onResume}
              onDelete={onDelete}
              onExecute={onExecute}
              onViewDetail={onViewDetail}
            />
          ))}
        </div>
      )}
    </div>
  );
};
