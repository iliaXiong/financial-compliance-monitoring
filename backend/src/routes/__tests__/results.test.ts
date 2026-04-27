import request from 'supertest';
import express from 'express';
import resultsRouter from '../results';
import { errorHandler } from '../../middleware';
import { 
  ExecutionRepository,
  RetrievalResultRepository,
  SummaryDocumentRepository,
  ComparisonReportRepository,
  CrossSiteAnalysisRepository,
  OriginalContentRepository,
  TaskRepository
} from '../../repositories';
import { generateToken } from '../../middleware/auth';

// Mock the repositories
jest.mock('../../repositories/ExecutionRepository');
jest.mock('../../repositories/RetrievalResultRepository');
jest.mock('../../repositories/SummaryDocumentRepository');
jest.mock('../../repositories/ComparisonReportRepository');
jest.mock('../../repositories/CrossSiteAnalysisRepository');
jest.mock('../../repositories/OriginalContentRepository');
jest.mock('../../repositories/TaskRepository');

describe('Results API Routes', () => {
  let app: express.Application;
  let authToken: string;
  const testUserId = 'test-user-id';
  const testTaskId = 'test-task-id';
  const testExecutionId = 'test-execution-id';

  beforeEach(() => {
    // Create Express app with routes
    app = express();
    app.use(express.json());
    app.use('/api', resultsRouter);
    app.use(errorHandler);

    // Generate auth token for tests
    authToken = generateToken(testUserId, 'test@example.com');

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('GET /api/tasks/:taskId/executions', () => {
    it('should return paginated execution history', async () => {
      const mockTask = {
        id: testTaskId,
        userId: testUserId,
        name: 'Test Task',
        status: 'active',
      };

      const mockExecutions = {
        executions: [
          {
            id: 'exec-1',
            taskId: testTaskId,
            status: 'completed',
            startTime: new Date(),
            endTime: new Date(),
            createdAt: new Date(),
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      };

      (TaskRepository.prototype.findById as jest.Mock).mockResolvedValue(mockTask);
      (ExecutionRepository.prototype.findByTaskId as jest.Mock).mockResolvedValue(mockExecutions);

      const response = await request(app)
        .get(`/api/tasks/${testTaskId}/executions`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        executions: expect.arrayContaining([
          expect.objectContaining({ id: 'exec-1' }),
        ]),
        total: 1,
      });
    });

    it('should return 404 for non-existent task', async () => {
      (TaskRepository.prototype.findById as jest.Mock).mockResolvedValue(null);

      await request(app)
        .get(`/api/tasks/non-existent/executions`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 403 for unauthorized access', async () => {
      const mockTask = {
        id: testTaskId,
        userId: 'other-user-id',
        name: 'Test Task',
      };

      (TaskRepository.prototype.findById as jest.Mock).mockResolvedValue(mockTask);

      await request(app)
        .get(`/api/tasks/${testTaskId}/executions`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });

    it('should validate pagination parameters', async () => {
      await request(app)
        .get(`/api/tasks/${testTaskId}/executions?page=0&limit=200`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe('GET /api/executions/:executionId', () => {
    it('should return execution details with all related data', async () => {
      const mockExecution = {
        id: testExecutionId,
        taskId: testTaskId,
        status: 'completed',
        startTime: new Date(),
        endTime: new Date(),
      };

      const mockTask = {
        id: testTaskId,
        userId: testUserId,
        name: 'Test Task',
      };

      const mockResults = [
        {
          id: 'result-1',
          executionId: testExecutionId,
          websiteUrl: 'https://example.com',
          keyword: 'keyword1',
          found: true,
          content: 'Test content',
        },
      ];

      const mockSummary = {
        id: 'summary-1',
        executionId: testExecutionId,
        content: '# Summary',
        sources: [],
      };

      (ExecutionRepository.prototype.findById as jest.Mock).mockResolvedValue(mockExecution);
      (TaskRepository.prototype.findById as jest.Mock).mockResolvedValue(mockTask);
      (RetrievalResultRepository.prototype.findByExecutionId as jest.Mock).mockResolvedValue(mockResults);
      (SummaryDocumentRepository.prototype.findByExecutionId as jest.Mock).mockResolvedValue(mockSummary);
      (ComparisonReportRepository.prototype.findByCurrentExecutionId as jest.Mock).mockResolvedValue([]);
      (CrossSiteAnalysisRepository.prototype.findByExecutionId as jest.Mock).mockResolvedValue([]);

      const response = await request(app)
        .get(`/api/executions/${testExecutionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        execution: expect.objectContaining({ id: testExecutionId }),
        results: expect.arrayContaining([
          expect.objectContaining({ id: 'result-1' }),
        ]),
        summary: expect.objectContaining({ id: 'summary-1' }),
      });
    });

    it('should return 404 for non-existent execution', async () => {
      (ExecutionRepository.prototype.findById as jest.Mock).mockResolvedValue(null);

      await request(app)
        .get('/api/executions/non-existent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('GET /api/executions/:executionId/summary', () => {
    it('should return summary document', async () => {
      const mockExecution = {
        id: testExecutionId,
        taskId: testTaskId,
        status: 'completed',
      };

      const mockTask = {
        id: testTaskId,
        userId: testUserId,
        name: 'Test Task',
      };

      const mockSummary = {
        id: 'summary-1',
        executionId: testExecutionId,
        content: '# Summary\n\nTest summary content',
        sources: [
          {
            website: 'https://example.com',
            url: 'https://example.com/page',
            keyword: 'keyword1',
          },
        ],
        createdAt: new Date(),
      };

      (ExecutionRepository.prototype.findById as jest.Mock).mockResolvedValue(mockExecution);
      (TaskRepository.prototype.findById as jest.Mock).mockResolvedValue(mockTask);
      (SummaryDocumentRepository.prototype.findByExecutionId as jest.Mock).mockResolvedValue(mockSummary);

      const response = await request(app)
        .get(`/api/executions/${testExecutionId}/summary`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: 'summary-1',
        content: expect.stringContaining('Summary'),
        sources: expect.arrayContaining([
          expect.objectContaining({ website: 'https://example.com' }),
        ]),
      });
    });

    it('should return 404 when summary does not exist', async () => {
      const mockExecution = {
        id: testExecutionId,
        taskId: testTaskId,
        status: 'completed',
      };

      const mockTask = {
        id: testTaskId,
        userId: testUserId,
        name: 'Test Task',
      };

      (ExecutionRepository.prototype.findById as jest.Mock).mockResolvedValue(mockExecution);
      (TaskRepository.prototype.findById as jest.Mock).mockResolvedValue(mockTask);
      (SummaryDocumentRepository.prototype.findByExecutionId as jest.Mock).mockResolvedValue(null);

      await request(app)
        .get(`/api/executions/${testExecutionId}/summary`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('GET /api/executions/:executionId/comparison', () => {
    it('should return comparison reports', async () => {
      const mockExecution = {
        id: testExecutionId,
        taskId: testTaskId,
        status: 'completed',
      };

      const mockTask = {
        id: testTaskId,
        userId: testUserId,
        name: 'Test Task',
      };

      const mockComparisons = [
        {
          id: 'comparison-1',
          currentExecutionId: testExecutionId,
          previousExecutionId: 'prev-exec-id',
          websiteUrl: 'https://example.com',
          keyword: 'keyword1',
          changes: {
            added: ['New content'],
            removed: ['Old content'],
            modified: [],
          },
          summary: 'Content updated',
          createdAt: new Date(),
        },
      ];

      (ExecutionRepository.prototype.findById as jest.Mock).mockResolvedValue(mockExecution);
      (TaskRepository.prototype.findById as jest.Mock).mockResolvedValue(mockTask);
      (ComparisonReportRepository.prototype.findByCurrentExecutionId as jest.Mock).mockResolvedValue(mockComparisons);

      const response = await request(app)
        .get(`/api/executions/${testExecutionId}/comparison`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'comparison-1',
            changes: expect.objectContaining({
              added: expect.arrayContaining(['New content']),
            }),
          }),
        ])
      );
    });

    it('should return 404 when no comparison reports exist', async () => {
      const mockExecution = {
        id: testExecutionId,
        taskId: testTaskId,
        status: 'completed',
      };

      const mockTask = {
        id: testTaskId,
        userId: testUserId,
        name: 'Test Task',
      };

      (ExecutionRepository.prototype.findById as jest.Mock).mockResolvedValue(mockExecution);
      (TaskRepository.prototype.findById as jest.Mock).mockResolvedValue(mockTask);
      (ComparisonReportRepository.prototype.findByCurrentExecutionId as jest.Mock).mockResolvedValue([]);

      await request(app)
        .get(`/api/executions/${testExecutionId}/comparison`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('GET /api/executions/:executionId/cross-site', () => {
    it('should return cross-site analyses', async () => {
      const mockExecution = {
        id: testExecutionId,
        taskId: testTaskId,
        status: 'completed',
      };

      const mockTask = {
        id: testTaskId,
        userId: testUserId,
        name: 'Test Task',
      };

      const mockAnalyses = [
        {
          id: 'analysis-1',
          executionId: testExecutionId,
          keyword: 'keyword1',
          differences: [
            {
              websites: ['https://example1.com', 'https://example2.com'],
              aspect: 'definition',
              description: 'Different definitions found',
            },
          ],
          commonalities: ['Both mention regulation'],
          analysisSummary: 'Analysis summary',
          createdAt: new Date(),
        },
      ];

      (ExecutionRepository.prototype.findById as jest.Mock).mockResolvedValue(mockExecution);
      (TaskRepository.prototype.findById as jest.Mock).mockResolvedValue(mockTask);
      (CrossSiteAnalysisRepository.prototype.findByExecutionId as jest.Mock).mockResolvedValue(mockAnalyses);

      const response = await request(app)
        .get(`/api/executions/${testExecutionId}/cross-site`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'analysis-1',
            keyword: 'keyword1',
            differences: expect.any(Array),
            commonalities: expect.any(Array),
          }),
        ])
      );
    });

    it('should return 404 when no cross-site analyses exist', async () => {
      const mockExecution = {
        id: testExecutionId,
        taskId: testTaskId,
        status: 'completed',
      };

      const mockTask = {
        id: testTaskId,
        userId: testUserId,
        name: 'Test Task',
      };

      (ExecutionRepository.prototype.findById as jest.Mock).mockResolvedValue(mockExecution);
      (TaskRepository.prototype.findById as jest.Mock).mockResolvedValue(mockTask);
      (CrossSiteAnalysisRepository.prototype.findByExecutionId as jest.Mock).mockResolvedValue([]);

      await request(app)
        .get(`/api/executions/${testExecutionId}/cross-site`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('GET /api/executions/:executionId/original/:websiteIndex', () => {
    it('should return original content for a website', async () => {
      const mockExecution = {
        id: testExecutionId,
        taskId: testTaskId,
        status: 'completed',
      };

      const mockTask = {
        id: testTaskId,
        userId: testUserId,
        name: 'Test Task',
      };

      const mockResults = [
        {
          id: 'result-1',
          executionId: testExecutionId,
          websiteUrl: 'https://example.com',
          keyword: 'keyword1',
          found: true,
        },
        {
          id: 'result-2',
          executionId: testExecutionId,
          websiteUrl: 'https://example2.com',
          keyword: 'keyword1',
          found: true,
        },
      ];

      const mockOriginalContent = {
        id: 'content-1',
        retrievalResultId: 'result-1',
        contentType: 'html',
        rawContent: '<html>Original content</html>',
        createdAt: new Date(),
      };

      (ExecutionRepository.prototype.findById as jest.Mock).mockResolvedValue(mockExecution);
      (TaskRepository.prototype.findById as jest.Mock).mockResolvedValue(mockTask);
      (RetrievalResultRepository.prototype.findByExecutionId as jest.Mock).mockResolvedValue(mockResults);
      (OriginalContentRepository.prototype.findByRetrievalResultId as jest.Mock).mockResolvedValue(mockOriginalContent);

      const response = await request(app)
        .get(`/api/executions/${testExecutionId}/original/0`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        websiteUrl: 'https://example.com',
        websiteIndex: 0,
        contents: expect.arrayContaining([
          expect.objectContaining({
            keyword: 'keyword1',
            found: true,
            originalContent: expect.objectContaining({
              contentType: 'html',
            }),
          }),
        ]),
      });
    });

    it('should return 400 for invalid website index', async () => {
      await request(app)
        .get(`/api/executions/${testExecutionId}/original/-1`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should return 404 for website index out of range', async () => {
      const mockExecution = {
        id: testExecutionId,
        taskId: testTaskId,
        status: 'completed',
      };

      const mockTask = {
        id: testTaskId,
        userId: testUserId,
        name: 'Test Task',
      };

      const mockResults = [
        {
          id: 'result-1',
          executionId: testExecutionId,
          websiteUrl: 'https://example.com',
          keyword: 'keyword1',
          found: true,
        },
      ];

      (ExecutionRepository.prototype.findById as jest.Mock).mockResolvedValue(mockExecution);
      (TaskRepository.prototype.findById as jest.Mock).mockResolvedValue(mockTask);
      (RetrievalResultRepository.prototype.findByExecutionId as jest.Mock).mockResolvedValue(mockResults);

      await request(app)
        .get(`/api/executions/${testExecutionId}/original/5`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('Authentication', () => {
    it('should return 401 without authentication token', async () => {
      await request(app)
        .get(`/api/tasks/${testTaskId}/executions`)
        .expect(401);
    });
  });
});
