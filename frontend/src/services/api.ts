import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import type {
  Task,
  CreateTaskDTO,
  UpdateTaskDTO,
  TaskFilters,
  PaginatedTasks,
  PaginatedExecutions,
  Execution,
  SummaryDocument,
  ComparisonReport,
  CrossSiteAnalysis,
  RetrievalResult,
  OriginalContent,
} from '../types';

// API base URL from environment variable
// Empty string means use relative path (through nginx proxy)
const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '';

// Error response type
interface ApiError {
  error: string;
  message: string;
  details?: Array<{ field: string; message: string }>;
}

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add authentication token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('auth_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor - unified error handling
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError<ApiError>) => {
    // Handle different error scenarios
    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 401:
          // Unauthorized - clear token and redirect to login
          // TODO: Implement proper authentication
          // For now, just log the error without redirecting
          console.warn('未授权访问 - 需要实现认证系统');
          localStorage.removeItem('auth_token');
          // window.location.href = '/login';  // Disabled for demo
          break;

        case 403:
          // Forbidden
          console.error('访问被拒绝:', data.message);
          break;

        case 404:
          // Not found
          console.error('资源未找到:', data.message);
          break;

        case 400:
          // Validation error
          console.error('请求验证失败:', data.message, data.details);
          break;

        case 500:
          // Server error
          console.error('服务器错误:', data.message);
          break;

        default:
          console.error('API错误:', data.message);
      }

      // Return structured error
      return Promise.reject({
        status,
        code: data.error,
        message: data.message,
        details: data.details,
      });
    } else if (error.request) {
      // Network error
      console.error('网络错误: 无法连接到服务器');
      return Promise.reject({
        status: 0,
        code: 'NETWORK_ERROR',
        message: '无法连接到服务器，请检查网络连接',
      });
    } else {
      // Other errors
      console.error('请求错误:', error.message);
      return Promise.reject({
        status: 0,
        code: 'REQUEST_ERROR',
        message: error.message,
      });
    }
  }
);

// Task Management API
export const taskApi = {
  // Create a new task
  createTask: async (taskData: CreateTaskDTO): Promise<{ taskId: string; status: string; task: Task }> => {
    const response = await apiClient.post('/api/tasks', taskData);
    return response.data;
  },

  // Get list of tasks with filters
  getTasks: async (filters?: TaskFilters): Promise<PaginatedTasks> => {
    const response = await apiClient.get('/api/tasks', { params: filters });
    return response.data;
  },

  // Get task by ID
  getTask: async (taskId: string): Promise<Task> => {
    const response = await apiClient.get(`/api/tasks/${taskId}`);
    return response.data;
  },

  // Update task
  updateTask: async (taskId: string, updates: UpdateTaskDTO): Promise<Task> => {
    const response = await apiClient.put(`/api/tasks/${taskId}`, updates);
    return response.data;
  },

  // Pause or resume task
  updateTaskStatus: async (taskId: string, status: 'active' | 'paused'): Promise<Task> => {
    const response = await apiClient.patch(`/api/tasks/${taskId}/status`, { status });
    return response.data;
  },

  // Delete task
  deleteTask: async (taskId: string): Promise<{ success: boolean }> => {
    const response = await apiClient.delete(`/api/tasks/${taskId}`);
    return response.data;
  },

  // Manually trigger task execution
  executeTask: async (taskId: string): Promise<{ executionId: string }> => {
    const response = await apiClient.post(`/api/tasks/${taskId}/execute`);
    return response.data;
  },
};

// Result Query API
export const resultApi = {
  // Get the most recent execution across all user's tasks
  getLatestExecution: async (): Promise<{
    execution: Execution;
    results: RetrievalResult[];
    summary?: SummaryDocument;
    comparison?: ComparisonReport[];
    crossSiteAnalysis?: CrossSiteAnalysis[];
  }> => {
    const response = await apiClient.get('/api/executions/latest');
    return response.data;
  },

  // Get execution history for a task
  getTaskExecutions: async (
    taskId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedExecutions> => {
    const response = await apiClient.get(`/api/tasks/${taskId}/executions`, {
      params: { page, limit },
    });
    return response.data;
  },

  // Get execution details
  getExecution: async (executionId: string): Promise<{
    execution: Execution;
    results: RetrievalResult[];
    summary?: SummaryDocument;
    comparison?: ComparisonReport[];
    crossSiteAnalysis?: CrossSiteAnalysis[];
  }> => {
    const response = await apiClient.get(`/api/executions/${executionId}`);
    return response.data;
  },

  // Get summary document
  getSummary: async (executionId: string): Promise<SummaryDocument> => {
    const response = await apiClient.get(`/api/executions/${executionId}/summary`);
    return response.data;
  },

  // Get comparison report
  getComparison: async (executionId: string): Promise<ComparisonReport[]> => {
    const response = await apiClient.get(`/api/executions/${executionId}/comparison`);
    return response.data;
  },

  // Get cross-site analysis
  getCrossSiteAnalysis: async (executionId: string): Promise<CrossSiteAnalysis[]> => {
    const response = await apiClient.get(`/api/executions/${executionId}/cross-site`);
    return response.data;
  },

  // Get original content for a website
  getOriginalContent: async (
    executionId: string,
    websiteIndex: number
  ): Promise<{
    websiteUrl: string;
    websiteIndex: number;
    contents: Array<{
      keyword: string;
      found: boolean;
      originalContent?: OriginalContent;
    }>;
  }> => {
    const response = await apiClient.get(`/api/executions/${executionId}/original/${websiteIndex}`);
    return response.data;
  },
};

// Export the axios instance for custom requests
export default apiClient;
