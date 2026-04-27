import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TaskList, TaskForm, TaskDetail } from '../components/task';
import { Button, Modal } from '../components/common';
import { useTaskStore } from '../stores/taskStore';
import type { Task, CreateTaskDTO, TaskStatus } from '../types';

export const Tasks: React.FC = () => {
  const navigate = useNavigate();
  const {
    tasks,
    loading,
    error,
    fetchTasks,
    createTask,
    updateTask,
    pauseTask,
    resumeTask,
    deleteTask,
    executeTask,
    clearError,
  } = useTaskStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      await fetchTasks();
    } catch (err) {
      console.error('Failed to load tasks:', err);
    }
  };

  const handleFilterChange = async (status: TaskStatus | 'all') => {
    try {
      if (status === 'all') {
        await fetchTasks({});
      } else {
        await fetchTasks({ status });
      }
    } catch (err) {
      console.error('Failed to filter tasks:', err);
    }
  };

  const handleCreateTask = async (data: CreateTaskDTO) => {
    setActionLoading(true);
    try {
      await createTask(data);
      setShowCreateModal(false);
      // Show success message (you can add a toast notification here)
      alert('任务创建成功！');
    } catch (err: any) {
      alert(err.message || '创建任务失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditTask = async (data: CreateTaskDTO) => {
    if (!selectedTask) return;

    setActionLoading(true);
    try {
      await updateTask(selectedTask.id, data);
      setShowEditModal(false);
      setSelectedTask(null);
      alert('任务更新成功！');
    } catch (err: any) {
      alert(err.message || '更新任务失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePauseTask = async (taskId: string) => {
    if (!confirm('确定要暂停这个任务吗？')) return;

    setActionLoading(true);
    try {
      await pauseTask(taskId);
      alert('任务已暂停');
    } catch (err: any) {
      alert(err.message || '暂停任务失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResumeTask = async (taskId: string) => {
    setActionLoading(true);
    try {
      await resumeTask(taskId);
      alert('任务已恢复');
    } catch (err: any) {
      alert(err.message || '恢复任务失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('确定要删除这个任务吗？删除后任务将无法恢复，但历史执行记录会保留。')) return;

    setActionLoading(true);
    try {
      await deleteTask(taskId);
      alert('任务已删除');
    } catch (err: any) {
      alert(err.message || '删除任务失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExecuteTask = async (taskId: string) => {
    if (!confirm('确定要立即执行这个任务吗？')) return;

    setActionLoading(true);
    try {
      await executeTask(taskId);
      alert('任务已开始执行！');
      // Optionally navigate to results page
      // navigate(`/results/${executionId}`);
    } catch (err: any) {
      alert(err.message || '执行任务失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewDetail = (task: Task) => {
    setSelectedTask(task);
    setShowDetailModal(true);
  };

  const handleEditFromList = (task: Task) => {
    setSelectedTask(task);
    setShowEditModal(true);
  };

  const handleEditFromDetail = (task: Task) => {
    setSelectedTask(task);
    setShowDetailModal(false);
    setShowEditModal(true);
  };

  const handleViewExecution = (executionId: string) => {
    navigate(`/results/${executionId}`);
  };

  const handleCloseDetail = () => {
    setShowDetailModal(false);
    setSelectedTask(null);
  };

  const handleCancelCreate = () => {
    setShowCreateModal(false);
  };

  const handleCancelEdit = () => {
    setShowEditModal(false);
    setSelectedTask(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">监测任务</h1>
            <p className="mt-1 text-sm text-gray-600">
              创建和管理您的金融合规政策监测任务
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => setShowCreateModal(true)}
            disabled={actionLoading}
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            创建新任务
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
            <p className="text-error">{error}</p>
            <button
              onClick={clearError}
              className="text-red-600 hover:text-red-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Task List */}
        <TaskList
          tasks={tasks}
          loading={loading}
          onEdit={handleEditFromList}
          onPause={handlePauseTask}
          onResume={handleResumeTask}
          onDelete={handleDeleteTask}
          onExecute={handleExecuteTask}
          onViewDetail={handleViewDetail}
          onFilterChange={handleFilterChange}
        />

        {/* Create Task Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={handleCancelCreate}
          title="创建监测任务"
          size="lg"
        >
          <TaskForm
            onSubmit={handleCreateTask}
            onCancel={handleCancelCreate}
            loading={actionLoading}
          />
        </Modal>

        {/* Edit Task Modal */}
        <Modal
          isOpen={showEditModal}
          onClose={handleCancelEdit}
          title="编辑监测任务"
          size="lg"
        >
          {selectedTask && (
            <TaskForm
              task={selectedTask}
              onSubmit={handleEditTask}
              onCancel={handleCancelEdit}
              loading={actionLoading}
            />
          )}
        </Modal>

        {/* Task Detail Modal */}
        <Modal
          isOpen={showDetailModal}
          onClose={handleCloseDetail}
          title="任务详情"
          size="xl"
        >
          {selectedTask && (
            <TaskDetail
              task={selectedTask}
              onClose={handleCloseDetail}
              onEdit={handleEditFromDetail}
              onViewExecution={handleViewExecution}
            />
          )}
        </Modal>
      </div>
    </div>
  );
};
