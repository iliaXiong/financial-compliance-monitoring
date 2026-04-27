import { ContentRetriever, IContentRetriever, ContentRetrievalResult } from './ContentRetriever';

/**
 * SubagentOrchestrator interface
 * Defines the contract for orchestrating parallel website retrieval tasks
 */
export interface ISubagentOrchestrator {
  executeParallel(
    websites: string[],
    keywords: string[],
    timeout?: number
  ): Promise<SubagentExecutionResult>;
}

/**
 * Result of parallel subagent execution
 */
export interface SubagentExecutionResult {
  results: ContentRetrievalResult[];
  totalWebsites: number;
  successCount: number;
  failedCount: number;
  timedOut: boolean;
  executionTime: number; // milliseconds
  completedAt: Date;
}

/**
 * Subagent task wrapper
 * Represents a single website retrieval task
 */
interface SubagentTask {
  websiteUrl: string;
  keywords: string[];
  promise: Promise<ContentRetrievalResult>;
}

/**
 * SubagentOrchestrator class
 * Orchestrates parallel retrieval from multiple websites with timeout control
 * 
 * Requirements:
 * - 7.1: Create independent subagent for each website
 * - 7.2: Execute all subagents in parallel
 * - 7.3: Collect all results
 * - 7.4: Wait for all subagents to complete or timeout
 */
export class SubagentOrchestrator implements ISubagentOrchestrator {
  private readonly contentRetriever: IContentRetriever;
  private readonly defaultTimeout: number = 120000; // 2 minutes default timeout

  constructor(contentRetriever?: IContentRetriever) {
    this.contentRetriever = contentRetriever || new ContentRetriever();
  }

  /**
   * Execute parallel retrieval from multiple websites
   * Creates independent subagent for each website and executes them in parallel
   * 
   * @param websites - Array of website URLs to retrieve from
   * @param keywords - Array of keywords to search for
   * @param timeout - Optional timeout in milliseconds (default: 120000ms / 2 minutes)
   * @returns SubagentExecutionResult with all results and metadata
   */
  async executeParallel(
    websites: string[],
    keywords: string[],
    timeout: number = this.defaultTimeout
  ): Promise<SubagentExecutionResult> {
    const startTime = Date.now();
    
    console.log(
      `[SubagentOrchestrator] Starting parallel execution for ${websites.length} websites with timeout ${timeout}ms`
    );

    // Validate inputs
    if (websites.length === 0) {
      throw new Error('At least one website URL is required');
    }
    if (keywords.length === 0) {
      throw new Error('At least one keyword is required');
    }

    // Create subagent tasks for each website
    const subagentTasks = this.createSubagentTasks(websites, keywords);

    // Execute all subagents in parallel with timeout control
    const results = await this.executeWithTimeout(subagentTasks, timeout);

    // Calculate execution metadata
    const executionTime = Date.now() - startTime;
    const successCount = results.filter((r) => r.status === 'success').length;
    const failedCount = results.filter((r) => r.status === 'failed').length;
    const timedOut = executionTime >= timeout;

    console.log(
      `[SubagentOrchestrator] Execution completed in ${executionTime}ms: ${successCount} succeeded, ${failedCount} failed, timedOut: ${timedOut}`
    );

    return {
      results,
      totalWebsites: websites.length,
      successCount,
      failedCount,
      timedOut,
      executionTime,
      completedAt: new Date(),
    };
  }

  /**
   * Create subagent tasks for each website
   * Each task is an independent retrieval operation
   * 
   * Requirement 7.1: Create independent subagent for each website
   * 
   * @param websites - Array of website URLs
   * @param keywords - Array of keywords to search for
   * @returns Array of SubagentTask
   */
  private createSubagentTasks(
    websites: string[],
    keywords: string[]
  ): SubagentTask[] {
    console.log(
      `[SubagentOrchestrator] Creating ${websites.length} subagent tasks`
    );

    return websites.map((websiteUrl) => ({
      websiteUrl,
      keywords,
      promise: this.contentRetriever.retrieveFromWebsite(websiteUrl, keywords),
    }));
  }

  /**
   * Execute all subagent tasks with timeout control
   * Waits for all tasks to complete or timeout to be reached
   * 
   * Requirements:
   * - 7.2: Execute all subagents in parallel
   * - 7.3: Collect all results
   * - 7.4: Wait for all subagents to complete or timeout
   * 
   * @param tasks - Array of SubagentTask to execute
   * @param timeout - Timeout in milliseconds
   * @returns Array of ContentRetrievalResult
   */
  private async executeWithTimeout(
    tasks: SubagentTask[],
    timeout: number
  ): Promise<ContentRetrievalResult[]> {
    console.log(
      `[SubagentOrchestrator] Executing ${tasks.length} tasks in parallel with ${timeout}ms timeout`
    );

    // Create a timeout promise that rejects after the specified duration
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Execution timeout after ${timeout}ms`));
      }, timeout);
    });

    try {
      // Race between all tasks completing and timeout
      // Promise.allSettled ensures we get results from all tasks even if some fail
      const settledResults = await Promise.race([
        Promise.allSettled(tasks.map((task) => task.promise)),
        timeoutPromise,
      ]);

      // Extract results from settled promises
      return this.collectResults(tasks, settledResults);
    } catch (error) {
      // Timeout occurred - collect whatever results are available
      console.warn(
        `[SubagentOrchestrator] Timeout reached, collecting partial results`
      );

      // Wait a bit for any in-flight requests to complete
      await this.sleep(100);

      // Return partial results with timeout errors for incomplete tasks
      return this.collectPartialResults(tasks);
    }
  }

  /**
   * Collect results from settled promises
   * 
   * @param tasks - Original subagent tasks
   * @param settledResults - Results from Promise.allSettled
   * @returns Array of ContentRetrievalResult
   */
  private collectResults(
    tasks: SubagentTask[],
    settledResults: PromiseSettledResult<ContentRetrievalResult>[]
  ): ContentRetrievalResult[] {
    return settledResults.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        // Promise was rejected - create a failed result
        const task = tasks[index];
        console.error(
          `[SubagentOrchestrator] Task failed for ${task.websiteUrl}:`,
          result.reason
        );

        return {
          websiteUrl: task.websiteUrl,
          status: 'failed',
          keywordMatches: [],
          documentResults: [],
          error: result.reason?.message || 'Unknown error',
          retrievedAt: new Date(),
        };
      }
    });
  }

  /**
   * Collect partial results when timeout occurs
   * Creates failed results for tasks that didn't complete
   * 
   * @param tasks - Array of SubagentTask
   * @returns Array of ContentRetrievalResult with timeout errors for incomplete tasks
   */
  private async collectPartialResults(
    tasks: SubagentTask[]
  ): Promise<ContentRetrievalResult[]> {
    const results: ContentRetrievalResult[] = [];

    for (const task of tasks) {
      try {
        // Check if the promise has already resolved
        const result = await Promise.race([
          task.promise,
          Promise.reject(new Error('timeout')),
        ]);
        results.push(result);
      } catch (error) {
        // Task didn't complete in time or failed
        console.warn(
          `[SubagentOrchestrator] Task incomplete for ${task.websiteUrl}`
        );

        results.push({
          websiteUrl: task.websiteUrl,
          status: 'failed',
          keywordMatches: [],
          documentResults: [],
          error: 'Execution timeout - task did not complete in time',
          retrievedAt: new Date(),
        });
      }
    }

    return results;
  }

  /**
   * Sleep for a specified duration
   * @param ms - Duration in milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
