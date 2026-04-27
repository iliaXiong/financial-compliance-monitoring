import { pool } from '../config/database';
import { Execution, ExecutionStatus, PaginatedExecutions } from '../types';

export class ExecutionRepository {
  /**
   * Create a new execution
   */
  async create(taskId: string): Promise<Execution> {
    const query = `
      INSERT INTO executions (task_id, status, start_time)
      VALUES ($1, 'running', CURRENT_TIMESTAMP)
      RETURNING *
    `;
    
    const result = await pool.query(query, [taskId]);
    return this.mapRowToExecution(result.rows[0]);
  }

  /**
   * Find execution by ID
   */
  async findById(executionId: string): Promise<Execution | null> {
    const query = 'SELECT * FROM executions WHERE id = $1';
    const result = await pool.query(query, [executionId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToExecution(result.rows[0]);
  }

  /**
   * Find all executions for a task with pagination
   */
  async findByTaskId(taskId: string, page: number = 1, limit: number = 20): Promise<PaginatedExecutions> {
    const offset = (page - 1) * limit;
    
    // Get total count
    const countQuery = 'SELECT COUNT(*) FROM executions WHERE task_id = $1';
    const countResult = await pool.query(countQuery, [taskId]);
    const total = parseInt(countResult.rows[0].count);
    
    // Get paginated results
    const query = `
      SELECT * FROM executions
      WHERE task_id = $1
      ORDER BY start_time DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await pool.query(query, [taskId, limit, offset]);
    const executions = result.rows.map((row: any) => this.mapRowToExecution(row));
    
    return {
      executions,
      total,
      page,
      limit
    };
  }

  /**
   * Find the most recent completed execution for a task
   */
  async findLastCompletedByTaskId(taskId: string): Promise<Execution | null> {
    const query = `
      SELECT * FROM executions
      WHERE task_id = $1 AND status = 'completed'
      ORDER BY start_time DESC
      LIMIT 1
    `;
    
    const result = await pool.query(query, [taskId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToExecution(result.rows[0]);
  }

  /**
   * Update execution status
   */
  async updateStatus(
    executionId: string,
    status: ExecutionStatus,
    errorMessage?: string
  ): Promise<Execution | null> {
    const query = `
      UPDATE executions
      SET status = $1, end_time = CURRENT_TIMESTAMP, error_message = $2
      WHERE id = $3
      RETURNING *
    `;
    
    const result = await pool.query(query, [status, errorMessage || null, executionId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToExecution(result.rows[0]);
  }

  /**
   * Mark execution as completed
   */
  async markCompleted(executionId: string): Promise<Execution | null> {
    return this.updateStatus(executionId, 'completed');
  }

  /**
   * Mark execution as failed
   */
  async markFailed(executionId: string, errorMessage: string): Promise<Execution | null> {
    return this.updateStatus(executionId, 'failed', errorMessage);
  }

  /**
   * Find executions that have been stuck in 'running' state for too long
   * @param timeoutMinutes - Number of minutes after which an execution is considered stuck
   * @returns Array of stuck executions
   */
  async findStuckExecutions(timeoutMinutes: number): Promise<Execution[]> {
    const query = `
      SELECT * FROM executions
      WHERE status = 'running'
        AND start_time < NOW() - INTERVAL '${timeoutMinutes} minutes'
      ORDER BY start_time ASC
    `;
    
    const result = await pool.query(query);
    return result.rows.map((row: any) => this.mapRowToExecution(row));
  }

  /**
   * Map database row to Execution object
   */
  private mapRowToExecution(row: any): Execution {
    const toUtcDate = (val: string | null) => val ? new Date(val + 'Z') : undefined;
    return {
      id: row.id,
      taskId: row.task_id,
      status: row.status,
      startTime: toUtcDate(row.start_time) as any,
      endTime: toUtcDate(row.end_time) as any,
      errorMessage: row.error_message,
      createdAt: toUtcDate(row.created_at) as any
    };
  }
}
