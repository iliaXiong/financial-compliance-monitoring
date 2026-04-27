import { pool } from '../config/database';
import { Task, CreateTaskDTO, UpdateTaskDTO, TaskStatus, TaskFilters, PaginatedTasks } from '../types';

export class TaskRepository {
  /**
   * Create a new task
   */
  async create(userId: string, taskData: CreateTaskDTO): Promise<Task> {
    const { name, keywords, targetWebsites, schedule } = taskData;
    
    const query = `
      INSERT INTO tasks (
        user_id, name, keywords, target_websites,
        schedule_type, schedule_time, schedule_day_of_week, schedule_day_of_month
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const values = [
      userId,
      name,
      keywords,
      targetWebsites,
      schedule.type,
      schedule.time || null,
      schedule.dayOfWeek || null,
      schedule.dayOfMonth || null
    ];
    
    const result = await pool.query(query, values);
    return this.mapRowToTask(result.rows[0]);
  }

  /**
   * Find task by ID
   */
  async findById(taskId: string): Promise<Task | null> {
    const query = 'SELECT * FROM tasks WHERE id = $1';
    const result = await pool.query(query, [taskId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToTask(result.rows[0]);
  }

  /**
   * Find all tasks for a user with filters and pagination
   */
  async findAll(userId: string, filters: TaskFilters = {}): Promise<PaginatedTasks> {
    const { status, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE user_id = $1';
    const values: any[] = [userId];
    let paramIndex = 2;
    
    if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      values.push(status);
      paramIndex++;
    }
    
    // Get total count
    const countQuery = `SELECT COUNT(*) FROM tasks ${whereClause}`;
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);
    
    // Get paginated results
    const query = `
      SELECT * FROM tasks
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    values.push(limit, offset);
    
    const result = await pool.query(query, values);
    const tasks = result.rows.map((row: any) => this.mapRowToTask(row));
    
    return {
      tasks,
      total,
      page,
      limit
    };
  }

  /**
   * Update task
   */
  async update(taskId: string, updates: UpdateTaskDTO): Promise<Task | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (updates.name !== undefined) {
      fields.push(`name = $${paramIndex}`);
      values.push(updates.name);
      paramIndex++;
    }
    
    if (updates.keywords !== undefined) {
      fields.push(`keywords = $${paramIndex}`);
      values.push(updates.keywords);
      paramIndex++;
    }
    
    if (updates.targetWebsites !== undefined) {
      fields.push(`target_websites = $${paramIndex}`);
      values.push(updates.targetWebsites);
      paramIndex++;
    }
    
    if (updates.schedule !== undefined) {
      fields.push(`schedule_type = $${paramIndex}`);
      values.push(updates.schedule.type);
      paramIndex++;
      
      fields.push(`schedule_time = $${paramIndex}`);
      values.push(updates.schedule.time || null);
      paramIndex++;
      
      fields.push(`schedule_day_of_week = $${paramIndex}`);
      values.push(updates.schedule.dayOfWeek || null);
      paramIndex++;
      
      fields.push(`schedule_day_of_month = $${paramIndex}`);
      values.push(updates.schedule.dayOfMonth || null);
      paramIndex++;
    }
    
    if (updates.status !== undefined) {
      fields.push(`status = $${paramIndex}`);
      values.push(updates.status);
      paramIndex++;
    }
    
    if (fields.length === 0) {
      return this.findById(taskId);
    }
    
    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(taskId);
    
    const query = `
      UPDATE tasks
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToTask(result.rows[0]);
  }

  /**
   * Update task status
   */
  async updateStatus(taskId: string, status: TaskStatus): Promise<Task | null> {
    const query = `
      UPDATE tasks
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    
    const result = await pool.query(query, [status, taskId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToTask(result.rows[0]);
  }

  /**
   * Update only the next execution time (without touching lastExecutedAt)
   */
  async updateNextExecutionTime(taskId: string, nextExecutionAt: Date): Promise<void> {
    const query = `
      UPDATE tasks
      SET next_execution_at = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;
    await pool.query(query, [nextExecutionAt, taskId]);
  }

  /**
   * Update task execution timestamps
   */
  async updateExecutionTimestamps(
    taskId: string,
    lastExecutedAt: Date,
    nextExecutionAt?: Date
  ): Promise<Task | null> {
    const query = `
      UPDATE tasks
      SET last_executed_at = $1, next_execution_at = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;
    
    const result = await pool.query(query, [lastExecutedAt, nextExecutionAt || null, taskId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToTask(result.rows[0]);
  }

  /**
   * Soft delete task (set status to 'deleted')
   */
  async delete(taskId: string): Promise<boolean> {
    const query = `
      UPDATE tasks
      SET status = 'deleted', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [taskId]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Find tasks that need to be executed
   */
  async findTasksToExecute(): Promise<Task[]> {
    const query = `
      SELECT * FROM tasks
      WHERE status = 'active'
        AND next_execution_at IS NOT NULL
        AND next_execution_at <= CURRENT_TIMESTAMP
      ORDER BY next_execution_at ASC
    `;
    
    const result = await pool.query(query);
    return result.rows.map((row: any) => this.mapRowToTask(row));
  }

  /**
   * Map database row to Task object
   */
  private mapRowToTask(row: any): Task {
    // created_at, updated_at, last_executed_at are stored as UTC in DB → append 'Z' to treat as UTC
    // next_execution_at is stored as local time (user's input) → return as-is string, no timezone conversion
    const toUtcDate = (val: string | null) => val ? new Date(val + 'Z') : null;
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      keywords: row.keywords,
      targetWebsites: row.target_websites,
      schedule: {
        type: row.schedule_type,
        time: row.schedule_time,
        dayOfWeek: row.schedule_day_of_week,
        dayOfMonth: row.schedule_day_of_month
      },
      status: row.status,
      createdAt: toUtcDate(row.created_at) as any,
      updatedAt: toUtcDate(row.updated_at) as any,
      lastExecutedAt: toUtcDate(row.last_executed_at) as any,
      // next_execution_at: stored as local time string, return raw so frontend displays it directly
      nextExecutionAt: row.next_execution_at
        ? row.next_execution_at.replace('T', ' ').substring(0, 16) // "YYYY-MM-DD HH:mm"
        : null
    };
  }
}
