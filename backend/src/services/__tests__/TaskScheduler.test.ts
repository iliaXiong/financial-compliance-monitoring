import { TaskScheduler } from '../TaskScheduler';
import { TaskRepository } from '../../repositories/TaskRepository';
import { ExecutionRepository } from '../../repositories/ExecutionRepository';
import { RetrievalResultRepository } from '../../repositories/RetrievalResultRepository';
import { SubagentOrchestrator } from '../SubagentOrchestrator';
import { AnalysisService } from '../AnalysisService';
import { Task, Execution, RetrievalResult } from '../../types';
import Bull from 'bull';

// Mock Bull
jest.mock('bull');

// Mock repositories and services
jest.mock('../../repositories/TaskRepository');
jest.mock('../../repositories/ExecutionRepository');
jest.mock('../../repositories/RetrievalResultRepository');
jest.mock('../../repositories/SummaryDocumentRepository');
jest.mock('../../repositories/ComparisonReportRepository');
jest.mock('../../repositories/CrossSiteAnalysisRepository');
jest.mock('../SubagentOrchestrator');
jest.mock('../AnalysisService');

describe('TaskScheduler', () => {
  let taskScheduler: TaskScheduler;
  let mockTaskRepository: jest.Mocked<TaskRepository>;
  let mockExecutionRepository: jest.Mocked<ExecutionRepository>;
  let mockRetrievalResultRepository: jest.Mocked<RetrievalResultRepository>;
  let mockSubagentOrchestrator: jest.Mocked<SubagentOrchestrator>;
  let mockAnalysisService: jest.Mocked<AnalysisService>;
  let mockQueue: any;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock queue
    mockQueue = {
      add: jest.fn().mockResolvedValue({}),
      process: jest.fn(),
      getJobs: jest.fn().mockResolvedValue([]),
      on: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    };

    // Mock Bull constructor
    (Bull as unknown as jest.Mock).mockReturnValue(mockQueue);

    // Create mock instances
    mockTaskRepository = new TaskRepository() as jest.Mocked<TaskRepository>;
    mockExecutionRepository = new ExecutionRepository() as jest.Mocked<ExecutionRepository>;
    mockRetrievalResultRepository = new RetrievalResultRepository() as jest.Mocked<RetrievalResultRepository>;
    mockSubagentOrchestrator = new SubagentOrchestrator() as jest.Mocked<SubagentOrchestrator>;
    mockAnalysisService = new AnalysisService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any
    ) as jest.Mocked<AnalysisService>;

    // Initialize TaskScheduler with mocks
    taskScheduler = new TaskScheduler(
      { host: 'localhost', port: 6379 },
      mockTaskRepository,
      mockExecutionRepository,
      mockRetrievalResultRepository,
      mockSubagentOrchestrator,
      mockAnalysisService
    );
  });

  describe('scheduleTask', () => {
    it('should schedule a daily task with correct delay', async () => {
      const task: Task = {
        id: 'task-1',
        userId: 'user-1',
        name: 'Test Task',
        keywords: ['keyword1'],
        targetWebsites: ['https://example.com'],
        schedule: {
          type: 'daily',
          time: '14:00',
        },
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTaskRepository.updateExecutionTimestamps.mockResolvedValue(task);

      await taskScheduler.scheduleTask(task);

      expect(mockTaskRepository.updateExecutionTimestamps).toHaveBeenCalledWith(
        task.id,
        expect.any(Date),
        expect.any(Date)
      );

      expect(mockQueue.add).toHaveBeenCalledWith(
        { taskId: task.id, executionId: '' },
        expect.objectContaining({
          delay: expect.any(Number),
          jobId: expect.stringContaining('task-task-1'),
        })
      );
    });

    it('should schedule a "once" task for immediate execution', async () => {
      const task: Task = {
        id: 'task-2',
        userId: 'user-1',
        name: 'Test Task',
        keywords: ['keyword1'],
        targetWebsites: ['https://example.com'],
        schedule: {
          type: 'once',
        },
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTaskRepository.updateExecutionTimestamps.mockResolvedValue(task);

      await taskScheduler.scheduleTask(task);

      // Should add to queue with minimal delay (approximately 0)
      expect(mockTaskRepository.updateExecutionTimestamps).toHaveBeenCalled();
      expect(mockQueue.add).toHaveBeenCalledWith(
        { taskId: task.id, executionId: '' },
        expect.objectContaining({
          delay: expect.any(Number),
          jobId: expect.stringContaining('task-task-2'),
        })
      );
    });

    it('should not schedule a "once" task that has already been executed', async () => {
      const task: Task = {
        id: 'task-3',
        userId: 'user-1',
        name: 'Test Task',
        keywords: ['keyword1'],
        targetWebsites: ['https://example.com'],
        schedule: {
          type: 'once',
        },
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastExecutedAt: new Date('2024-01-01'),
      };

      mockTaskRepository.updateExecutionTimestamps.mockResolvedValue(task);

      await taskScheduler.scheduleTask(task);

      // Should not add to queue since it's already executed
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('should schedule a weekly task correctly', async () => {
      const task: Task = {
        id: 'task-4',
        userId: 'user-1',
        name: 'Test Task',
        keywords: ['keyword1'],
        targetWebsites: ['https://example.com'],
        schedule: {
          type: 'weekly',
          time: '10:00',
          dayOfWeek: 1, // Monday
        },
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTaskRepository.updateExecutionTimestamps.mockResolvedValue(task);

      await taskScheduler.scheduleTask(task);

      expect(mockTaskRepository.updateExecutionTimestamps).toHaveBeenCalled();
      expect(mockQueue.add).toHaveBeenCalled();
    });

    it('should schedule a monthly task correctly', async () => {
      const task: Task = {
        id: 'task-5',
        userId: 'user-1',
        name: 'Test Task',
        keywords: ['keyword1'],
        targetWebsites: ['https://example.com'],
        schedule: {
          type: 'monthly',
          time: '09:00',
          dayOfMonth: 15,
        },
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTaskRepository.updateExecutionTimestamps.mockResolvedValue(task);

      await taskScheduler.scheduleTask(task);

      expect(mockTaskRepository.updateExecutionTimestamps).toHaveBeenCalled();
      expect(mockQueue.add).toHaveBeenCalled();
    });
  });

  describe('unscheduleTask', () => {
    it('should remove all pending jobs for a task', async () => {
      const taskId = 'task-1';
      const mockJobs = [
        {
          id: 'job-1',
          data: { taskId: 'task-1', executionId: '' },
          remove: jest.fn().mockResolvedValue(undefined),
        },
        {
          id: 'job-2',
          data: { taskId: 'task-2', executionId: '' },
          remove: jest.fn().mockResolvedValue(undefined),
        },
        {
          id: 'job-3',
          data: { taskId: 'task-1', executionId: '' },
          remove: jest.fn().mockResolvedValue(undefined),
        },
      ];

      mockQueue.getJobs.mockResolvedValue(mockJobs);

      await taskScheduler.unscheduleTask(taskId);

      expect(mockQueue.getJobs).toHaveBeenCalledWith(['waiting', 'delayed']);
      expect(mockJobs[0].remove).toHaveBeenCalled();
      expect(mockJobs[1].remove).not.toHaveBeenCalled();
      expect(mockJobs[2].remove).toHaveBeenCalled();
    });

    it('should handle empty job queue', async () => {
      mockQueue.getJobs.mockResolvedValue([]);

      await taskScheduler.unscheduleTask('task-1');

      expect(mockQueue.getJobs).toHaveBeenCalled();
    });
  });

  describe('executeTask', () => {
    it('should create execution and add job to queue', async () => {
      const task: Task = {
        id: 'task-1',
        userId: 'user-1',
        name: 'Test Task',
        keywords: ['keyword1'],
        targetWebsites: ['https://example.com'],
        schedule: { type: 'daily', time: '10:00' },
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockExecution: Execution = {
        id: 'exec-1',
        taskId: task.id,
        status: 'running',
        startTime: new Date(),
        createdAt: new Date(),
      };

      mockTaskRepository.findById.mockResolvedValue(task);
      mockTaskRepository.updateExecutionTimestamps.mockResolvedValue(task);
      mockExecutionRepository.create.mockResolvedValue(mockExecution);

      const executionId = await taskScheduler.executeTask(task.id);

      expect(executionId).toBe(mockExecution.id);
      expect(mockExecutionRepository.create).toHaveBeenCalledWith(task.id);
      expect(mockQueue.add).toHaveBeenCalledWith(
        { taskId: task.id, executionId: mockExecution.id },
        expect.objectContaining({
          priority: 1,
          jobId: `manual-${task.id}-${mockExecution.id}`,
        })
      );
      expect(mockTaskRepository.updateExecutionTimestamps).toHaveBeenCalled();
    });

    it('should throw error if task not found', async () => {
      mockTaskRepository.findById.mockResolvedValue(null);

      await expect(taskScheduler.executeTask('non-existent')).rejects.toThrow(
        'Task non-existent not found'
      );
    });

    it('should throw error if task is not active', async () => {
      const task: Task = {
        id: 'task-1',
        userId: 'user-1',
        name: 'Test Task',
        keywords: ['keyword1'],
        targetWebsites: ['https://example.com'],
        schedule: { type: 'daily' },
        status: 'paused',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTaskRepository.findById.mockResolvedValue(task);

      await expect(taskScheduler.executeTask(task.id)).rejects.toThrow(
        'Task task-1 is not active (status: paused)'
      );
    });
  });

  describe('calculateNextExecutionTime', () => {
    it('should calculate next daily execution correctly', () => {
      const now = new Date('2024-01-15T08:00:00Z');
      const task: Task = {
        id: 'task-1',
        userId: 'user-1',
        name: 'Test Task',
        keywords: ['keyword1'],
        targetWebsites: ['https://example.com'],
        schedule: {
          type: 'daily',
          time: '14:00',
        },
        status: 'active',
        createdAt: now,
        updatedAt: now,
      };

      // Access private method through any
      const nextTime = (taskScheduler as any).calculateNextExecutionTime(task);

      expect(nextTime).toBeInstanceOf(Date);
      expect(nextTime.getHours()).toBe(14);
      expect(nextTime.getMinutes()).toBe(0);
    });

    it('should return null for already executed "once" task', () => {
      const task: Task = {
        id: 'task-1',
        userId: 'user-1',
        name: 'Test Task',
        keywords: ['keyword1'],
        targetWebsites: ['https://example.com'],
        schedule: {
          type: 'once',
        },
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastExecutedAt: new Date('2024-01-01'),
      };

      const nextTime = (taskScheduler as any).calculateNextExecutionTime(task);

      expect(nextTime).toBeNull();
    });

    it('should calculate next weekly execution correctly', () => {
      const task: Task = {
        id: 'task-1',
        userId: 'user-1',
        name: 'Test Task',
        keywords: ['keyword1'],
        targetWebsites: ['https://example.com'],
        schedule: {
          type: 'weekly',
          time: '10:00',
          dayOfWeek: 1, // Monday
        },
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const nextTime = (taskScheduler as any).calculateNextExecutionTime(task);

      expect(nextTime).toBeInstanceOf(Date);
      expect(nextTime.getDay()).toBe(1); // Monday
      expect(nextTime.getHours()).toBe(10);
    });

    it('should calculate next monthly execution correctly', () => {
      const task: Task = {
        id: 'task-1',
        userId: 'user-1',
        name: 'Test Task',
        keywords: ['keyword1'],
        targetWebsites: ['https://example.com'],
        schedule: {
          type: 'monthly',
          time: '09:00',
          dayOfMonth: 15,
        },
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const nextTime = (taskScheduler as any).calculateNextExecutionTime(task);

      expect(nextTime).toBeInstanceOf(Date);
      expect(nextTime.getDate()).toBe(15);
      expect(nextTime.getHours()).toBe(9);
    });
  });

  describe('processExecution', () => {
    it('should execute complete flow and mark execution as completed', async () => {
      const taskId = 'task-1';
      const executionId = 'exec-1';

      const task: Task = {
        id: taskId,
        userId: 'user-1',
        name: 'Test Task',
        keywords: ['keyword1', 'keyword2'],
        targetWebsites: ['https://example.com', 'https://example2.com'],
        schedule: { type: 'daily' },
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const orchestrationResult = {
        results: [
          {
            websiteUrl: 'https://example.com',
            status: 'success' as const,
            keywordMatches: [
              {
                keyword: 'keyword1',
                found: true,
                occurrences: 2,
                contexts: ['Context 1', 'Context 2'],
              },
            ],
            documentResults: [],
            retrievedAt: new Date(),
          },
        ],
        totalWebsites: 2,
        successCount: 1,
        failedCount: 1,
        timedOut: false,
        executionTime: 5000,
        completedAt: new Date(),
      };

      const mockRetrievalResult: RetrievalResult = {
        id: 'result-1',
        executionId,
        websiteUrl: 'https://example.com',
        keyword: 'keyword1',
        found: true,
        content: 'Context 1\n\nContext 2',
        context: 'Context 1',
        sourceUrl: 'https://example.com',
        createdAt: new Date(),
      };

      mockTaskRepository.findById.mockResolvedValue(task);
      mockSubagentOrchestrator.executeParallel.mockResolvedValue(orchestrationResult);
      mockRetrievalResultRepository.create.mockResolvedValue(mockRetrievalResult);
      mockAnalysisService.generateSummary.mockResolvedValue({} as any);
      mockAnalysisService.compareResults.mockResolvedValue([]);
      mockAnalysisService.analyzeCrossSite.mockResolvedValue([]);
      mockExecutionRepository.markCompleted.mockResolvedValue({} as any);

      // Access private method
      await (taskScheduler as any).processExecution(executionId, taskId);

      expect(mockTaskRepository.findById).toHaveBeenCalledWith(taskId);
      expect(mockSubagentOrchestrator.executeParallel).toHaveBeenCalledWith(
        task.targetWebsites,
        task.keywords,
        120000
      );
      expect(mockRetrievalResultRepository.create).toHaveBeenCalled();
      expect(mockAnalysisService.generateSummary).toHaveBeenCalledWith(
        executionId,
        expect.any(Array)
      );
      expect(mockAnalysisService.compareResults).toHaveBeenCalledWith(executionId, taskId);
      expect(mockAnalysisService.analyzeCrossSite).toHaveBeenCalledWith(
        executionId,
        expect.any(Array)
      );
      expect(mockExecutionRepository.markCompleted).toHaveBeenCalledWith(executionId);
    });

    it('should mark execution as failed on error', async () => {
      const taskId = 'task-1';
      const executionId = 'exec-1';

      mockTaskRepository.findById.mockRejectedValue(new Error('Database error'));
      mockExecutionRepository.markFailed.mockResolvedValue({} as any);

      await expect(
        (taskScheduler as any).processExecution(executionId, taskId)
      ).rejects.toThrow('Database error');

      expect(mockExecutionRepository.markFailed).toHaveBeenCalledWith(
        executionId,
        'Database error'
      );
    });

    it('should handle task not found error', async () => {
      const taskId = 'non-existent';
      const executionId = 'exec-1';

      mockTaskRepository.findById.mockResolvedValue(null);
      mockExecutionRepository.markFailed.mockResolvedValue({} as any);

      await expect(
        (taskScheduler as any).processExecution(executionId, taskId)
      ).rejects.toThrow(`Task ${taskId} not found`);

      expect(mockExecutionRepository.markFailed).toHaveBeenCalled();
    });

    it('should save document retrieval results', async () => {
      const taskId = 'task-1';
      const executionId = 'exec-1';

      const task: Task = {
        id: taskId,
        userId: 'user-1',
        name: 'Test Task',
        keywords: ['keyword1'],
        targetWebsites: ['https://example.com'],
        schedule: { type: 'daily' },
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const orchestrationResult = {
        results: [
          {
            websiteUrl: 'https://example.com',
            status: 'success' as const,
            keywordMatches: [],
            documentResults: [
              {
                documentUrl: 'https://example.com/doc.pdf',
                status: 'success' as const,
                keywordMatches: [
                  {
                    keyword: 'keyword1',
                    found: true,
                    occurrences: 1,
                    contexts: ['Document context'],
                  },
                ],
              },
            ],
            retrievedAt: new Date(),
          },
        ],
        totalWebsites: 1,
        successCount: 1,
        failedCount: 0,
        timedOut: false,
        executionTime: 3000,
        completedAt: new Date(),
      };

      mockTaskRepository.findById.mockResolvedValue(task);
      mockSubagentOrchestrator.executeParallel.mockResolvedValue(orchestrationResult);
      mockRetrievalResultRepository.create.mockResolvedValue({} as any);
      mockAnalysisService.generateSummary.mockResolvedValue({} as any);
      mockAnalysisService.compareResults.mockResolvedValue([]);
      mockAnalysisService.analyzeCrossSite.mockResolvedValue([]);
      mockExecutionRepository.markCompleted.mockResolvedValue({} as any);

      await (taskScheduler as any).processExecution(executionId, taskId);

      expect(mockRetrievalResultRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          executionId,
          websiteUrl: 'https://example.com',
          keyword: 'keyword1',
          found: true,
          documentUrl: 'https://example.com/doc.pdf',
        })
      );
    });
  });

  describe('close', () => {
    it('should close the queue', async () => {
      await taskScheduler.close();

      expect(mockQueue.close).toHaveBeenCalled();
    });
  });
});
