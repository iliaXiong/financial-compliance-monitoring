import { Queue, Worker, Job } from 'bullmq';
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
 * Job data structure for Bull queue
 */
interface TaskJobData {
  taskId: string;
  executionId: string;
}

/**
 * TaskScheduler class
 * Manages task scheduling using Bull queue and orchestrates the complete execution flow
 * 
 * Requirements:
 * - 2.1: Automatically trigger task execution at scheduled time
 * - 2.2: Record task status as running during execution
 * - 2.3: Update task status to completed when finished
 * - 2.4: Record error information and update status to failed on error
 */
export class TaskScheduler implements ITaskScheduler {
  private taskQueue: Queue<TaskJobData>;
  private taskWorker: Worker<TaskJobData>;
  private taskRepository: TaskRepository;
  private executionRepository: ExecutionRepository;
  private retrievalResultRepository: RetrievalResultRepository;
  private subagentOrchestrator: SubagentOrchestrator;
  private analysisService: AnalysisService;
  private stuckExecutionCheckInterval?: NodeJS.Timeout;

  constructor(
    redisConfig?: { host: string; port: number; password?: string },
    taskRepository?: TaskRepository,
    executionRepository?: ExecutionRepository,
    retrievalResultRepository?: RetrievalResultRepository,
    subagentOrchestrator?: SubagentOrchestrator,
    analysisService?: AnalysisService,
    queueName?: string  // Allow tests to use a separate queue to avoid interfering with production
  ) {
    console.log('[TaskScheduler] Constructor called, queueName:', queueName || 'task-execution');
    
    // Initialize BullMQ connection
    const connection = {
      host: redisConfig?.host || process.env.REDIS_HOST || 'localhost',
      port: redisConfig?.port || parseInt(process.env.REDIS_PORT || '6379'),
      password: redisConfig?.password || process.env.REDIS_PASSWORD || undefined,
    };

    // Create Queue (for adding jobs)
    this.taskQueue = new Queue<TaskJobData>(queueName || 'task-execution', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: false,
        removeOnFail: false,
      },
    });

    console.log('[TaskScheduler] BullMQ queue created');

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

    // Create Worker (for processing jobs) - separate from Queue
    this.taskWorker = new Worker<TaskJobData>(
      queueName || 'task-execution',
      async (job: Job<TaskJobData>) => {
        console.log(`[TaskScheduler] ⚡ WORKER PROCESSING job ${job.id}`);
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
          return { success: true, executionId };
        } catch (error) {
          console.error(`[TaskScheduler] Job ${job.id} failed:`, error);
          throw error; // Let BullMQ handle retry logic
        }
      },
      {
        connection,
        concurrency: 1, // Process one job at a time
      }
    );

    console.log('[TaskScheduler] BullMQ worker created with concurrency: 1');

    // Set up event listeners on worker
    this.setupWorkerEventListeners();

    // Set up periodic check for stuck executions
    this.setupStuckExecutionCheck();

    console.log('[TaskScheduler] Initialized with BullMQ');
  }

  /**
   * Schedule a task for execution based on its schedule configuration
   * Calculates next execution time and adds job to Bull queue
   * 
   * Requirements: 2.1
   * 
   * @param task - Task to schedule
   */
  async scheduleTask(task: Task): Promise<void> {
    console.log(`[TaskScheduler] Scheduling task ${task.id} with schedule type: ${task.schedule.type}`);

    // Calculate next execution time
    const nextExecutionTime = this.calculateNextExecutionTime(task);

    if (!nextExecutionTime) {
      console.warn(`[TaskScheduler] Cannot calculate next execution time for task ${task.id}`);
      return;
    }

    // Update task with next execution time (only update nextExecutionAt, not lastExecutedAt)
    await this.taskRepository.updateNextExecutionTime(
      task.id,
      nextExecutionTime
    );

    // Calculate delay in milliseconds
    const delay = nextExecutionTime.getTime() - Date.now();

    if (delay < 0) {
      // If the time has already passed, execute immediately
      console.log(`[TaskScheduler] Task ${task.id} scheduled time has passed, executing immediately`);
      await this.executeTask(task.id);
      return;
    }

    // Add job to queue with delay
    await this.taskQueue.add(
      'scheduled-task',
      { taskId: task.id, executionId: '' }, // executionId will be set during execution
      {
        delay,
        jobId: `task-${task.id}-${nextExecutionTime.getTime()}`, // Unique job ID
      }
    );

    console.log(`[TaskScheduler] Task ${task.id} scheduled for ${nextExecutionTime.toISOString()}`);
  }

  /**
   * Unschedule a task by removing all pending jobs from the queue
   * 
   * @param taskId - ID of task to unschedule
   */
  async unscheduleTask(taskId: string): Promise<void> {
    console.log(`[TaskScheduler] Unscheduling task ${taskId}`);

    // Find all jobs for this task
    const jobs = await this.taskQueue.getJobs(['waiting', 'delayed']);
    
    for (const job of jobs) {
      if (job.data.taskId === taskId) {
        await job.remove();
        console.log(`[TaskScheduler] Removed job ${job.id} for task ${taskId}`);
      }
    }
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
    await this.taskQueue.add(
      'execute-task',
      { taskId, executionId: execution.id },
      {
        priority: 1, // High priority for manual execution
        jobId: `manual-${taskId}-${execution.id}`,
      }
    );

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
   * Set up BullMQ worker event listeners
   */
  private setupWorkerEventListeners(): void {
      console.log('[TaskScheduler] Setting up worker event listeners...');

      this.taskWorker.on('completed', (job: Job) => {
        console.log(`[TaskScheduler] Job ${job.id} completed`);
      });

      this.taskWorker.on('failed', async (job: Job | undefined, error: Error) => {
        console.error(`[TaskScheduler] Job ${job?.id} failed:`, error.message);

        // If all retries exhausted, mark execution as failed
        if (job && job.attemptsMade >= (job.opts.attempts || 3)) {
          const executionId = job.data.executionId;
          if (executionId) {
            await this.executionRepository.markFailed(
              executionId,
              error.message || 'Unknown error after max retries'
            );
          }
        }
      });

      this.taskWorker.on('active', (job: Job) => {
        console.log(`[TaskScheduler] Job ${job.id} is now active`);
      });

      this.taskWorker.on('stalled', (jobId: string) => {
        console.log(`[TaskScheduler] Job ${jobId} has stalled`);
      });

      this.taskWorker.on('progress', (job: Job, progress: any) => {
        console.log(`[TaskScheduler] Job ${job.id} progress:`, progress);
      });

      this.taskWorker.on('error', (error: Error) => {
        console.error('[TaskScheduler] Worker error:', error);
      });

      console.log('[TaskScheduler] Worker event listeners registered');
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
              sourceUrl: keywordMatch.sourceUrl || result.websiteUrl, // Use sourceUrl from KeywordMatch, fallback to websiteUrl
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
                sourceUrl: keywordMatch.sourceUrl || result.websiteUrl, // Use sourceUrl from KeywordMatch, fallback to websiteUrl
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

      throw error; // Re-throw to trigger Bull retry mechanism
    }
  }

  /**
   * Calculate next execution time based on task schedule
   * 
   * @param task - Task with schedule configuration
   * @returns Next execution time or null if schedule type is 'once' and already executed
   */
  private calculateNextExecutionTime(task: Task): Date | null {
    const now = new Date();
    const schedule = task.schedule;

    switch (schedule.type) {
      case 'once':
        // For 'once' type, only execute if not already executed
        if (task.lastExecutedAt) {
          return null; // Already executed
        }
        // If a specific time is set, schedule for that local time today
        if (schedule.time) {
          return this.setLocalTime(now, schedule.time);
        }
        return now; // No time specified, execute immediately

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

  /**
   * Parse time string "HH:mm" (in local timezone, Asia/Shanghai via TZ env var)
   * and set it on a Date object using local time methods.
   */
  private setLocalTime(date: Date, time: string): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }

  /**
   * Calculate next execution time for daily schedule
   */
  private calculateDailyNextExecution(now: Date, time?: string): Date {
    if (!time) {
      // No time specified, execute 24h from now
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }

    const next = this.setLocalTime(now, time);

    // If the time has already passed today, schedule for tomorrow
    if (next <= now) {
      next.setUTCDate(next.getUTCDate() + 1);
    }

    return next;
  }

  /**
   * Calculate next execution time for weekly schedule
   */
  private calculateWeeklyNextExecution(now: Date, time?: string, dayOfWeek?: number): Date {
    const currentDayOfWeek = now.getDay(); // local day with TZ=Asia/Shanghai
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

  /**
   * Calculate next execution time for monthly schedule
   */
  private calculateMonthlyNextExecution(now: Date, time?: string, dayOfMonth?: number): Date {
    const targetDay = dayOfMonth ?? now.getDate();

    // Build candidate for this month
    const candidate = new Date(now);
    candidate.setDate(targetDay);
    if (time) {
      const [hours, minutes] = time.split(':').map(Number);
      candidate.setHours(hours, minutes, 0, 0);
    } else {
      candidate.setHours(0, 0, 0, 0);
    }

    // If already passed, move to next month
    if (candidate <= now) {
      candidate.setMonth(candidate.getMonth() + 1);
      candidate.setDate(targetDay);
    }

    return candidate;
  }

  /**
   * Set up periodic check for stuck executions
   * Runs every 5 minutes to detect and mark executions that have been running for too long
   */
  private setupStuckExecutionCheck(): void {
    const TIMEOUT_MINUTES = 30; // Mark executions as failed if running for more than 30 minutes
    const CHECK_INTERVAL_MS = 5 * 60 * 1000; // Check every 5 minutes

    this.stuckExecutionCheckInterval = setInterval(async () => {
      try {
        console.log('[TaskScheduler] Checking for stuck executions...');
        
        // Find executions that have been running for too long
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
   * Close the queue and worker, clean up resources
   */
  async close(): Promise<void> {
    if (this.stuckExecutionCheckInterval) {
      clearInterval(this.stuckExecutionCheckInterval);
    }
    await this.taskWorker.close();
    await this.taskQueue.close();
    console.log('[TaskScheduler] Queue and worker closed');
  }
}
