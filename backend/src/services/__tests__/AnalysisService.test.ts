import { AnalysisService } from '../AnalysisService';
import { SummaryDocumentRepository } from '../../repositories/SummaryDocumentRepository';
import { ComparisonReportRepository } from '../../repositories/ComparisonReportRepository';
import { CrossSiteAnalysisRepository } from '../../repositories/CrossSiteAnalysisRepository';
import { RetrievalResultRepository } from '../../repositories/RetrievalResultRepository';
import { ExecutionRepository } from '../../repositories/ExecutionRepository';
import { RetrievalResult, Execution } from '../../types';

// Mock fetch globally
global.fetch = jest.fn();

describe('AnalysisService', () => {
  let analysisService: AnalysisService;
  let mockSummaryDocumentRepo: jest.Mocked<SummaryDocumentRepository>;
  let mockComparisonReportRepo: jest.Mocked<ComparisonReportRepository>;
  let mockCrossSiteAnalysisRepo: jest.Mocked<CrossSiteAnalysisRepository>;
  let mockRetrievalResultRepo: jest.Mocked<RetrievalResultRepository>;
  let mockExecutionRepo: jest.Mocked<ExecutionRepository>;

  beforeEach(() => {
    // Create mock repositories
    mockSummaryDocumentRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByExecutionId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;

    mockComparisonReportRepo = {
      create: jest.fn(),
      createMany: jest.fn(),
      findById: jest.fn(),
      findByCurrentExecutionId: jest.fn(),
      findByExecutionAndWebsiteKeyword: jest.fn(),
      delete: jest.fn(),
    } as any;

    mockCrossSiteAnalysisRepo = {
      create: jest.fn(),
      createMany: jest.fn(),
      findById: jest.fn(),
      findByExecutionId: jest.fn(),
      findByExecutionIdAndKeyword: jest.fn(),
      delete: jest.fn(),
    } as any;

    mockRetrievalResultRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByExecutionId: jest.fn(),
      findByExecutionIdAndWebsite: jest.fn(),
      delete: jest.fn(),
    } as any;

    mockExecutionRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByTaskId: jest.fn(),
      findLastCompletedByTaskId: jest.fn(),
      updateStatus: jest.fn(),
      markCompleted: jest.fn(),
      markFailed: jest.fn(),
    } as any;

    analysisService = new AnalysisService(
      mockSummaryDocumentRepo,
      mockComparisonReportRepo,
      mockCrossSiteAnalysisRepo,
      mockRetrievalResultRepo,
      mockExecutionRepo,
      'test-api-key',
      'https://test-api.com'
    );

    // Reset fetch mock
    (global.fetch as jest.Mock).mockReset();
  });

  describe('generateSummary', () => {
    it('should generate summary for found results', async () => {
      const executionId = 'exec-123';
      const results: RetrievalResult[] = [
        {
          id: 'result-1',
          executionId,
          websiteUrl: 'https://example.com',
          keyword: '金融监管',
          found: true,
          content: '金融监管是指...',
          context: '上下文内容',
          sourceUrl: 'https://example.com/page1',
          createdAt: new Date(),
        },
      ];

      const mockSummary = {
        id: 'summary-1',
        executionId,
        content: '# 检索结果摘要\n\n金融监管的定义...',
        sources: [
          {
            website: 'https://example.com',
            url: 'https://example.com/page1',
            keyword: '金融监管',
          },
        ],
        createdAt: new Date(),
      };

      // Mock LLM API response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: '# 检索结果摘要\n\n金融监管的定义...',
              },
            },
          ],
        }),
      });

      mockSummaryDocumentRepo.create.mockResolvedValue(mockSummary);

      const summary = await analysisService.generateSummary(executionId, results);

      expect(summary).toEqual(mockSummary);
      expect(mockSummaryDocumentRepo.create).toHaveBeenCalledWith({
        executionId,
        content: '# 检索结果摘要\n\n金融监管的定义...',
        sources: [
          {
            website: 'https://example.com',
            url: 'https://example.com/page1',
            keyword: '金融监管',
          },
        ],
      });
    });

    it('should create empty summary when no results found', async () => {
      const executionId = 'exec-123';
      const results: RetrievalResult[] = [
        {
          id: 'result-1',
          executionId,
          websiteUrl: 'https://example.com',
          keyword: '金融监管',
          found: false,
          createdAt: new Date(),
        },
      ];

      const mockSummary = {
        id: 'summary-1',
        executionId,
        content: '# 检索结果摘要\n\n未找到任何关键词内容。',
        sources: [],
        createdAt: new Date(),
      };

      mockSummaryDocumentRepo.create.mockResolvedValue(mockSummary);

      const summary = await analysisService.generateSummary(executionId, results);

      expect(summary).toEqual(mockSummary);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('compareResults', () => {
    it('should return empty array for first execution', async () => {
      const currentExecutionId = 'exec-current';
      const taskId = 'task-123';

      mockExecutionRepo.findByTaskId.mockResolvedValue({
        executions: [
          {
            id: currentExecutionId,
            taskId,
            status: 'running',
            startTime: new Date(),
            createdAt: new Date(),
          } as Execution,
        ],
        total: 1,
        page: 1,
        limit: 100,
      });

      const reports = await analysisService.compareResults(currentExecutionId, taskId);

      expect(reports).toEqual([]);
      expect(mockRetrievalResultRepo.findByExecutionId).not.toHaveBeenCalled();
    });

    it('should generate comparison reports when previous execution exists', async () => {
      const currentExecutionId = 'exec-current';
      const previousExecutionId = 'exec-previous';
      const taskId = 'task-123';

      mockExecutionRepo.findByTaskId.mockResolvedValue({
        executions: [
          {
            id: currentExecutionId,
            taskId,
            status: 'running',
            startTime: new Date('2024-01-15'),
            createdAt: new Date('2024-01-15'),
          } as Execution,
          {
            id: previousExecutionId,
            taskId,
            status: 'completed',
            startTime: new Date('2024-01-14'),
            createdAt: new Date('2024-01-14'),
          } as Execution,
        ],
        total: 2,
        page: 1,
        limit: 100,
      });

      const currentResults: RetrievalResult[] = [
        {
          id: 'result-current',
          executionId: currentExecutionId,
          websiteUrl: 'https://example.com',
          keyword: '金融监管',
          found: true,
          content: '新内容',
          createdAt: new Date(),
        },
      ];

      const previousResults: RetrievalResult[] = [
        {
          id: 'result-previous',
          executionId: previousExecutionId,
          websiteUrl: 'https://example.com',
          keyword: '金融监管',
          found: true,
          content: '旧内容',
          createdAt: new Date(),
        },
      ];

      mockRetrievalResultRepo.findByExecutionId
        .mockResolvedValueOnce(currentResults)
        .mockResolvedValueOnce(previousResults);

      // Mock LLM API response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: '内容已更新',
              },
            },
          ],
        }),
      });

      const mockReport = {
        id: 'report-1',
        currentExecutionId,
        previousExecutionId,
        websiteUrl: 'https://example.com',
        keyword: '金融监管',
        changes: {
          added: [],
          removed: [],
          modified: [
            {
              field: 'content',
              oldValue: '旧内容',
              newValue: '新内容',
            },
          ],
        },
        summary: '内容已更新',
        createdAt: new Date(),
      };

      mockComparisonReportRepo.create.mockResolvedValue(mockReport);

      const reports = await analysisService.compareResults(currentExecutionId, taskId);

      expect(reports).toHaveLength(1);
      expect(reports[0]).toEqual(mockReport);
    });
  });

  describe('analyzeCrossSite', () => {
    it('should skip analysis when less than 2 websites', async () => {
      const executionId = 'exec-123';
      const results: RetrievalResult[] = [
        {
          id: 'result-1',
          executionId,
          websiteUrl: 'https://example.com',
          keyword: '金融监管',
          found: true,
          content: '内容',
          createdAt: new Date(),
        },
      ];

      const analyses = await analysisService.analyzeCrossSite(executionId, results);

      expect(analyses).toEqual([]);
      expect(mockCrossSiteAnalysisRepo.create).not.toHaveBeenCalled();
    });

    it('should generate cross-site analysis for multiple websites', async () => {
      const executionId = 'exec-123';
      const results: RetrievalResult[] = [
        {
          id: 'result-1',
          executionId,
          websiteUrl: 'https://site1.com',
          keyword: '金融监管',
          found: true,
          content: '网站1的定义',
          createdAt: new Date(),
        },
        {
          id: 'result-2',
          executionId,
          websiteUrl: 'https://site2.com',
          keyword: '金融监管',
          found: true,
          content: '网站2的定义',
          createdAt: new Date(),
        },
      ];

      // Mock LLM API response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  differences: [
                    {
                      websites: ['https://site1.com', 'https://site2.com'],
                      aspect: '定义范围',
                      description: '网站1更详细',
                    },
                  ],
                  commonalities: ['都提到监管'],
                  analysisSummary: '总体分析',
                }),
              },
            },
          ],
        }),
      });

      const mockAnalysis = {
        id: 'analysis-1',
        executionId,
        keyword: '金融监管',
        differences: [
          {
            websites: ['https://site1.com', 'https://site2.com'],
            aspect: '定义范围',
            description: '网站1更详细',
          },
        ],
        commonalities: ['都提到监管'],
        analysisSummary: '总体分析',
        createdAt: new Date(),
      };

      mockCrossSiteAnalysisRepo.create.mockResolvedValue(mockAnalysis);

      const analyses = await analysisService.analyzeCrossSite(executionId, results);

      expect(analyses).toHaveLength(1);
      expect(analyses[0]).toEqual(mockAnalysis);
    });
  });
});
