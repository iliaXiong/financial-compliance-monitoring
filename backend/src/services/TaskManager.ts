import { TaskRepository } from '../repositories';
import {
  Task,
  CreateTaskDTO,
  UpdateTaskDTO,
  TaskFilters,
  PaginatedTasks,
  TaskStatus
} from '../types';

export class TaskManager {
  private taskRepository: TaskRepository;

  constructor(taskRepository?: TaskRepository) {
    this.taskRepository = taskRepository || new TaskRepository();
  }

  /**
   * Create a new task with validation
   * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
   */
  async createTask(userId: string, taskData: CreateTaskDTO): Promise<Task> {
    // Validate required fields
    this.validateTaskData(taskData);

    // Create task in database
    const task = await this.taskRepository.create(userId, taskData);

    return task;
  }

  /**
   * Get task by ID
   * Requirements: 10.1
   */
  async getTask(taskId: string, userId: string): Promise<Task> {
    const task = await this.taskRepository.findById(taskId);

    if (!task) {
      throw new Error('Task not found');
    }

    // Verify task belongs to user
    if (task.userId !== userId) {
      throw new Error('Unauthorized access to task');
    }

    return task;
  }

  /**
   * List tasks with pagination and filtering
   * Requirements: 10.1
   */
  async listTasks(userId: string, filters: TaskFilters = {}): Promise<PaginatedTasks> {
    // Exclude deleted tasks by default unless explicitly requested
    const effectiveFilters = { ...filters };
    if (!effectiveFilters.status) {
      // Return all non-deleted tasks
      effectiveFilters.status = undefined;
    }

    const result = await this.taskRepository.findAll(userId, effectiveFilters);

    // Filter out deleted tasks if no specific status filter
    if (!filters.status) {
      result.tasks = result.tasks.filter(task => task.status !== 'deleted');
      result.total = result.tasks.length;
    }

    return result;
  }

  /**
   * Update task configuration
   * Requirements: 10.2
   */
  async updateTask(
    taskId: string,
    userId: string,
    updates: UpdateTaskDTO
  ): Promise<Task> {
    // Verify task exists and belongs to user
    await this.getTask(taskId, userId);

    // Validate updates if provided
    if (updates.keywords !== undefined || updates.targetWebsites !== undefined) {
      const validationData: any = {};
      if (updates.keywords !== undefined) {
        validationData.keywords = updates.keywords;
      }
      if (updates.targetWebsites !== undefined) {
        validationData.targetWebsites = updates.targetWebsites;
      }
      if (updates.name !== undefined) {
        validationData.name = updates.name;
      }
      if (updates.schedule !== undefined) {
        validationData.schedule = updates.schedule;
      }

      // Only validate if we have data to validate
      if (Object.keys(validationData).length > 0) {
        this.validateTaskData(validationData as any, true);
      }
    }

    // Update task
    const updatedTask = await this.taskRepository.update(taskId, updates);

    if (!updatedTask) {
      throw new Error('Failed to update task');
    }

    return updatedTask;
  }

  /**
   * Delete task (soft delete, preserves history)
   * Requirements: 10.5, 10.6
   */
  async deleteTask(taskId: string, userId: string): Promise<void> {
    // Verify task exists and belongs to user
    await this.getTask(taskId, userId);

    // Soft delete (set status to 'deleted')
    const success = await this.taskRepository.delete(taskId);

    if (!success) {
      throw new Error('Failed to delete task');
    }
  }

  /**
   * Pause task execution
   * Requirements: 10.3
   */
  async pauseTask(taskId: string, userId: string): Promise<Task> {
    // Verify task exists and belongs to user
    const task = await this.getTask(taskId, userId);

    // Check if task is already paused or deleted
    if (task.status === 'paused') {
      throw new Error('Task is already paused');
    }

    if (task.status === 'deleted') {
      throw new Error('Cannot pause a deleted task');
    }

    // Update status to paused
    const updatedTask = await this.taskRepository.updateStatus(taskId, 'paused');

    if (!updatedTask) {
      throw new Error('Failed to pause task');
    }

    return updatedTask;
  }

  /**
   * Resume task execution
   * Requirements: 10.4
   */
  async resumeTask(taskId: string, userId: string): Promise<Task> {
    // Verify task exists and belongs to user
    const task = await this.getTask(taskId, userId);

    // Check if task is not paused
    if (task.status !== 'paused') {
      throw new Error('Task is not paused');
    }

    // Update status to active
    const updatedTask = await this.taskRepository.updateStatus(taskId, 'active');

    if (!updatedTask) {
      throw new Error('Failed to resume task');
    }

    return updatedTask;
  }

  /**
   * Validate task data
   * Requirements: 1.4, 1.6
   */
  private validateTaskData(taskData: Partial<CreateTaskDTO>, isUpdate: boolean = false): void {
    const errors: Array<{ field: string; message: string }> = [];

    // Validate keywords (required for create, optional for update)
    if (!isUpdate || taskData.keywords !== undefined) {
      if (!taskData.keywords || taskData.keywords.length === 0) {
        errors.push({
          field: 'keywords',
          message: '至少需要输入一个关键词'
        });
      }
    }

    // Validate target websites (required for create, optional for update)
    if (!isUpdate || taskData.targetWebsites !== undefined) {
      if (!taskData.targetWebsites || taskData.targetWebsites.length === 0) {
        errors.push({
          field: 'targetWebsites',
          message: '至少需要指定一个目标网站'
        });
      } else {
        // Validate URL format
        taskData.targetWebsites.forEach((url, index) => {
          if (!this.isValidUrl(url)) {
            errors.push({
              field: `targetWebsites[${index}]`,
              message: '网站URL格式无效'
            });
          }
        });
      }
    }

    // Validate name (required for create, optional for update)
    if (!isUpdate || taskData.name !== undefined) {
      if (!taskData.name || taskData.name.trim().length === 0) {
        errors.push({
          field: 'name',
          message: '任务名称不能为空'
        });
      }
    }

    // Validate schedule (required for create, optional for update)
    if (!isUpdate || taskData.schedule !== undefined) {
      if (!taskData.schedule) {
        errors.push({
          field: 'schedule',
          message: '必须设置任务执行时间计划'
        });
      } else {
        this.validateSchedule(taskData.schedule, errors);
      }
    }

    if (errors.length > 0) {
      const error: any = new Error('表单验证失败');
      error.code = 'VALIDATION_ERROR';
      error.details = errors;
      throw error;
    }
  }

  /**
   * Validate schedule configuration
   */
  private validateSchedule(
    schedule: any,
    errors: Array<{ field: string; message: string }>
  ): void {
    const validTypes = ['once', 'daily', 'weekly', 'monthly'];
    
    if (!validTypes.includes(schedule.type)) {
      errors.push({
        field: 'schedule.type',
        message: '无效的时间计划类型'
      });
    }

    // Validate time format (HH:mm)
    if (schedule.time && !this.isValidTimeFormat(schedule.time)) {
      errors.push({
        field: 'schedule.time',
        message: '时间格式无效，应为 HH:mm'
      });
    }

    // Validate day of week (0-6)
    if (schedule.dayOfWeek !== undefined && schedule.dayOfWeek !== null) {
      if (!Number.isInteger(schedule.dayOfWeek) || schedule.dayOfWeek < 0 || schedule.dayOfWeek > 6) {
        errors.push({
          field: 'schedule.dayOfWeek',
          message: '星期几必须在 0-6 之间'
        });
      }
    }

    // Validate day of month (1-31)
    if (schedule.dayOfMonth !== undefined && schedule.dayOfMonth !== null) {
      if (!Number.isInteger(schedule.dayOfMonth) || schedule.dayOfMonth < 1 || schedule.dayOfMonth > 31) {
        errors.push({
          field: 'schedule.dayOfMonth',
          message: '日期必须在 1-31 之间'
        });
      }
    }
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Validate time format (HH:mm)
   */
  private isValidTimeFormat(time: string): boolean {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }
}
