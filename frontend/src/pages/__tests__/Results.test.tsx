import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Results } from '../Results';
import { useResultStore } from '../../stores/resultStore';
import { useTaskStore } from '../../stores/taskStore';

// Mock react-markdown
jest.mock('react-markdown', () => {
  return function ReactMarkdown({ children }: { children: string }) {
    return <div>{children}</div>;
  };
});

// Mock the API service
jest.mock('../../services/api', () => ({
  resultApi: {
    getTaskExecutions: jest.fn(),
    getExecution: jest.fn(),
    getSummary: jest.fn(),
    getComparison: jest.fn(),
    getCrossSiteAnalysis: jest.fn(),
    getOriginalContent: jest.fn(),
  },
  taskApi: {
    getTasks: jest.fn(),
  },
}));

// Mock the stores
jest.mock('../../stores/resultStore');
jest.mock('../../stores/taskStore');

// Mock the navigate function
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => ({}),
}));

describe('Results Page', () => {
  const mockResultStore = {
    executions: [],
    currentExecution: null,
    retrievalResults: [],
    summary: null,
    comparison: [],
    crossSiteAnalysis: [],
    originalContents: new Map(),
    total: 0,
    page: 1,
    limit: 20,
    loading: false,
    error: null,
    fetchExecutions: jest.fn(),
    fetchExecutionDetails: jest.fn(),
    fetchSummary: jest.fn(),
    fetchComparison: jest.fn(),
    fetchCrossSiteAnalysis: jest.fn(),
    fetchOriginalContent: jest.fn(),
    setCurrentExecution: jest.fn(),
    clearResults: jest.fn(),
    clearError: jest.fn(),
  };

  const mockTaskStore = {
    tasks: [],
    currentTask: null,
    loading: false,
    error: null,
    fetchTasks: jest.fn(),
    fetchTask: jest.fn(),
    createTask: jest.fn(),
    updateTask: jest.fn(),
    pauseTask: jest.fn(),
    resumeTask: jest.fn(),
    deleteTask: jest.fn(),
    executeTask: jest.fn(),
    clearError: jest.fn(),
  };

  beforeEach(() => {
    (useResultStore as unknown as jest.Mock).mockReturnValue(mockResultStore);
    (useTaskStore as unknown as jest.Mock).mockReturnValue(mockTaskStore);
    jest.clearAllMocks();
  });

  const renderResults = () => {
    return render(
      <BrowserRouter>
        <Results />
      </BrowserRouter>
    );
  };

  it('should render the results page with header', () => {
    renderResults();
    expect(screen.getByText('执行结果')).toBeInTheDocument();
    expect(screen.getByText('查看监测任务的执行结果和分析报告')).toBeInTheDocument();
  });

  it('should fetch tasks on mount', () => {
    renderResults();
    expect(mockTaskStore.fetchTasks).toHaveBeenCalled();
  });

  it('should show empty state when no execution is selected', () => {
    renderResults();
    expect(screen.getByText('请选择任务和执行记录查看结果')).toBeInTheDocument();
  });

  it('should display task selector', () => {
    renderResults();
    expect(screen.getByText('选择任务')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('should display tabs when execution is selected', () => {
    const mockExecution = {
      id: 'exec-1',
      taskId: 'task-1',
      status: 'completed' as const,
      startTime: '2024-01-15T10:00:00Z',
      endTime: '2024-01-15T10:05:00Z',
      createdAt: '2024-01-15T10:00:00Z',
    };

    (useResultStore as unknown as jest.Mock).mockReturnValue({
      ...mockResultStore,
      currentExecution: mockExecution,
      retrievalResults: [],
    });

    renderResults();

    expect(screen.getByText('仪表板')).toBeInTheDocument();
    expect(screen.getByText('总结文档')).toBeInTheDocument();
    expect(screen.getByText('对比报告')).toBeInTheDocument();
    expect(screen.getByText('跨网站对比')).toBeInTheDocument();
    expect(screen.getByText('原始内容')).toBeInTheDocument();
  });

  it('should display error message when error exists', () => {
    (useResultStore as unknown as jest.Mock).mockReturnValue({
      ...mockResultStore,
      error: '获取执行历史失败',
    });

    renderResults();
    expect(screen.getByText('获取执行历史失败')).toBeInTheDocument();
  });
});
