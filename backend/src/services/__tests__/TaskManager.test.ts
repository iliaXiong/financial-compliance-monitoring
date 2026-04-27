import { TaskManager } from '../TaskManager';
import { TaskRepository } from '../../repositories';
import { Task, CreateTaskDTO, UpdateTaskDTO, TaskStatus } from '../../types';

// Mock TaskRepository
jest.mock('../../repositories/TaskRepository');

describe('TaskManager', () => {
  let taskManager: TaskManager;
  let mockTaskRepository: jest.Mocked<TaskRepository>;

  const mockUserId = 'user-123';
  const mockTaskId = 'task-456';

  const validTaskData: CreateTaskDTO = {
    name: '测试任务',
    keywords: ['金融监管', '合规政策'],
    targetWebsites: ['https://example.com', 'https://test.com'],
    schedule: {
      type: 'daily',
      time: '09:00'
    }
  };

  const mockTask: Task = {
    id: mockTaskId,
    userId: mockUserId,
    name: validTaskData.name,
    keywords: validTaskData.keywords,
    targetWebsites: validTaskData.targetWebsites,
    schedule: validTaskData.schedule,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockTaskRepository = new TaskRepository() as jest.Mocked<TaskRepository>;
    taskManager = new TaskManager(mockTaskRepository);
  });

  describe('createTask', () => {
    it('should create a task with valid data', async () => {
      mockTaskRepository.create.mockResolvedValue(mockTask);

      const result = await taskManager.createTask(mockUserId, validTaskData);

      expect(mockTaskRepository.create).toHaveBeenCalledWith(mockUserId, validTaskData);
      expect(result).toEqual(mockTask);
    });

    it('should throw validation error when keywords are empty', async () => {
      const invalidData = { ...validTaskData, keywords: [] };

      await expect(taskManager.createTask(mockUserId, invalidData)).rejects.toThrow('表单验证失败');
    });

    it('should throw validation error when targetWebsites are empty', async () => {
      const invalidData = { ...validTaskData, targetWebsites: [] };

      await expect(taskManager.createTask(mockUserId, invalidData)).rejects.toThrow('表单验证失败');
    });

    it('should throw validation error when name is empty', async () => {
      const invalidData = { ...validTaskData, name: '' };

      await expect(taskManager.createTask(mockUserId, invalidData)).rejects.toThrow('表单验证失败');
    });

    it('should throw validation error for invalid URL format', async () => {
      const invalidData = {
        ...validTaskData,
        targetWebsites: ['not-a-valid-url']
      };

      await expect(taskManager.createTask(mockUserId, invalidData)).rejects.toThrow('表单验证失败');
    });

    it('should throw validation error for invalid schedule type', async () => {
      const invalidData = {
        ...validTaskData,
        schedule: { type: 'invalid' as any }
      };

      await expect(taskManager.createTask(mockUserId, invalidData)).rejects.toThrow('表单验证失败');
    });

    it('should throw validation error for invalid time format', async () => {
      const invalidData = {
        ...validTaskData,
        schedule: { type: 'daily' as const, time: '25:00' }
      };

      await expect(taskManager.createTask(mockUserId, invalidData)).rejects.toThrow('表单验证失败');
    });

    it('should throw validation error for invalid dayOfWeek', async () => {
      const invalidData = {
        ...validTaskData,
        schedule: { type: 'weekly' as const, time: '09:00', dayOfWeek: 7 }
      };

      await expect(taskManager.createTask(mockUserId, invalidData)).rejects.toThrow('表单验证失败');
    });

    it('should throw validation error for invalid dayOfMonth', async () => {
      const invalidData = {
        ...validTaskData,
        schedule: { type: 'monthly' as const, time: '09:00', dayOfMonth: 32 }
      };

      await expect(taskManager.createTask(mockUserId, invalidData)).rejects.toThrow('表单验证失败');
    });
  });

  describe('getTask', () => {
    it('should return task when found and user is authorized', async () => {
      mockTaskRepository.findById.mockResolvedValue(mockTask);

      const result = await taskManager.getTask(mockTaskId, mockUserId);

      expect(mockTaskRepository.findById).toHaveBeenCalledWith(mockTaskId);
      expect(result).toEqual(mockTask);
    });

    it('should throw error when task not found', async () => {
      mockTaskRepository.findById.mockResolvedValue(null);

      await expect(taskManager.getTask(mockTaskId, mockUserId)).rejects.toThrow('Task not found');
    });

    it('should throw error when user is not authorized', async () => {
      const unauthorizedTask = { ...mockTask, userId: 'other-user' };
      mockTaskRepository.findById.mockResolvedValue(unauthorizedTask);

      await expect(taskManager.getTask(mockTaskId, mockUserId)).rejects.toThrow('Unauthorized access to task');
    });
  });

  describe('listTasks', () => {
    it('should return paginated tasks excluding deleted ones', async () => {
      const mockTasks = [
        mockTask,
        { ...mockTask, id: 'task-2', status: 'paused' as TaskStatus }
      ];
      
      mockTaskRepository.findAll.mockResolvedValue({
        tasks: mockTasks,
        total: 2,
        page: 1,
        limit: 20
      });

      const result = await taskManager.listTasks(mockUserId);

      expect(mockTaskRepository.findAll).toHaveBeenCalledWith(mockUserId, { status: undefined });
      expect(result.tasks).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter tasks by status', async () => {
      const pausedTask = { ...mockTask, status: 'paused' as TaskStatus };
      
      mockTaskRepository.findAll.mockResolvedValue({
        tasks: [pausedTask],
        total: 1,
        page: 1,
        limit: 20
      });

      const result = await taskManager.listTasks(mockUserId, { status: 'paused' });

      expect(mockTaskRepository.findAll).toHaveBeenCalledWith(mockUserId, { status: 'paused' });
      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].status).toBe('paused');
    });

    it('should support pagination', async () => {
      mockTaskRepository.findAll.mockResolvedValue({
        tasks: [mockTask],
        total: 10,
        page: 2,
        limit: 5
      });

      const result = await taskManager.listTasks(mockUserId, { page: 2, limit: 5 });

      expect(mockTaskRepository.findAll).toHaveBeenCalledWith(mockUserId, { page: 2, limit: 5, status: undefined });
      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
    });
  });

  describe('updateTask', () => {
    it('should update task with valid data', async () => {
      const updates: UpdateTaskDTO = {
        name: '更新后的任务',
        keywords: ['新关键词']
      };
      const updatedTask = { ...mockTask, ...updates };

      mockTaskRepository.findById.mockResolvedValue(mockTask);
      mockTaskRepository.update.mockResolvedValue(updatedTask);

      const result = await taskManager.updateTask(mockTaskId, mockUserId, updates);

      expect(mockTaskRepository.update).toHaveBeenCalledWith(mockTaskId, updates);
      expect(result.name).toBe(updates.name);
      expect(result.keywords).toEqual(updates.keywords);
    });

    it('should throw error when task not found', async () => {
      mockTaskRepository.findById.mockResolvedValue(null);

      await expect(
        taskManager.updateTask(mockTaskId, mockUserId, { name: 'New Name' })
      ).rejects.toThrow('Task not found');
    });

    it('should throw validation error for empty keywords', async () => {
      mockTaskRepository.findById.mockResolvedValue(mockTask);

      await expect(
        taskManager.updateTask(mockTaskId, mockUserId, { keywords: [] })
      ).rejects.toThrow('表单验证失败');
    });

    it('should throw validation error for empty targetWebsites', async () => {
      mockTaskRepository.findById.mockResolvedValue(mockTask);

      await expect(
        taskManager.updateTask(mockTaskId, mockUserId, { targetWebsites: [] })
      ).rejects.toThrow('表单验证失败');
    });
  });

  describe('deleteTask', () => {
    it('should soft delete task', async () => {
      mockTaskRepository.findById.mockResolvedValue(mockTask);
      mockTaskRepository.delete.mockResolvedValue(true);

      await taskManager.deleteTask(mockTaskId, mockUserId);

      expect(mockTaskRepository.delete).toHaveBeenCalledWith(mockTaskId);
    });

    it('should throw error when task not found', async () => {
      mockTaskRepository.findById.mockResolvedValue(null);

      await expect(taskManager.deleteTask(mockTaskId, mockUserId)).rejects.toThrow('Task not found');
    });

    it('should throw error when delete fails', async () => {
      mockTaskRepository.findById.mockResolvedValue(mockTask);
      mockTaskRepository.delete.mockResolvedValue(false);

      await expect(taskManager.deleteTask(mockTaskId, mockUserId)).rejects.toThrow('Failed to delete task');
    });
  });

  describe('pauseTask', () => {
    it('should pause an active task', async () => {
      const pausedTask = { ...mockTask, status: 'paused' as TaskStatus };
      
      mockTaskRepository.findById.mockResolvedValue(mockTask);
      mockTaskRepository.updateStatus.mockResolvedValue(pausedTask);

      const result = await taskManager.pauseTask(mockTaskId, mockUserId);

      expect(mockTaskRepository.updateStatus).toHaveBeenCalledWith(mockTaskId, 'paused');
      expect(result.status).toBe('paused');
    });

    it('should throw error when task is already paused', async () => {
      const pausedTask = { ...mockTask, status: 'paused' as TaskStatus };
      mockTaskRepository.findById.mockResolvedValue(pausedTask);

      await expect(taskManager.pauseTask(mockTaskId, mockUserId)).rejects.toThrow('Task is already paused');
    });

    it('should throw error when task is deleted', async () => {
      const deletedTask = { ...mockTask, status: 'deleted' as TaskStatus };
      mockTaskRepository.findById.mockResolvedValue(deletedTask);

      await expect(taskManager.pauseTask(mockTaskId, mockUserId)).rejects.toThrow('Cannot pause a deleted task');
    });
  });

  describe('resumeTask', () => {
    it('should resume a paused task', async () => {
      const pausedTask = { ...mockTask, status: 'paused' as TaskStatus };
      const activeTask = { ...mockTask, status: 'active' as TaskStatus };
      
      mockTaskRepository.findById.mockResolvedValue(pausedTask);
      mockTaskRepository.updateStatus.mockResolvedValue(activeTask);

      const result = await taskManager.resumeTask(mockTaskId, mockUserId);

      expect(mockTaskRepository.updateStatus).toHaveBeenCalledWith(mockTaskId, 'active');
      expect(result.status).toBe('active');
    });

    it('should throw error when task is not paused', async () => {
      mockTaskRepository.findById.mockResolvedValue(mockTask);

      await expect(taskManager.resumeTask(mockTaskId, mockUserId)).rejects.toThrow('Task is not paused');
    });
  });
});
