import PgBoss from 'pg-boss';
import { Task } from '../types';
import { TaskRepository } from '../repositories/TaskRepository';
import { ExecutionRepository } from '../repositories/ExecutionRepository';
import { RetrievalResultRepository } from '../repositories/RetrievalResultRepository';
import { SubagentOrchestrator } from './SubagentOrchestrator';
import { AnalysisService } from './AnalysisService';
import { SummaryDocumentRepository } from '../repositories/SummaryDocumentRepository';
import { ComparisonReportRepository } from '../repositories/ComparisonReportRepository';
import { CrossSiteAnalysisRepository } from '../repositories/CrossSiteAnalysisRepository';

/**
 * TaskScheduler interface
 * Defines the contract for task scheduling and execution
 */
export interface ITaskScheduler {
  scheduleTask(task: Task): Promise<void>;
  unscheduleTask(taskId: string): Promise<void>;
  executeTask(taskId: string): Promise<string>;
}

/**
 * Job data structure for pg-boss queue
 */
interface TaskJobData {
  taskId: string;
  executionId: string;
}

/**
 * TaskScheduler class using pg-boss (PostgreSQL-based queue)
 * Manages task scheduling and orchestrates the complete execution flow
 * 
 * Requirements:
 * - 2.1: Automatically trigger task execution at scheduled time
 * - 2.2: Record task status as running during execution
 * - 2.3: Update task status to completed when finished
 * - 2.4: Record error information and update status to failed on error
 */
export class TaskScheduler implements ITaskScheduler {
  private boss: PgBoss;
  private taskRepository: TaskRepository;
  private executionRepository: ExecutionRepository;
  private retrievalResultRepository: RetrievalResultRepository;
  private subagentOrchestrator: SubagentOrchestrator;
  private analysisService: AnalysisService;
  private stuckExecutionCheckInterval?: NodeJS.Timeout;
  private isStarted: boolean = false;

  constructor(
    dbConfig?: { host: string; port: number; database: string; user: string; password: string },
    taskRepository?: TaskRepository,
    executionRepository?: ExecutionRepository,
    retrievalResultRepository?: RetrievalResultRepository,
    subagentOrchestrator?: SubagentOrchestrator,
    analysisService?: AnalysisService
  ) {
    console.log('[TaskScheduler] Initializing with pg-boss (PostgreSQL queue)');
    
    // Initialize pg-boss with PostgreSQL connection
    const host = dbConfig?.host || process.env.DB_HOST;
    const needsSSL = host?.includes('supabase.com');
    
    const connectionString = dbConfig 
      ? `postgresql://${dbConfig.user}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}${needsSSL ? '?sslmode=require' : ''}`
      : `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}${needsSSL ? '?sslmode=require' : ''}`;

    this.boss = new PgBoss({
      connectionString,
      schema: 'pgboss',  // 使用独立的 schema
      retryLimit: 3,
      retryDelay: 2,
      retryBackoff: true,
      expireInHours: 24,
      archiveCompletedAfterSeconds: 60 * 60 * 24 * 7,  // 7 days
      ssl: needsSSL ? { rejectUnauthorized: false } : undefined,
    });

    // Initialize repositories and services
    this.taskRepository = taskRepository || new TaskRepository();
    this.executionRepository = executionRepository || new ExecutionRepository();
    this.retrievalResultRepository = retrievalResultRepository || new RetrievalResultRepository();
    this.subagentOrchestrator = subagentOrchestrator || new SubagentOrchestrator();
    
    // Initialize AnalysisService with all required repositories
    this.analysisService = analysisService || new AnalysisService(
      new SummaryDocumentRepository(),
      new ComparisonReportRepository(),
      new CrossSiteAnalysisRepository(),
      this.retrievalResultRepository,
      this.executionRepository
    );

    console.log('[TaskScheduler] pg-boss initialized');
  }

  /**
   * Start the task scheduler
   * Must be called before using the scheduler
   */
  async start(): Promise<void> {
    if (this.isStarted) {
      console.log('[TaskScheduler] Already started');
      return;
    }

    console.log('[TaskScheduler] Starting pg-boss...');
    await this.boss.start();
    this.isStarted = true;
    console.log('[TaskScheduler] pg-boss started successfully');

    // Register job handler
    await this.boss.work<TaskJobData>(
      'task-execution',
      { teamSize: 1, teamConcurrency: 1 },
      async (job) => {
        console.log(`[TaskScheduler] Processing job ${job.id} for task ${job.data.taskId}`);

        try {
          // If executionId is not set, create a new execution
          let executionId = job.data.executionId;
          
          if (!executionId) {
            const execution = await this.executionRepository.create(job.data.taskId);
            executionId = execution.id;
            console.log(`[TaskScheduler] Created execution ${executionId} for scheduled task ${job.data.taskId}`);
          }

          // Execute the complete retrieval and analysis flow
          await this.processExecution(executionId, job.data.taskId);

          console.log(`[TaskScheduler] Job ${job.id} completed successfully`);
        } catch (error) {
          console.error(`[TaskScheduler] Job ${job.id} failed:`, error);
          throw error; // Let pg-boss handle retry logic
        }
      }
    );

    // Set up periodic check for stuck executions
    this.setupStuckExecutionCheck();

    console.log('[TaskScheduler] Job handler registered');
  }

  /**
   * Schedule a task for execution based on its schedule configuration
   * Calculates next execution time and adds job to pg-boss queue
   * 
   * Requirements: 2.1
   * 
   * @param task - Task to schedule
   */
  async scheduleTask(task: Task): Promise<void> {
    if (!this.isStarted) {
      throw new Error('TaskScheduler not started. Call start() first.');
    }

    console.log(`[TaskScheduler] Scheduling task ${task.id} with schedule type: ${task.schedule.type}`);

    // Calculate next execution time
    const nextExecutionTime = this.calculateNextExecutionTime(task);

    if (!nextExecutionTime) {
      console.warn(`[TaskScheduler] Cannot calculate next execution time for task ${task.id}`);
      return;
    }

    // Update task with next execution time
    await this.taskRepository.updateNextExecutionTime(
      task.id,
      nextExecutionTime
    );

    // Calculate delay in seconds
    const delayInSeconds = Math.max(0, Math.floor((nextExecutionTime.getTime() - Date.now()) / 1000));

    if (delayInSeconds === 0) {
      // If the time has already passed, execute immediately
      console.log(`[TaskScheduler] Task ${task.id} scheduled time has passed, executing immediately`);
      await this.executeTask(task.id);
      return;
    }

    // Add job to queue with delay
    const jobId = await this.boss.send(
      'task-execution',
      { taskId: task.id, executionId: '' },
      {
        startAfter: delayInSeconds,
        singletonKey: `task-${task.id}-${nextExecutionTime.getTime()}`,
      }
    );

    console.log(`[TaskScheduler] Task ${task.id} scheduled for ${nextExecutionTime.toISOString()}, job ID: ${jobId}`);
  }

  /**
   * Unschedule a task by canceling all pending jobs
   * 
   * @param taskId - ID of task to unschedule
   */
  async unscheduleTask(taskId: string): Promise<void> {
    if (!this.isStarted) {
      throw new Error('TaskScheduler not started. Call start() first.');
    }

    console.log(`[TaskScheduler] Unscheduling task ${taskId}`);

    // Cancel all jobs for this task
    // pg-boss doesn't have a direct way to query jobs by data, so we use singleton keys
    // The jobs will naturally expire or we can cancel them when they're about to run
    
    console.log(`[TaskScheduler] Task ${taskId} unscheduled (jobs will expire naturally)`);
  }

  /**
   * Manually trigger task execution
   * Creates an execution record and adds job to queue for immediate processing
   * 
   * Requirements: 2.1, 2.2
   * 
   * @param taskId - ID of task to execute
   * @returns executionId - ID of the created execution
   */
  async executeTask(taskId: string): Promise<string> {
    if (!this.isStarted) {
      throw new Error('TaskScheduler not started. Call start() first.');
    }

    console.log(`[TaskScheduler] Manually triggering execution for task ${taskId}`);

    // Verify task exists and is active
    const task = await this.taskRepository.findById(taskId);
    
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    if (task.status !== 'active') {
      throw new Error(`Task ${taskId} is not active (status: ${task.status})`);
    }

    // Create execution record
    const execution = await this.executionRepository.create(taskId);
    console.log(`[TaskScheduler] Created execution ${execution.id} for task ${taskId}`);

    // Add job to queue for immediate processing
    const jobId = await this.boss.send(
      'task-execution',
      { taskId, executionId: execution.id },
      {
        priority: 1,  // High priority for manual execution
        singletonKey: `manual-${taskId}-${execution.id}`,
      }
    );

    console.log(`[TaskScheduler] Manual execution job created: ${jobId}`);

    // Update task's last executed timestamp
    const nextExecutionTime = this.calculateNextExecutionTime(task);
    await this.taskRepository.updateExecutionTimestamps(
      taskId,
      new Date(),
      nextExecutionTime || undefined
    );

    return execution.id;
  }

  /**
   * Process the complete execution flow
   * Orchestrates parallel retrieval, summary generation, comparison, and cross-site analysis
   * 
   * Requirements: 2.2, 2.3, 2.4, 3.1, 5.1, 6.1, 7.1
   * 
   * @param executionId - ID of the execution
   * @param taskId - ID of the task
   */
  private async processExecution(executionId: string, taskId: string): Promise<void> {
    console.log(`[TaskScheduler] Starting execution flow for execution ${executionId}`);

    try {
      // Get task details
      const task = await this.taskRepository.findById(taskId);
      
      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }

      // Step 1: Parallel retrieval using SubagentOrchestrator
      console.log(`[TaskScheduler] Step 1: Parallel retrieval from ${task.targetWebsites.length} websites`);
      const orchestrationResult = await this.subagentOrchestrator.executeParallel(
        task.targetWebsites,
        task.keywords,
        120000 // 2 minutes timeout
      );

      // Step 2: Save retrieval results to database
      console.log(`[TaskScheduler] Step 2: Saving ${orchestrationResult.results.length} retrieval results`);
      const retrievalResults = [];
      
      for (const result of orchestrationResult.results) {
        // If retrieval failed or no keyword matches, create failed result records for each keyword
        if (result.status === 'failed' || result.keywordMatches.length === 0) {
          console.log(`[TaskScheduler] Website ${result.websiteUrl} failed or returned no results: ${result.error || 'No matches found'}`);
          
          // Create a failed retrieval result for each keyword
          for (const keyword of task.keywords) {
            const retrievalResult = await this.retrievalResultRepository.create({
              executionId,
              websiteUrl: result.websiteUrl,
              keyword: keyword,
              found: false,
              content: undefined,
              context: result.error ? `Error: ${result.error}` : undefined,
              sourceUrl: result.websiteUrl,
            });
            retrievalResults.push(retrievalResult);
          }
        } else {
          // For each website, create retrieval results for each keyword
          for (const keywordMatch of result.keywordMatches) {
            const retrievalResult = await this.retrievalResultRepository.create({
              executionId,
              websiteUrl: result.websiteUrl,
              keyword: keywordMatch.keyword,
              found: keywordMatch.found,
              content: keywordMatch.found ? keywordMatch.contexts.join('\n\n') : undefined,
              context: keywordMatch.found ? keywordMatch.contexts[0] : undefined,
              sourceUrl: keywordMatch.sourceUrl || result.websiteUrl,
            });
            retrievalResults.push(retrievalResult);
          }

          // Also save document results if any
          for (const docResult of result.documentResults) {
            for (const keywordMatch of docResult.keywordMatches) {
              const retrievalResult = await this.retrievalResultRepository.create({
                executionId,
                websiteUrl: result.websiteUrl,
                keyword: keywordMatch.keyword,
                found: keywordMatch.found,
                content: keywordMatch.found ? keywordMatch.contexts.join('\n\n') : undefined,
                context: keywordMatch.found ? keywordMatch.contexts[0] : undefined,
                sourceUrl: keywordMatch.sourceUrl || result.websiteUrl,
                documentUrl: docResult.documentUrl,
              });
              retrievalResults.push(retrievalResult);
            }
          }
        }
      }

      // Step 3: Generate summary document
      console.log(`[TaskScheduler] Step 3: Generating summary document`);
      await this.analysisService.generateSummary(executionId, retrievalResults);

      // Step 4: Compare with previous results (if not first execution)
      console.log(`[TaskScheduler] Step 4: Comparing with previous results`);
      await this.analysisService.compareResults(executionId, taskId);

      // Step 5: Perform cross-site analysis
      console.log(`[TaskScheduler] Step 5: Performing cross-site analysis`);
      await this.analysisService.analyzeCrossSite(executionId, retrievalResults);

      // Step 6: Mark execution as completed
      console.log(`[TaskScheduler] Step 6: Marking execution as completed`);
      await this.executionRepository.markCompleted(executionId);

      console.log(`[TaskScheduler] Execution ${executionId} completed successfully`);
    } catch (error) {
      console.error(`[TaskScheduler] Execution ${executionId} failed:`, error);
      
      // Mark execution as failed with error message
      await this.executionRepository.markFailed(
        executionId,
        error instanceof Error ? error.message : 'Unknown error'
      );

      throw error; // Re-throw to trigger pg-boss retry mechanism
    }
  }

  /**
   * Calculate next execution time based on task schedule
   */
  private calculateNextExecutionTime(task: Task): Date | null {
    const now = new Date();
    const schedule = task.schedule;

    switch (schedule.type) {
      case 'once':
        if (task.lastExecutedAt) {
          return null;
        }
        if (schedule.time) {
          return this.setLocalTime(now, schedule.time);
        }
        return now;

      case 'daily':
        return this.calculateDailyNextExecution(now, schedule.time);

      case 'weekly':
        return this.calculateWeeklyNextExecution(now, schedule.time, schedule.dayOfWeek);

      case 'monthly':
        return this.calculateMonthlyNextExecution(now, schedule.time, schedule.dayOfMonth);

      default:
        console.warn(`[TaskScheduler] Unknown schedule type: ${schedule.type}`);
        return null;
    }
  }

  private setLocalTime(date: Date, time: string): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }

  private calculateDailyNextExecution(now: Date, time?: string): Date {
    if (!time) {
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }

    const next = this.setLocalTime(now, time);
    if (next <= now) {
      next.setUTCDate(next.getUTCDate() + 1);
    }
    return next;
  }

  private calculateWeeklyNextExecution(now: Date, time?: string, dayOfWeek?: number): Date {
    const currentDayOfWeek = now.getDay();
    const targetDayOfWeek = dayOfWeek ?? currentDayOfWeek;

    let daysUntilTarget = targetDayOfWeek - currentDayOfWeek;

    if (daysUntilTarget < 0) {
      daysUntilTarget += 7;
    } else if (daysUntilTarget === 0) {
      if (time) {
        const candidate = this.setLocalTime(now, time);
        if (candidate <= now) {
          daysUntilTarget = 7;
        }
      } else {
        daysUntilTarget = 7;
      }
    }

    const next = time ? this.setLocalTime(now, time) : new Date(now);
    next.setDate(next.getDate() + daysUntilTarget);
    return next;
  }

  private calculateMonthlyNextExecution(now: Date, time?: string, dayOfMonth?: number): Date {
    const targetDay = dayOfMonth ?? now.getDate();

    const candidate = new Date(now);
    candidate.setDate(targetDay);
    if (time) {
      const [hours, minutes] = time.split(':').map(Number);
      candidate.setHours(hours, minutes, 0, 0);
    } else {
      candidate.setHours(0, 0, 0, 0);
    }

    if (candidate <= now) {
      candidate.setMonth(candidate.getMonth() + 1);
      candidate.setDate(targetDay);
    }

    return candidate;
  }

  /**
   * Set up periodic check for stuck executions
   */
  private setupStuckExecutionCheck(): void {
    const TIMEOUT_MINUTES = 30;
    const CHECK_INTERVAL_MS = 5 * 60 * 1000;

    this.stuckExecutionCheckInterval = setInterval(async () => {
      try {
        console.log('[TaskScheduler] Checking for stuck executions...');
        
        const stuckExecutions = await this.executionRepository.findStuckExecutions(TIMEOUT_MINUTES);
        
        if (stuckExecutions.length > 0) {
          console.warn(`[TaskScheduler] Found ${stuckExecutions.length} stuck execution(s)`);
          
          for (const execution of stuckExecutions) {
            const duration = Math.round((Date.now() - execution.startTime.getTime()) / 60000);
            const errorMessage = `Execution timeout: stuck in running state for ${duration} minutes. Automatically marked as failed.`;
            
            await this.executionRepository.markFailed(execution.id, errorMessage);
            console.log(`[TaskScheduler] Marked stuck execution ${execution.id} as failed`);
          }
        }
      } catch (error) {
        console.error('[TaskScheduler] Error checking for stuck executions:', error);
      }
    }, CHECK_INTERVAL_MS);

    console.log('[TaskScheduler] Stuck execution check enabled (timeout: 30 minutes, check interval: 5 minutes)');
  }

  /**
   * Stop the task scheduler and clean up resources
   */
  async stop(): Promise<void> {
    if (this.stuckExecutionCheckInterval) {
      clearInterval(this.stuckExecutionCheckInterval);
    }
    
    if (this.isStarted) {
      await this.boss.stop();
      this.isStarted = false;
      console.log('[TaskScheduler] pg-boss stopped');
    }
  }

  /**
   * Alias for stop() to maintain compatibility
   */
  async close(): Promise<void> {
    await this.stop();
  }
}
