import { create } from 'zustand';
import type { Task, CreateTaskDTO, UpdateTaskDTO, TaskFilters, PaginatedTasks } from '../types';
import { taskApi } from '../services/api';

interface TaskState {
  // State
  tasks: Task[];
  currentTask: Task | null;
  total: number;
  page: number;
  limit: number;
  filters: TaskFilters;
  loading: boolean;
  error: string | null;

  // Actions
  fetchTasks: (filters?: TaskFilters) => Promise<void>;
  fetchTask: (taskId: string) => Promise<void>;
  createTask: (taskData: CreateTaskDTO) => Promise<Task>;
  updateTask: (taskId: string, updates: UpdateTaskDTO) => Promise<Task>;
  pauseTask: (taskId: string) => Promise<Task>;
  resumeTask: (taskId: string) => Promise<Task>;
  deleteTask: (taskId: string) => Promise<void>;
  executeTask: (taskId: string) => Promise<string>;
  setFilters: (filters: TaskFilters) => void;
  setCurrentTask: (task: Task | null) => void;
  clearError: () => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  // Initial state
  tasks: [],
  currentTask: null,
  total: 0,
  page: 1,
  limit: 20,
  filters: {},
  loading: false,
  error: null,

  // Fetch tasks with filters
  fetchTasks: async (filters?: TaskFilters) => {
    set({ loading: true, error: null });
    try {
      const mergedFilters = { ...get().filters, ...filters };
      const data: PaginatedTasks = await taskApi.getTasks(mergedFilters);
      set({
        tasks: data.tasks,
        total: data.total,
        page: data.page,
        limit: data.limit,
        filters: mergedFilters,
        loading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || '获取任务列表失败',
        loading: false,
      });
      throw error;
    }
  },

  // Fetch single task
  fetchTask: async (taskId: string) => {
    set({ loading: true, error: null });
    try {
      const task = await taskApi.getTask(taskId);
      set({
        currentTask: task,
        loading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || '获取任务详情失败',
        loading: false,
      });
      throw error;
    }
  },

  // Create new task
  createTask: async (taskData: CreateTaskDTO) => {
    set({ loading: true, error: null });
    try {
      const response = await taskApi.createTask(taskData);
      const newTask = response.task;

      // Add to tasks list
      set((state) => ({
        tasks: [newTask, ...state.tasks],
        total: state.total + 1,
        currentTask: newTask,
        loading: false,
      }));

      return newTask;
    } catch (error: any) {
      set({
        error: error.message || '创建任务失败',
        loading: false,
      });
      throw error;
    }
  },

  // Update task
  updateTask: async (taskId: string, updates: UpdateTaskDTO) => {
    set({ loading: true, error: null });
    try {
      const updatedTask = await taskApi.updateTask(taskId, updates);

      // Update in tasks list
      set((state) => ({
        tasks: state.tasks.map((task) => (task.id === taskId ? updatedTask : task)),
        currentTask: state.currentTask?.id === taskId ? updatedTask : state.currentTask,
        loading: false,
      }));

      return updatedTask;
    } catch (error: any) {
      set({
        error: error.message || '更新任务失败',
        loading: false,
      });
      throw error;
    }
  },

  // Pause task
  pauseTask: async (taskId: string) => {
    set({ loading: true, error: null });
    try {
      const updatedTask = await taskApi.updateTaskStatus(taskId, 'paused');

      // Update in tasks list
      set((state) => ({
        tasks: state.tasks.map((task) => (task.id === taskId ? updatedTask : task)),
        currentTask: state.currentTask?.id === taskId ? updatedTask : state.currentTask,
        loading: false,
      }));

      return updatedTask;
    } catch (error: any) {
      set({
        error: error.message || '暂停任务失败',
        loading: false,
      });
      throw error;
    }
  },

  // Resume task
  resumeTask: async (taskId: string) => {
    set({ loading: true, error: null });
    try {
      const updatedTask = await taskApi.updateTaskStatus(taskId, 'active');

      // Update in tasks list
      set((state) => ({
        tasks: state.tasks.map((task) => (task.id === taskId ? updatedTask : task)),
        currentTask: state.currentTask?.id === taskId ? updatedTask : state.currentTask,
        loading: false,
      }));

      return updatedTask;
    } catch (error: any) {
      set({
        error: error.message || '恢复任务失败',
        loading: false,
      });
      throw error;
    }
  },

  // Delete task
  deleteTask: async (taskId: string) => {
    set({ loading: true, error: null });
    try {
      await taskApi.deleteTask(taskId);

      // Remove from tasks list
      set((state) => ({
        tasks: state.tasks.filter((task) => task.id !== taskId),
        total: state.total - 1,
        currentTask: state.currentTask?.id === taskId ? null : state.currentTask,
        loading: false,
      }));
    } catch (error: any) {
      set({
        error: error.message || '删除任务失败',
        loading: false,
      });
      throw error;
    }
  },

  // Execute task manually
  executeTask: async (taskId: string) => {
    set({ loading: true, error: null });
    try {
      const response = await taskApi.executeTask(taskId);
      set({ loading: false });
      return response.executionId;
    } catch (error: any) {
      set({
        error: error.message || '执行任务失败',
        loading: false,
      });
      throw error;
    }
  },

  // Set filters
  setFilters: (filters: TaskFilters) => {
    set({ filters });
  },

  // Set current task
  setCurrentTask: (task: Task | null) => {
    set({ currentTask: task });
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },
}));
