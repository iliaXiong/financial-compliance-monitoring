import { TaskRepository } from '../TaskRepository';
import { CreateTaskDTO, TaskStatus } from '../../types';
import { Pool } from 'pg';

// Create a mock pool
const mockQuery = jest.fn();
const mockPool = {
  query: mockQuery
} as unknown as Pool;

// Mock the database module
jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn()
  }
}));

// Import after mocking
import { pool } from '../../config/database';

describe('TaskRepository', () => {
  let taskRepository: TaskRepository;

  beforeEach(() => {
    taskRepository = new TaskRepository();
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new task with valid data', async () => {
      const userId = 'user-123';
      const taskData: CreateTaskDTO = {
        name: 'Test Task',
        keywords: ['金融监管', '合规政策'],
        targetWebsites: ['https://example.com'],
        schedule: {
          type: 'daily',
          time: '09:00'
        }
      };

      const mockRow = {
        id: 'task-123',
        user_id: userId,
        name: taskData.name,
        keywords: taskData.keywords,
        target_websites: taskData.targetWebsites,
        schedule_type: taskData.schedule.type,
        schedule_time: taskData.schedule.time,
        schedule_day_of_week: null,
        schedule_day_of_month: null,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
        last_executed_at: null,
        next_execution_at: null
      };

      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockRow],
        rowCount: 1
      });

      const result = await taskRepository.create(userId, taskData);

      expect(result).toMatchObject({
        id: 'task-123',
        userId: userId,
        name: taskData.name,
        keywords: taskData.keywords,
        targetWebsites: taskData.targetWebsites,
        status: 'active'
      });

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO tasks'),
        expect.arrayContaining([userId, taskData.name, taskData.keywords, taskData.targetWebsites])
      );
    });
  });

  describe('findById', () => {
    it('should return task when found', async () => {
      const taskId = 'task-123';
      const mockRow = {
        id: taskId,
        user_id: 'user-123',
        name: 'Test Task',
        keywords: ['keyword1'],
        target_websites: ['https://example.com'],
        schedule_type: 'daily',
        schedule_time: '09:00',
        schedule_day_of_week: null,
        schedule_day_of_month: null,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
        last_executed_at: null,
        next_execution_at: null
      };

      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockRow],
        rowCount: 1
      });

      const result = await taskRepository.findById(taskId);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(taskId);
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM tasks WHERE id = $1',
        [taskId]
      );
    });

    it('should return null when task not found', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });

      const result = await taskRepository.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('updateStatus', () => {
    it('should update task status', async () => {
      const taskId = 'task-123';
      const newStatus: TaskStatus = 'paused';

      const mockRow = {
        id: taskId,
        user_id: 'user-123',
        name: 'Test Task',
        keywords: ['keyword1'],
        target_websites: ['https://example.com'],
        schedule_type: 'daily',
        schedule_time: '09:00',
        schedule_day_of_week: null,
        schedule_day_of_month: null,
        status: newStatus,
        created_at: new Date(),
        updated_at: new Date(),
        last_executed_at: null,
        next_execution_at: null
      };

      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockRow],
        rowCount: 1
      });

      const result = await taskRepository.updateStatus(taskId, newStatus);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(newStatus);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE tasks'),
        [newStatus, taskId]
      );
    });
  });

  describe('delete', () => {
    it('should soft delete task by setting status to deleted', async () => {
      const taskId = 'task-123';

      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
        rowCount: 1
      });

      const result = await taskRepository.delete(taskId);

      expect(result).toBe(true);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'deleted'"),
        [taskId]
      );
    });
  });
});
