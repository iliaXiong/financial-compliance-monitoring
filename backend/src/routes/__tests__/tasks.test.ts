import request from 'supertest';
import express from 'express';
import tasksRouter from '../tasks';
import { errorHandler } from '../../middleware';
import { TaskManager } from '../../services/TaskManager';
import { TaskScheduler } from '../../services/TaskScheduler';
import { generateToken } from '../../middleware/auth';

// Mock the services
jest.mock('../../services/TaskManager');
jest.mock('../../services/TaskScheduler');

describe('Tasks API Routes', () => {
  let app: express.Application;
  let mockTaskManager: jest.Mocked<TaskManager>;
  let mockTaskScheduler: jest.Mocked<TaskScheduler>;
  let authToken: string;
  const testUserId = 'test-user-id';

  beforeEach(() => {
    // Create Express app with routes
    app = express();
    app.use(express.json());
    app.use('/api/tasks', tasksRouter);
    app.use(errorHandler);

    // Generate auth token for tests
    authToken = generateToken(testUserId, 'test@example.com');

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('POST /api/tasks', () => {
    it('should create a new task successfully', async () => {
      const taskData = {
        name: 'Test Task',
        keywords: ['keyword1', 'keyword2'],
        targetWebsites: ['https://example.com'],
        schedule: { type: 'daily' as const, time: '10:00' },
      };

      const createdTask = {
        id: 'task-1',
        userId: testUserId,
        ...taskData,
        status: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock TaskManager.createTask
      (TaskManager.prototype.createTask as jest.Mock).mockResolvedValue(createdTask);
      // Mock TaskScheduler.scheduleTask
      (TaskScheduler.prototype.scheduleTask as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(taskData)
        .expect(201);

      expect(response.body).toMatchObject({
        taskId: 'task-1',
        status: 'created',
        task: expect.objectContaining({
          id: 'task-1',
          name: 'Test Task',
        }),
      });
    });

    it('should return 400 for validation errors', async () => {
      const invalidTaskData = {
        name: 'Test Task',
        keywords: [], // Empty keywords
        targetWebsites: ['https://example.com'],
        schedule: { type: 'daily' as const },
      };

      const validationError: any = new Error('表单验证失败');
      validationError.code = 'VALIDATION_ERROR';
      validationError.details = [
        { field: 'keywords', message: '至少需要输入一个关键词' },
      ];

      (TaskManager.prototype.createTask as jest.Mock).mockRejectedValue(validationError);

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidTaskData)
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'VALIDATION_ERROR',
        message: '表单验证失败',
      });
    });

    it('should return 401 without authentication', async () => {
      const taskData = {
        name: 'Test Task',
        keywords: ['keyword1'],
        targetWebsites: ['https://example.com'],
        schedule: { type: 'daily' as const },
      };

      await request(app)
        .post('/api/tasks')
        .send(taskData)
        .expect(401);
    });
  });

  describe('GET /api/tasks', () => {
    it('should return paginated task list', async () => {
      const mockTasks = {
        tasks: [
          {
            id: 'task-1',
            userId: testUserId,
            name: 'Task 1',
            keywords: ['keyword1'],
            targetWebsites: ['https://example.com'],
            schedule: { type: 'daily' as const },
            status: 'active' as const,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      };

      (TaskManager.prototype.listTasks as jest.Mock).mockResolvedValue(mockTasks);

      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        tasks: expect.arrayContaining([
          expect.objectContaining({ id: 'task-1' }),
        ]),
        total: 1,
        page: 1,
      });
    });

    it('should support pagination parameters', async () => {
      const mockTasks = {
        tasks: [],
        total: 0,
        page: 2,
        limit: 10,
      };

      (TaskManager.prototype.listTasks as jest.Mock).mockResolvedValue(mockTasks);

      await request(app)
        .get('/api/tasks?page=2&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(TaskManager.prototype.listTasks).toHaveBeenCalledWith(
        testUserId,
        expect.objectContaining({ page: 2, limit: 10 })
      );
    });
  });

  describe('GET /api/tasks/:taskId', () => {
    it('should return task details', async () => {
      const mockTask = {
        id: 'task-1',
        userId: testUserId,
        name: 'Task 1',
        keywords: ['keyword1'],
        targetWebsites: ['https://example.com'],
        schedule: { type: 'daily' as const },
        status: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (TaskManager.prototype.getTask as jest.Mock).mockResolvedValue(mockTask);

      const response = await request(app)
        .get('/api/tasks/task-1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: 'task-1',
        name: 'Task 1',
      });
    });

    it('should return 404 for non-existent task', async () => {
      (TaskManager.prototype.getTask as jest.Mock).mockRejectedValue(
        new Error('Task not found')
      );

      await request(app)
        .get('/api/tasks/non-existent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('PUT /api/tasks/:taskId', () => {
    it('should update task successfully', async () => {
      const updates = {
        name: 'Updated Task',
        keywords: ['new-keyword'],
      };

      const updatedTask = {
        id: 'task-1',
        userId: testUserId,
        name: 'Updated Task',
        keywords: ['new-keyword'],
        targetWebsites: ['https://example.com'],
        schedule: { type: 'daily' as const },
        status: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (TaskManager.prototype.updateTask as jest.Mock).mockResolvedValue(updatedTask);
      (TaskScheduler.prototype.unscheduleTask as jest.Mock).mockResolvedValue(undefined);
      (TaskScheduler.prototype.scheduleTask as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .put('/api/tasks/task-1')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(200);

      expect(response.body).toMatchObject({
        id: 'task-1',
        name: 'Updated Task',
      });
    });
  });

  describe('PATCH /api/tasks/:taskId/status', () => {
    it('should pause task successfully', async () => {
      const pausedTask = {
        id: 'task-1',
        userId: testUserId,
        name: 'Task 1',
        keywords: ['keyword1'],
        targetWebsites: ['https://example.com'],
        schedule: { type: 'daily' as const },
        status: 'paused' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (TaskManager.prototype.pauseTask as jest.Mock).mockResolvedValue(pausedTask);
      (TaskScheduler.prototype.unscheduleTask as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .patch('/api/tasks/task-1/status')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'paused' })
        .expect(200);

      expect(response.body.status).toBe('paused');
    });

    it('should resume task successfully', async () => {
      const activeTask = {
        id: 'task-1',
        userId: testUserId,
        name: 'Task 1',
        keywords: ['keyword1'],
        targetWebsites: ['https://example.com'],
        schedule: { type: 'daily' as const },
        status: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (TaskManager.prototype.resumeTask as jest.Mock).mockResolvedValue(activeTask);
      (TaskScheduler.prototype.scheduleTask as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .patch('/api/tasks/task-1/status')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'active' })
        .expect(200);

      expect(response.body.status).toBe('active');
    });

    it('should return 400 for invalid status', async () => {
      await request(app)
        .patch('/api/tasks/task-1/status')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'invalid' })
        .expect(400);
    });
  });

  describe('DELETE /api/tasks/:taskId', () => {
    it('should delete task successfully', async () => {
      (TaskScheduler.prototype.unscheduleTask as jest.Mock).mockResolvedValue(undefined);
      (TaskManager.prototype.deleteTask as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .delete('/api/tasks/task-1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({ success: true });
    });
  });

  describe('POST /api/tasks/:taskId/execute', () => {
    it('should trigger task execution successfully', async () => {
      const mockTask = {
        id: 'task-1',
        userId: testUserId,
        name: 'Task 1',
        keywords: ['keyword1'],
        targetWebsites: ['https://example.com'],
        schedule: { type: 'daily' as const },
        status: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (TaskManager.prototype.getTask as jest.Mock).mockResolvedValue(mockTask);
      (TaskScheduler.prototype.executeTask as jest.Mock).mockResolvedValue('exec-1');

      const response = await request(app)
        .post('/api/tasks/task-1/execute')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({ executionId: 'exec-1' });
    });

    it('should return 400 for inactive task', async () => {
      (TaskManager.prototype.getTask as jest.Mock).mockResolvedValue({
        id: 'task-1',
        status: 'paused',
      });
      (TaskScheduler.prototype.executeTask as jest.Mock).mockRejectedValue(
        new Error('Task task-1 is not active (status: paused)')
      );

      await request(app)
        .post('/api/tasks/task-1/execute')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });
});
