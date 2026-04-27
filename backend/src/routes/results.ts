import { Router, Response } from 'express';
import { 
  ExecutionRepository,
  RetrievalResultRepository,
  SummaryDocumentRepository,
  ComparisonReportRepository,
  CrossSiteAnalysisRepository,
  OriginalContentRepository,
  TaskRepository
} from '../repositories';
import { authenticate, AuthRequest, asyncHandler, AppError } from '../middleware';

const router = Router();
const executionRepo = new ExecutionRepository();
const retrievalResultRepo = new RetrievalResultRepository();
const summaryDocRepo = new SummaryDocumentRepository();
const comparisonReportRepo = new ComparisonReportRepository();
const crossSiteAnalysisRepo = new CrossSiteAnalysisRepository();
const originalContentRepo = new OriginalContentRepository();
const taskRepo = new TaskRepository();

/**
 * GET /api/executions/latest
 * Get the most recent execution across all user's tasks
 * 
 * Requirements: 9.1
 */
router.get(
  '/executions/latest',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;

    try {
      // Get all user's tasks
      const tasksResult = await taskRepo.findAll(userId, {});
      const tasks = tasksResult.tasks;
      
      if (tasks.length === 0) {
        throw new AppError(404, 'NOT_FOUND', '没有找到任何任务');
      }

      // Get the most recent execution across all tasks
      let latestExecution = null;
      let latestTime = new Date(0);

      for (const task of tasks) {
        const executions = await executionRepo.findByTaskId(task.id, 1, 1);
        if (executions.executions.length > 0) {
          const execution = executions.executions[0];
          const executionTime = new Date(execution.startTime);
          if (executionTime > latestTime) {
            latestTime = executionTime;
            latestExecution = execution;
          }
        }
      }

      if (!latestExecution) {
        throw new AppError(404, 'NOT_FOUND', '没有找到任何执行记录');
      }

      // Get retrieval results
      const results = await retrievalResultRepo.findByExecutionId(latestExecution.id);

      // Get summary document (if exists)
      const summary = await summaryDocRepo.findByExecutionId(latestExecution.id);

      // Get comparison reports (if exists)
      const comparison = await comparisonReportRepo.findByCurrentExecutionId(latestExecution.id);

      // Get cross-site analysis (if exists)
      const crossSiteAnalysis = await crossSiteAnalysisRepo.findByExecutionId(latestExecution.id);

      res.json({
        execution: latestExecution,
        results,
        summary: summary || undefined,
        comparison: comparison.length > 0 ? comparison : undefined,
        crossSiteAnalysis: crossSiteAnalysis.length > 0 ? crossSiteAnalysis : undefined
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw error;
    }
  })
);

/**
 * GET /api/tasks/:taskId/executions
 * Get execution history for a task with pagination
 * 
 * Requirements: 9.1
 */
router.get(
  '/tasks/:taskId/executions',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const { taskId } = req.params;
    
    // Parse pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      throw new AppError(400, 'INVALID_PARAMETERS', '分页参数无效');
    }

    try {
      // Verify task belongs to user
      const task = await taskRepo.findById(taskId);
      if (!task) {
        throw new AppError(404, 'NOT_FOUND', '任务不存在');
      }
      if (task.userId !== userId) {
        throw new AppError(403, 'FORBIDDEN', '无权访问此任务');
      }

      // Get executions
      const result = await executionRepo.findByTaskId(taskId, page, limit);
      res.json(result);
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw error;
    }
  })
);

/**
 * GET /api/executions/:executionId
 * Get execution details including all related data
 * 
 * Requirements: 9.1, 9.2
 */
router.get(
  '/executions/:executionId',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const { executionId } = req.params;

    try {
      // Get execution
      const execution = await executionRepo.findById(executionId);
      if (!execution) {
        throw new AppError(404, 'NOT_FOUND', '执行记录不存在');
      }

      // Verify task belongs to user
      const task = await taskRepo.findById(execution.taskId);
      if (!task) {
        throw new AppError(404, 'NOT_FOUND', '关联任务不存在');
      }
      if (task.userId !== userId) {
        throw new AppError(403, 'FORBIDDEN', '无权访问此执行记录');
      }

      // Get retrieval results
      const results = await retrievalResultRepo.findByExecutionId(executionId);

      // Get summary document (if exists)
      const summary = await summaryDocRepo.findByExecutionId(executionId);

      // Get comparison reports (if exists)
      const comparison = await comparisonReportRepo.findByCurrentExecutionId(executionId);

      // Get cross-site analysis (if exists)
      const crossSiteAnalysis = await crossSiteAnalysisRepo.findByExecutionId(executionId);

      res.json({
        execution,
        results,
        summary: summary || undefined,
        comparison: comparison.length > 0 ? comparison : undefined,
        crossSiteAnalysis: crossSiteAnalysis.length > 0 ? crossSiteAnalysis : undefined
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw error;
    }
  })
);

/**
 * GET /api/executions/:executionId/summary
 * Get summary document for an execution
 * 
 * Requirements: 9.2, 9.3
 */
router.get(
  '/executions/:executionId/summary',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const { executionId } = req.params;

    try {
      // Get execution
      const execution = await executionRepo.findById(executionId);
      if (!execution) {
        throw new AppError(404, 'NOT_FOUND', '执行记录不存在');
      }

      // Verify task belongs to user
      const task = await taskRepo.findById(execution.taskId);
      if (!task) {
        throw new AppError(404, 'NOT_FOUND', '关联任务不存在');
      }
      if (task.userId !== userId) {
        throw new AppError(403, 'FORBIDDEN', '无权访问此执行记录');
      }

      // Get summary document
      const summary = await summaryDocRepo.findByExecutionId(executionId);
      if (!summary) {
        throw new AppError(404, 'NOT_FOUND', '总结文档不存在');
      }

      res.json(summary);
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw error;
    }
  })
);

/**
 * GET /api/executions/:executionId/comparison
 * Get comparison report for an execution
 * 
 * Requirements: 9.4
 */
router.get(
  '/executions/:executionId/comparison',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const { executionId } = req.params;

    try {
      // Get execution
      const execution = await executionRepo.findById(executionId);
      if (!execution) {
        throw new AppError(404, 'NOT_FOUND', '执行记录不存在');
      }

      // Verify task belongs to user
      const task = await taskRepo.findById(execution.taskId);
      if (!task) {
        throw new AppError(404, 'NOT_FOUND', '关联任务不存在');
      }
      if (task.userId !== userId) {
        throw new AppError(403, 'FORBIDDEN', '无权访问此执行记录');
      }

      // Get comparison reports
      const comparisonReports = await comparisonReportRepo.findByCurrentExecutionId(executionId);
      if (comparisonReports.length === 0) {
        throw new AppError(404, 'NOT_FOUND', '对比报告不存在（可能是首次执行）');
      }

      res.json(comparisonReports);
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw error;
    }
  })
);

/**
 * GET /api/executions/:executionId/cross-site
 * Get cross-site comparison analysis for an execution
 * 
 * Requirements: 9.5
 */
router.get(
  '/executions/:executionId/cross-site',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const { executionId } = req.params;

    try {
      // Get execution
      const execution = await executionRepo.findById(executionId);
      if (!execution) {
        throw new AppError(404, 'NOT_FOUND', '执行记录不存在');
      }

      // Verify task belongs to user
      const task = await taskRepo.findById(execution.taskId);
      if (!task) {
        throw new AppError(404, 'NOT_FOUND', '关联任务不存在');
      }
      if (task.userId !== userId) {
        throw new AppError(403, 'FORBIDDEN', '无权访问此执行记录');
      }

      // Get cross-site analyses
      const crossSiteAnalyses = await crossSiteAnalysisRepo.findByExecutionId(executionId);
      if (crossSiteAnalyses.length === 0) {
        throw new AppError(404, 'NOT_FOUND', '跨网站对比分析不存在（可能只有单个网站）');
      }

      res.json(crossSiteAnalyses);
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw error;
    }
  })
);

/**
 * GET /api/executions/:executionId/original/:websiteIndex
 * Get original content for a specific website in an execution
 * 
 * Requirements: 9.3
 */
router.get(
  '/executions/:executionId/original/:websiteIndex',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const { executionId, websiteIndex } = req.params;
    const index = parseInt(websiteIndex);

    // Validate websiteIndex
    if (isNaN(index) || index < 0) {
      throw new AppError(400, 'INVALID_PARAMETERS', '网站索引无效');
    }

    try {
      // Get execution
      const execution = await executionRepo.findById(executionId);
      if (!execution) {
        throw new AppError(404, 'NOT_FOUND', '执行记录不存在');
      }

      // Verify task belongs to user
      const task = await taskRepo.findById(execution.taskId);
      if (!task) {
        throw new AppError(404, 'NOT_FOUND', '关联任务不存在');
      }
      if (task.userId !== userId) {
        throw new AppError(403, 'FORBIDDEN', '无权访问此执行记录');
      }

      // Get retrieval results for this execution
      const retrievalResults = await retrievalResultRepo.findByExecutionId(executionId);
      
      // Group by website URL to get unique websites
      const websiteMap = new Map<string, typeof retrievalResults>();
      retrievalResults.forEach(result => {
        if (!websiteMap.has(result.websiteUrl)) {
          websiteMap.set(result.websiteUrl, []);
        }
        websiteMap.get(result.websiteUrl)!.push(result);
      });

      const websites = Array.from(websiteMap.keys());
      
      if (index >= websites.length) {
        throw new AppError(404, 'NOT_FOUND', '网站索引超出范围');
      }

      const targetWebsite = websites[index];
      const websiteResults = websiteMap.get(targetWebsite)!;

      // Get original contents for these retrieval results
      const originalContents = await Promise.all(
        websiteResults.map(async (result) => {
          const content = await originalContentRepo.findByRetrievalResultId(result.id);
          return {
            keyword: result.keyword,
            found: result.found,
            originalContent: content
          };
        })
      );

      res.json({
        websiteUrl: targetWebsite,
        websiteIndex: index,
        contents: originalContents
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw error;
    }
  })
);

export default router;
