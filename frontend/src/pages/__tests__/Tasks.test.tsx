import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Tasks } from '../Tasks';
import { useTaskStore } from '../../stores/taskStore';
import type { Task } from '../../types';

// Mock the API module to avoid import.meta issues
jest.mock('../../services/api', () => ({
  taskApi: {
    createTask: jest.fn(),
    getTasks: jest.fn(),
    getTask: jest.fn(),
    updateTask: jest.fn(),
    updateTaskStatus: jest.fn(),
    deleteTask: jest.fn(),
    executeTask: jest.fn(),
  },
  resultApi: {
    getTaskExecutions: jest.fn(),
    getExecution: jest.fn(),
    getSummary: jest.fn(),
    getComparison: jest.fn(),
    getCrossSiteAnalysis: jest.fn(),
    getOriginalContent: jest.fn(),
  },
}));

// Mock the task store
jest.mock('../../stores/taskStore');

// Mock the navigate function
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockUseTaskStore = useTaskStore as jest.MockedFunction<typeof useTaskStore>;

const mockTask: Task = {
  id: 'task-1',
  userId: 'user-1',
  name: '测试任务',
  keywords: ['金融监管', '合规政策'],
  targetWebsites: ['https://example.com', 'https://example2.com'],
  schedule: {
    type: 'daily',
    time: '09:00',
  },
  status: 'active',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  lastExecutedAt: '2024-01-15T09:00:00Z',
  nextExecutionAt: '2024-01-16T09:00:00Z',
};

describe('Tasks Page', () => {
  const mockFetchTasks = jest.fn();
  const mockCreateTask = jest.fn();
  const mockUpdateTask = jest.fn();
  const mockPauseTask = jest.fn();
  const mockResumeTask = jest.fn();
  const mockDeleteTask = jest.fn();
  const mockExecuteTask = jest.fn();
  const mockClearError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseTaskStore.mockReturnValue({
      tasks: [mockTask],
      currentTask: null,
      total: 1,
      page: 1,
      limit: 20,
      filters: {},
      loading: false,
      error: null,
      fetchTasks: mockFetchTasks,
      fetchTask: jest.fn(),
      createTask: mockCreateTask,
      updateTask: mockUpdateTask,
      pauseTask: mockPauseTask,
      resumeTask: mockResumeTask,
      deleteTask: mockDeleteTask,
      executeTask: mockExecuteTask,
      setFilters: jest.fn(),
      setCurrentTask: jest.fn(),
      clearError: mockClearError,
    });
  });

  const renderTasks = () => {
    return render(
      <BrowserRouter>
        <Tasks />
      </BrowserRouter>
    );
  };

  it('should render the tasks page with header', () => {
    renderTasks();
    
    expect(screen.getByText('监测任务')).toBeInTheDocument();
    expect(screen.getByText('创建和管理您的金融合规政策监测任务')).toBeInTheDocument();
    expect(screen.getByText('创建新任务')).toBeInTheDocument();
  });

  it('should fetch tasks on mount', () => {
    renderTasks();
    
    expect(mockFetchTasks).toHaveBeenCalledTimes(1);
  });

  it('should display task list', () => {
    renderTasks();
    
    expect(screen.getByText('测试任务')).toBeInTheDocument();
    expect(screen.getByText('金融监管')).toBeInTheDocument();
    expect(screen.getByText('合规政策')).toBeInTheDocument();
  });

  it('should open create modal when clicking create button', () => {
    renderTasks();
    
    const createButton = screen.getByText('创建新任务');
    fireEvent.click(createButton);
    
    expect(screen.getByText('创建监测任务')).toBeInTheDocument();
  });

  it('should filter tasks by status', async () => {
    renderTasks();
    
    // Use getAllByText and select the button (first element)
    const activeFilters = screen.getAllByText('活跃');
    const activeFilterButton = activeFilters[0]; // The button in the filter tabs
    fireEvent.click(activeFilterButton);
    
    await waitFor(() => {
      expect(mockFetchTasks).toHaveBeenCalledWith({ status: 'active' });
    });
  });

  it('should handle task pause', async () => {
    // Mock window.confirm
    global.confirm = jest.fn(() => true);
    
    mockPauseTask.mockResolvedValue(mockTask);
    
    renderTasks();
    
    const pauseButton = screen.getByText('暂停');
    fireEvent.click(pauseButton);
    
    await waitFor(() => {
      expect(mockPauseTask).toHaveBeenCalledWith('task-1');
    });
  });

  it('should handle task execution', async () => {
    // Mock window.confirm and alert
    global.confirm = jest.fn(() => true);
    global.alert = jest.fn();
    
    mockExecuteTask.mockResolvedValue('execution-1');
    
    renderTasks();
    
    const executeButton = screen.getByText('立即执行');
    fireEvent.click(executeButton);
    
    await waitFor(() => {
      expect(mockExecuteTask).toHaveBeenCalledWith('task-1');
      expect(global.alert).toHaveBeenCalledWith('任务已开始执行！');
    });
  });

  it('should handle task deletion', async () => {
    // Mock window.confirm and alert
    global.confirm = jest.fn(() => true);
    global.alert = jest.fn();
    
    mockDeleteTask.mockResolvedValue(undefined);
    
    renderTasks();
    
    const deleteButton = screen.getByText('删除');
    fireEvent.click(deleteButton);
    
    await waitFor(() => {
      expect(mockDeleteTask).toHaveBeenCalledWith('task-1');
      expect(global.alert).toHaveBeenCalledWith('任务已删除');
    });
  });

  it('should display error message when error exists', () => {
    mockUseTaskStore.mockReturnValue({
      tasks: [],
      currentTask: null,
      total: 0,
      page: 1,
      limit: 20,
      filters: {},
      loading: false,
      error: '获取任务列表失败',
      fetchTasks: mockFetchTasks,
      fetchTask: jest.fn(),
      createTask: mockCreateTask,
      updateTask: mockUpdateTask,
      pauseTask: mockPauseTask,
      resumeTask: mockResumeTask,
      deleteTask: mockDeleteTask,
      executeTask: mockExecuteTask,
      setFilters: jest.fn(),
      setCurrentTask: jest.fn(),
      clearError: mockClearError,
    });
    
    renderTasks();
    
    expect(screen.getByText('获取任务列表失败')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    mockUseTaskStore.mockReturnValue({
      tasks: [],
      currentTask: null,
      total: 0,
      page: 1,
      limit: 20,
      filters: {},
      loading: true,
      error: null,
      fetchTasks: mockFetchTasks,
      fetchTask: jest.fn(),
      createTask: mockCreateTask,
      updateTask: mockUpdateTask,
      pauseTask: mockPauseTask,
      resumeTask: mockResumeTask,
      deleteTask: mockDeleteTask,
      executeTask: mockExecuteTask,
      setFilters: jest.fn(),
      setCurrentTask: jest.fn(),
      clearError: mockClearError,
    });
    
    renderTasks();
    
    // Check for loading spinner
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('should show empty state when no tasks', () => {
    mockUseTaskStore.mockReturnValue({
      tasks: [],
      currentTask: null,
      total: 0,
      page: 1,
      limit: 20,
      filters: {},
      loading: false,
      error: null,
      fetchTasks: mockFetchTasks,
      fetchTask: jest.fn(),
      createTask: mockCreateTask,
      updateTask: mockUpdateTask,
      pauseTask: mockPauseTask,
      resumeTask: mockResumeTask,
      deleteTask: mockDeleteTask,
      executeTask: mockExecuteTask,
      setFilters: jest.fn(),
      setCurrentTask: jest.fn(),
      clearError: mockClearError,
    });
    
    renderTasks();
    
    expect(screen.getByText('暂无任务')).toBeInTheDocument();
    expect(screen.getByText('开始创建您的第一个监测任务')).toBeInTheDocument();
  });
});
