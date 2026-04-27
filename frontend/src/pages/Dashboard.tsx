import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Badge, Loading } from '../components/common';
import { TrendChart } from '../components/charts';
import type { TrendDataPoint } from '../components/charts';
import { useTaskStore } from '../stores/taskStore';
import { useResultStore } from '../stores/resultStore';
import type { Task, Execution } from '../types';
import { format } from 'date-fns';

interface DashboardStats {
  totalTasks: number;
  activeTasks: number;
  todayExecutions: number;
  pendingWarnings: number;
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { tasks, loading: tasksLoading, fetchTasks } = useTaskStore();
  const { executions, loading: executionsLoading, fetchExecutions } = useResultStore();

  const [stats, setStats] = useState<DashboardStats>({
    totalTasks: 0,
    activeTasks: 0,
    todayExecutions: 0,
    pendingWarnings: 0,
  });
  const [recentExecutions, setRecentExecutions] = useState<Execution[]>([]);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Fetch all tasks
      await fetchTasks({});
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  };

  useEffect(() => {
    if (tasks.length > 0) {
      // Calculate statistics
      const totalTasks = tasks.filter(t => t.status !== 'deleted').length;
      const activeTasks = tasks.filter(t => t.status === 'active').length;

      // Get today's date
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Count today's executions (from lastExecutedAt)
      const todayExecutions = tasks.filter(t => {
        if (!t.lastExecutedAt) return false;
        const execDate = new Date(t.lastExecutedAt);
        execDate.setHours(0, 0, 0, 0);
        return execDate.getTime() === today.getTime();
      }).length;

      setStats({
        totalTasks,
        activeTasks,
        todayExecutions,
        pendingWarnings: 0, // TODO: Implement warning logic
      });

      // Load recent executions from first few tasks
      loadRecentExecutions(tasks.slice(0, 5));

      // Generate trend data (mock data for now)
      generateTrendData();
    }
  }, [tasks]);

  const loadRecentExecutions = async (tasksToLoad: Task[]) => {
    for (const task of tasksToLoad) {
      try {
        await fetchExecutions(task.id, 1, 5);
        // Note: This is a simplified approach. In production, you'd want a dedicated endpoint
      } catch (err) {
        console.error(`Failed to load executions for task ${task.id}:`, err);
      }
    }

    // Sort by start time and take the most recent
    const sortedExecutions = executions
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
      .slice(0, 10);

    setRecentExecutions(sortedExecutions);
  };

  const generateTrendData = () => {
    // Generate last 7 days of trend data
    const data: TrendDataPoint[] = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      // Count executions for this date
      const dateStr = format(date, 'yyyy-MM-dd');
      const executionsOnDate = tasks.filter(t => {
        if (!t.lastExecutedAt) return false;
        const execDate = format(new Date(t.lastExecutedAt), 'yyyy-MM-dd');
        return execDate === dateStr;
      }).length;

      // Mock success rate (in production, calculate from actual execution results)
      const successRate = executionsOnDate > 0 ? 85 + Math.random() * 10 : 0;

      data.push({
        date: format(date, 'MM/dd'),
        executions: executionsOnDate,
        successRate: Math.round(successRate),
      });
    }

    setTrendData(data);
  };

  const getStatusBadge = (status: string) => {
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

  const handleViewExecution = (executionId: string) => {
    navigate(`/results/${executionId}`);
  };

  const loading = tasksLoading || executionsLoading;

  if (loading && tasks.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">仪表板</h1>
          <p className="mt-1 text-sm text-gray-600">
            监测任务概览和执行趋势
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">总任务数</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{stats.totalTasks}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">活跃任务</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{stats.activeTasks}</p>
              </div>
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">今日执行</p>
                <p className="text-3xl font-bold text-purple-600 mt-2">{stats.todayExecutions}</p>
              </div>
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">待处理警告</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">{stats.pendingWarnings}</p>
              </div>
              <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
          </Card>
        </div>

        {/* Trend Chart */}
        <Card className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">执行趋势</h2>
          <p className="text-sm text-gray-600 mb-4">最近7天的任务执行次数和成功率</p>
          {trendData.length > 0 ? (
            <TrendChart data={trendData} />
          ) : (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500">暂无趋势数据</p>
            </div>
          )}
        </Card>

        {/* Recent Executions */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">最近执行</h2>
            <button
              onClick={() => navigate('/results')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              查看全部 →
            </button>
          </div>

          {recentExecutions.length > 0 ? (
            <div className="space-y-3">
              {recentExecutions.map((execution) => {
                const task = tasks.find(t => t.id === execution.taskId);
                return (
                  <div
                    key={execution.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => handleViewExecution(execution.id)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium text-gray-900">
                          {task?.name || '未知任务'}
                        </h3>
                        {getStatusBadge(execution.status)}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        开始时间: {format(new Date(execution.startTime), 'yyyy-MM-dd HH:mm:ss')}
                      </p>
                      {execution.endTime && (
                        <p className="text-sm text-gray-600">
                          结束时间: {format(new Date(execution.endTime), 'yyyy-MM-dd HH:mm:ss')}
                        </p>
                      )}
                      {execution.errorMessage && (
                        <p className="text-sm text-red-600 mt-1">
                          错误: {execution.errorMessage}
                        </p>
                      )}
                    </div>
                    <svg
                      className="w-5 h-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32">
              <p className="text-gray-500">暂无执行记录</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
