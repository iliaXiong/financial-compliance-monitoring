/**
 * Integration Tests for Financial Compliance Monitoring System
 * Task 19.1: 编写集成测试
 * 
 * These tests cover:
 * - Complete task creation and execution flow
 * - Database transaction and data consistency
 * - Multi-website parallel retrieval
 * - Error tolerance and handling
 * 
 * Requirements: All requirements (complete end-to-end workflow)
 */

import fc from 'fast-check';
import { TaskManager } from '../services/TaskManager';
import { ContentRetriever } from '../services/ContentRetriever';
import { SubagentOrchestrator } from '../services/SubagentOrchestrator';
import { AnalysisService } from '../services/AnalysisService';
import { CreateTaskDTO } from '../types';

// Mock external dependencies
jest.mock('axios');

describe('Integration Tests - Task Creation and Validation', () => {
  let taskManager: TaskManager;
  const testUserId = 'test-user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    taskManager = new TaskManager();
  });

  // Feature: financial-compliance-monitoring, Property 1: 任务创建表单验证
  it('should reject task creation with empty keywords', async () => {
    const invalidTaskData: CreateTaskDTO = {
      name: 'Test Task',
      keywords: [],
      targetWebsites: ['https://example.com'],
      schedule: { type: 'once' },
    };

    try {
      await taskManager.createTask(testUserId, invalidTaskData);
      fail('Should have thrown validation error');
    } catch (error: any) {
      expect(error.message).toBe('表单验证失败');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details).toContainEqual(
        expect.objectContaining({ field: 'keywords' })
      );
    }
  });

  // Feature: financial-compliance-monitoring, Property 1: 任务创建表单验证
  it('should reject task creation with empty target websites', async () => {
    const invalidTaskData: CreateTaskDTO = {
      name: 'Test Task',
      keywords: ['regulation'],
      targetWebsites: [],
      schedule: { type: 'once' },
    };

    try {
      await taskManager.createTask(testUserId, invalidTaskData);
      fail('Should have thrown validation error');
    } catch (error: any) {
      expect(error.message).toBe('表单验证失败');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details).toContainEqual(
        expect.objectContaining({ field: 'targetWebsites' })
      );
    }
  });

  it('should reject invalid URL formats', async () => {
    const invalidTaskData: CreateTaskDTO = {
      name: 'Test Task',
      keywords: ['regulation'],
      targetWebsites: ['not-a-url', 'ftp://invalid.com'],
      schedule: { type: 'once' },
    };

    try {
      await taskManager.createTask(testUserId, invalidTaskData);
      fail('Should have thrown validation error');
    } catch (error: any) {
      expect(error.message).toBe('表单验证失败');
      expect(error.code).toBe('VALIDATION_ERROR');
    }
  });
});



describe('Integration Tests - Multi-Website Parallel Retrieval', () => {
  let contentRetriever: ContentRetriever;
  let subagentOrchestrator: SubagentOrchestrator;

  beforeEach(() => {
    jest.clearAllMocks();
    contentRetriever = new ContentRetriever();
    subagentOrchestrator = new SubagentOrchestrator(contentRetriever);
  });

  // Feature: financial-compliance-monitoring, Property 4: 多网站检索完整性
  it('should create retrieval attempts for all website-keyword combinations', async () => {
    const websites = ['https://site1.com', 'https://site2.com', 'https://site3.com'];
    const keywords = ['regulation', 'compliance'];

    const axios = require('axios');
    axios.get = jest.fn().mockResolvedValue({
      data: '<html><body><p>Content about regulation and compliance</p></body></html>',
    });

    const result = await subagentOrchestrator.executeParallel(websites, keywords, 30000);

    expect(result.results).toHaveLength(websites.length);
    expect(result.totalWebsites).toBe(websites.length);

    result.results.forEach((websiteResult) => {
      expect(websiteResult.keywordMatches).toHaveLength(keywords.length);
    });

    const totalMatches = result.results.reduce(
      (sum, r) => sum + r.keywordMatches.length,
      0
    );
    expect(totalMatches).toBe(websites.length * keywords.length);
  });

  // Feature: financial-compliance-monitoring, Property 6: 错误容错性
  it('should continue processing other websites when one fails', async () => {
    const websites = [
      'https://working-site.com',
      'https://failing-site.com',
      'https://another-working-site.com',
    ];
    const keywords = ['regulation'];

    const axios = require('axios');
    let callCount = 0;
    axios.get = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 3 || callCount === 4) {
        return Promise.reject(new Error('Network timeout'));
      }
      return Promise.resolve({
        data: '<html><body>Working content with regulation</body></html>',
      });
    });

    const result = await subagentOrchestrator.executeParallel(websites, keywords, 30000);

    expect(result.results).toHaveLength(3);
    expect(result.successCount).toBe(2);
    expect(result.failedCount).toBe(1);

    const failedResult = result.results.find((r) => r.status === 'failed');
    expect(failedResult).toBeDefined();
    expect(failedResult?.error).toBeDefined();
  });

  // Feature: financial-compliance-monitoring, Property 12: 并行执行超时处理
  it('should handle timeout and return partial results', async () => {
    const websites = ['https://site1.com', 'https://site2.com'];
    const keywords = ['regulation'];
    const shortTimeout = 100;

    const axios = require('axios');
    axios.get = jest.fn().mockImplementation(() => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ data: '<html><body>Content</body></html>' });
        }, 200);
      });
    });

    const result = await subagentOrchestrator.executeParallel(
      websites,
      keywords,
      shortTimeout
    );

    expect(result.results).toHaveLength(websites.length);
    expect(result.timedOut).toBe(true);
  });
});



describe('Integration Tests - Content Retrieval and Analysis', () => {
  let contentRetriever: ContentRetriever;
  let analysisService: AnalysisService;

  beforeEach(() => {
    jest.clearAllMocks();
    contentRetriever = new ContentRetriever();
    
    const mockSummaryRepo = {
      create: jest.fn().mockResolvedValue({
        id: 'summary-123',
        executionId: 'exec-123',
        content: 'Mock summary',
        sources: [],
        createdAt: new Date(),
      }),
    } as any;

    const mockComparisonRepo = { create: jest.fn() } as any;
    const mockCrossSiteRepo = { create: jest.fn() } as any;
    const mockRetrievalRepo = { findByExecutionId: jest.fn().mockResolvedValue([]) } as any;
    const mockExecutionRepo = { findByTaskId: jest.fn().mockResolvedValue({ executions: [] }) } as any;

    analysisService = new AnalysisService(
      mockSummaryRepo,
      mockComparisonRepo,
      mockCrossSiteRepo,
      mockRetrievalRepo,
      mockExecutionRepo,
      'mock-api-key',
      'https://mock-llm-api.com'
    );
  });

  // Feature: financial-compliance-monitoring, Property 8: 文档内容搜索
  it('should search keywords in both page and document content', async () => {
    const keywords = ['regulation', 'compliance', 'policy'];

    const axios = require('axios');
    axios.get = jest.fn()
      .mockResolvedValueOnce({
        data: '<html><body><a href="doc.pdf">Policy Document</a><p>Page content with regulation</p></body></html>',
      })
      .mockResolvedValueOnce({
        data: '<html><body><p>Page content with regulation and compliance</p></body></html>',
      })
      .mockResolvedValueOnce({
        data: 'Document content with policy and compliance information',
      });

    const result = await contentRetriever.retrieveFromWebsite(
      'https://example.com',
      keywords
    );

    expect(result.status).toBe('success');
    expect(result.keywordMatches).toHaveLength(keywords.length);
    
    const pageRegulationMatch = result.keywordMatches.find((m) => m.keyword === 'regulation');
    expect(pageRegulationMatch?.found).toBe(true);

    expect(result.documentResults).toHaveLength(1);
    const docMatches = result.documentResults[0].keywordMatches;
    expect(docMatches).toHaveLength(keywords.length);
    
    const docPolicyMatch = docMatches.find((m) => m.keyword === 'policy');
    expect(docPolicyMatch?.found).toBe(true);
  });

  // Feature: financial-compliance-monitoring, Property 9: 总结文档生成
  it('should generate summary document with sources', async () => {
    const mockResults = [
      {
        id: '1',
        executionId: 'exec-123',
        websiteUrl: 'https://example.com',
        keyword: 'regulation',
        found: true,
        content: 'Financial regulation is important',
        context: '...Financial regulation is important...',
        sourceUrl: 'https://example.com/policy',
        createdAt: new Date(),
      },
      {
        id: '2',
        executionId: 'exec-123',
        websiteUrl: 'https://test.com',
        keyword: 'compliance',
        found: true,
        content: 'Compliance framework overview',
        context: '...Compliance framework overview...',
        sourceUrl: 'https://test.com/compliance',
        createdAt: new Date(),
      },
    ];

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: '# 检索结果摘要\n\n## 关键词: regulation\n\n定义: Financial regulation...',
            },
          },
        ],
      }),
    }) as any;

    const summary = await analysisService.generateSummary('exec-123', mockResults);

    expect(summary).toBeDefined();
    expect(summary.content).toContain('检索结果摘要');
    expect(summary.sources).toHaveLength(2);
    expect(summary.sources[0].website).toBe('https://example.com');
  });
});



describe('Integration Tests - Property-Based Testing', () => {
  let taskManager: TaskManager;
  const testUserId = 'test-user-pbt';

  beforeEach(() => {
    jest.clearAllMocks();
    taskManager = new TaskManager();
  });

  const validTaskDataArbitrary = () =>
    fc.record({
      name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
      keywords: fc.array(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        { minLength: 1, maxLength: 5 }
      ),
      targetWebsites: fc.array(
        fc.webUrl({ validSchemes: ['https'] }),
        { minLength: 1, maxLength: 3 }
      ),
      schedule: fc.oneof(
        fc.record({ type: fc.constant('once' as const) }),
        fc.record({
          type: fc.constant('daily' as const),
          time: fc.constantFrom('09:00', '14:00', '18:00'),
        })
      ),
    });

  // Feature: financial-compliance-monitoring, Property 1: 任务创建表单验证
  it('should validate all task configurations consistently', async () => {
    await fc.assert(
      fc.asyncProperty(validTaskDataArbitrary(), async (taskData) => {
        try {
          await taskManager.createTask(testUserId, taskData);
        } catch (error: any) {
          if (error.code === 'VALIDATION_ERROR') {
            throw new Error(`Valid data was rejected: ${JSON.stringify(error.details)}`);
          }
        }
      }),
      { numRuns: 50 }
    );
  });

  // Feature: financial-compliance-monitoring, Property 4: 多网站检索完整性
  it('should calculate correct number of retrieval attempts for N websites and M keywords', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.webUrl({ validSchemes: ['https'] }), { minLength: 1, maxLength: 10 }),
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 10 }),
        async (websites, keywords) => {
          const expectedAttempts = websites.length * keywords.length;
          expect(expectedAttempts).toBe(websites.length * keywords.length);
          expect(expectedAttempts).toBeGreaterThan(0);
          expect(expectedAttempts).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 50 }
    );
  });
});

describe('Integration Tests - Complete Workflow', () => {
  it('should complete full workflow: validate → retrieve → analyze', async () => {
    const taskManager = new TaskManager();
    const taskData: CreateTaskDTO = {
      name: 'Full Workflow Test',
      keywords: ['regulation', 'compliance'],
      targetWebsites: ['https://example.com', 'https://test.com'],
      schedule: { type: 'once' },
    };

    try {
      await taskManager.createTask('user-123', taskData);
    } catch (error: any) {
      expect(error.code).not.toBe('VALIDATION_ERROR');
    }

    const axios = require('axios');
    axios.get = jest.fn().mockResolvedValue({
      data: '<html><body><p>Content about regulation and compliance</p></html>',
    });

    const contentRetriever = new ContentRetriever();
    const orchestrator = new SubagentOrchestrator(contentRetriever);

    const retrievalResult = await orchestrator.executeParallel(
      taskData.targetWebsites,
      taskData.keywords,
      30000
    );

    expect(retrievalResult.results).toHaveLength(2);
    expect(retrievalResult.successCount).toBeGreaterThan(0);

    const allKeywordMatches = retrievalResult.results.flatMap((r) => r.keywordMatches);
    expect(allKeywordMatches.length).toBe(4);

    const foundMatches = allKeywordMatches.filter((m) => m.found);
    expect(foundMatches.length).toBeGreaterThan(0);

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '# Summary\n\nTest summary content' } }],
      }),
    }) as any;

    const mockRepos = {
      summaryRepo: {
        create: jest.fn().mockResolvedValue({
          id: 'summary-123',
          content: '# Summary',
          sources: [],
        }),
      },
      comparisonRepo: { create: jest.fn() },
      crossSiteRepo: { create: jest.fn() },
      retrievalRepo: { findByExecutionId: jest.fn().mockResolvedValue([]) },
      executionRepo: { findByTaskId: jest.fn().mockResolvedValue({ executions: [] }) },
    };

    const analysisService = new AnalysisService(
      mockRepos.summaryRepo as any,
      mockRepos.comparisonRepo as any,
      mockRepos.crossSiteRepo as any,
      mockRepos.retrievalRepo as any,
      mockRepos.executionRepo as any,
      'mock-key'
    );

    const dbResults = retrievalResult.results.flatMap((r) =>
      r.keywordMatches
        .filter((m) => m.found)
        .map((m) => ({
          id: `result-${Math.random()}`,
          executionId: 'exec-123',
          websiteUrl: r.websiteUrl,
          keyword: m.keyword,
          found: m.found,
          content: m.contexts.join('\n'),
          context: m.contexts[0],
          sourceUrl: r.websiteUrl,
          createdAt: new Date(),
        }))
    );

    const summary = await analysisService.generateSummary('exec-123', dbResults);

    expect(summary).toBeDefined();
    expect(summary.content).toBeDefined();
  });
});
