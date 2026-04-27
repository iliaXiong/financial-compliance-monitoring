import { Router, Response } from 'express';
import { TaskManager } from '../services/TaskManager';
import { TaskScheduler } from '../services/TaskScheduler';
import { authenticate, AuthRequest, asyncHandler, AppError } from '../middleware';
import { CreateTaskDTO, UpdateTaskDTO, TaskStatus } from '../types';

const router = Router();
const taskManager = new TaskManager();
export const taskScheduler = new TaskScheduler();

/**
 * POST /api/tasks
 * Create a new monitoring task
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 */
router.post(
  '/',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const taskData: CreateTaskDTO = req.body;

    try {
      // Create task
      const task = await taskManager.createTask(userId, taskData);

      // Schedule task for execution
      await taskScheduler.scheduleTask(task);

      // Re-fetch task to get updated nextExecutionAt after scheduling
      const updatedTask = await taskManager.getTask(task.id, userId);

      res.status(201).json({
        taskId: task.id,
        status: 'created',
        task: updatedTask,
      });
    } catch (error: any) {
      // Handle validation errors
      if (error.code === 'VALIDATION_ERROR') {
        throw new AppError(400, 'VALIDATION_ERROR', error.message, error.details);
      }
      throw error;
    }
  })
);

/**
 * GET /api/tasks
 * Get list of tasks with pagination and filtering
 * 
 * Requirements: 10.1
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    
    // Parse query parameters
    const status = req.query.status as TaskStatus | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      throw new AppError(400, 'INVALID_PARAMETERS', '分页参数无效');
    }

    const result = await taskManager.listTasks(userId, {
      status,
      page,
      limit,
    });

    res.json(result);
  })
);

/**
 * GET /api/tasks/:taskId
 * Get task details by ID
 * 
 * Requirements: 10.1
 */
router.get(
  '/:taskId',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const { taskId } = req.params;

    try {
      const task = await taskManager.getTask(taskId, userId);
      res.json(task);
    } catch (error: any) {
      if (error.message === 'Task not found') {
        throw new AppError(404, 'NOT_FOUND', '任务不存在');
      }
      if (error.message === 'Unauthorized access to task') {
        throw new AppError(403, 'FORBIDDEN', '无权访问此任务');
      }
      throw error;
    }
  })
);

/**
 * PUT /api/tasks/:taskId
 * Update task configuration
 * 
 * Requirements: 10.2
 */
router.put(
  '/:taskId',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const { taskId } = req.params;
    const updates: UpdateTaskDTO = req.body;

    try {
      const updatedTask = await taskManager.updateTask(taskId, userId, updates);

      // If schedule was updated, reschedule the task
      if (updates.schedule && updatedTask.status === 'active') {
        await taskScheduler.unscheduleTask(taskId);
        await taskScheduler.scheduleTask(updatedTask);
      }

      res.json(updatedTask);
    } catch (error: any) {
      if (error.message === 'Task not found') {
        throw new AppError(404, 'NOT_FOUND', '任务不存在');
      }
      if (error.message === 'Unauthorized access to task') {
        throw new AppError(403, 'FORBIDDEN', '无权访问此任务');
      }
      if (error.code === 'VALIDATION_ERROR') {
        throw new AppError(400, 'VALIDATION_ERROR', error.message, error.details);
      }
      throw error;
    }
  })
);

/**
 * PATCH /api/tasks/:taskId/status
 * Pause or resume task execution
 * 
 * Requirements: 10.3, 10.4
 */
router.patch(
  '/:taskId/status',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const { taskId } = req.params;
    const { status } = req.body;

    // Validate status
    if (!status || !['active', 'paused'].includes(status)) {
      throw new AppError(400, 'INVALID_STATUS', '状态必须是 active 或 paused');
    }

    try {
      let updatedTask;

      if (status === 'paused') {
        updatedTask = await taskManager.pauseTask(taskId, userId);
        // Unschedule the task
        await taskScheduler.unscheduleTask(taskId);
      } else {
        updatedTask = await taskManager.resumeTask(taskId, userId);
        // Reschedule the task
        await taskScheduler.scheduleTask(updatedTask);
      }

      res.json(updatedTask);
    } catch (error: any) {
      if (error.message === 'Task not found') {
        throw new AppError(404, 'NOT_FOUND', '任务不存在');
      }
      if (error.message === 'Unauthorized access to task') {
        throw new AppError(403, 'FORBIDDEN', '无权访问此任务');
      }
      if (
        error.message === 'Task is already paused' ||
        error.message === 'Task is not paused' ||
        error.message === 'Cannot pause a deleted task'
      ) {
        throw new AppError(400, 'INVALID_OPERATION', error.message);
      }
      throw error;
    }
  })
);

/**
 * DELETE /api/tasks/:taskId
 * Delete task (soft delete, preserves history)
 * 
 * Requirements: 10.5
 */
router.delete(
  '/:taskId',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const { taskId } = req.params;

    try {
      // Unschedule task before deletion
      await taskScheduler.unscheduleTask(taskId);
      
      // Soft delete task
      await taskManager.deleteTask(taskId, userId);

      res.json({ success: true });
    } catch (error: any) {
      if (error.message === 'Task not found') {
        throw new AppError(404, 'NOT_FOUND', '任务不存在');
      }
      if (error.message === 'Unauthorized access to task') {
        throw new AppError(403, 'FORBIDDEN', '无权访问此任务');
      }
      throw error;
    }
  })
);

/**
 * POST /api/tasks/:taskId/execute
 * Manually trigger task execution
 * 
 * Requirements: 10.1
 */
router.post(
  '/:taskId/execute',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const { taskId } = req.params;

    try {
      // Verify task belongs to user
      await taskManager.getTask(taskId, userId);

      // Trigger execution
      const executionId = await taskScheduler.executeTask(taskId);

      res.json({ executionId });
    } catch (error: any) {
      if (error.message === 'Task not found') {
        throw new AppError(404, 'NOT_FOUND', '任务不存在');
      }
      if (error.message === 'Unauthorized access to task') {
        throw new AppError(403, 'FORBIDDEN', '无权访问此任务');
      }
      if (error.message?.includes('is not active')) {
        throw new AppError(400, 'INVALID_OPERATION', '只能执行活跃状态的任务');
      }
      throw error;
    }
  })
);

export default router;
