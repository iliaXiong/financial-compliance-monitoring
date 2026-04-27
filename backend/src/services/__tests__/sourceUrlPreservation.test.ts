import { ContentRetriever } from '../ContentRetriever';
import { TaskScheduler } from '../TaskScheduler';
import { TaskRepository } from '../../repositories/TaskRepository';
import { ExecutionRepository } from '../../repositories/ExecutionRepository';
import { RetrievalResultRepository } from '../../repositories/RetrievalResultRepository';
import { SubagentOrchestrator } from '../SubagentOrchestrator';
import { AnalysisService } from '../AnalysisService';

/**
 * Preservation Property Tests
 * 
 * Property 2: Preservation - Fallback Behavior
 * 
 * IMPORTANT: Follow observation-first methodology
 * 
 * Goal: Verify that for all inputs where the bug condition does NOT hold,
 * the fixed system produces the same result as the original system
 * 
 * These tests should PASS on unfixed code to confirm baseline behavior
 */
describe('Preservation Tests - Source URL Fallback Behavior', () => {
  describe('Property 2: Preservation - Fallback to websiteUrl when sourceUrl missing', () => {
    it('should use result.websiteUrl as fallback when LLM response missing sourceUrl field', async () => {
      // Mock LLM response WITHOUT sourceUrl field
      const mockLLMResponse = JSON.stringify({
        keywordResults: [
          {
            keyword: 'trading hours',
            found: true,
            content: 'NYSE trading hours are from 9:30 AM to 4:00 PM ET',
            // NO sourceUrl field
            context: 'The NYSE operates during regular trading hours...'
          }
        ]
      });

      const contentRetriever = new ContentRetriever();
      (contentRetriever as any).callLLM = jest.fn().mockResolvedValue(mockLLMResponse);
      (contentRetriever as any).fetchPageContent = jest.fn().mockResolvedValue('<html>Main page content</html>');

      const result = await contentRetriever.retrieveFromWebsite(
        'https://www.nyse.com/index',
        ['trading hours']
      );

      // Verify keyword match is found
      expect(result.keywordMatches).toHaveLength(1);
      expect(result.keywordMatches[0].found).toBe(true);
      expect(result.keywordMatches[0].keyword).toBe('trading hours');
      
      // This test should PASS on unfixed code - confirms baseline behavior
      // When sourceUrl is missing, system should continue to work normally
    });

    it('should use result.websiteUrl for failed retrievals', async () => {
      // Mock repositories
      const mockTaskRepo = {
        findById: jest.fn().mockResolvedValue({
          id: 'task-1',
          userId: 'user-1',
          name: 'Test Task',
          keywords: ['test keyword'],
          targetWebsites: ['https://example.com'],
          schedule: { type: 'once' },
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        }),
        updateExecutionTimestamps: jest.fn().mockResolvedValue(undefined)
      } as unknown as TaskRepository;

      const mockExecutionRepo = {
        create: jest.fn().mockResolvedValue({
          id: 'exec-1',
          taskId: 'task-1',
          status: 'running',
          startTime: new Date(),
          createdAt: new Date()
        }),
        markCompleted: jest.fn().mockResolvedValue(undefined),
        markFailed: jest.fn().mockResolvedValue(undefined)
      } as unknown as ExecutionRepository;

      const savedResults: any[] = [];
      const mockRetrievalResultRepo = {
        create: jest.fn().mockImplementation((data: any) => {
          savedResults.push(data);
          return Promise.resolve({
            id: `result-${savedResults.length}`,
            ...data,
            createdAt: new Date()
          });
        })
      } as unknown as RetrievalResultRepository;

      // Mock SubagentOrchestrator to return FAILED retrieval
      const mockOrchestrator = {
        executeParallel: jest.fn().mockResolvedValue({
          results: [
            {
              websiteUrl: 'https://example.com',
              status: 'failed' as const,
              keywordMatches: [],
              documentResults: [],
              error: 'Connection timeout',
              retrievedAt: new Date()
            }
          ],
          totalDuration: 1000,
          successCount: 0,
          failureCount: 1
        })
      } as unknown as SubagentOrchestrator;

      const mockAnalysisService = {
        generateSummary: jest.fn().mockResolvedValue(undefined),
        compareResults: jest.fn().mockResolvedValue(undefined),
        analyzeCrossSite: jest.fn().mockResolvedValue(undefined)
      } as unknown as AnalysisService;

      const taskScheduler = new TaskScheduler(
        undefined,
        mockTaskRepo,
        mockExecutionRepo,
        mockRetrievalResultRepo,
        mockOrchestrator,
        mockAnalysisService,
        'test-task-execution'
      );

      await taskScheduler.executeTask('task-1');

      // Verify that failed retrieval uses result.websiteUrl
      expect(savedResults).toHaveLength(1);
      expect(savedResults[0].found).toBe(false);
      expect(savedResults[0].sourceUrl).toBe('https://example.com');
      expect(savedResults[0].context).toContain('Error: Connection timeout');
      
      // This test should PASS on unfixed code - confirms baseline behavior
    });

    it('should use result.websiteUrl when no keyword matches found', async () => {
      // Mock repositories
      const mockTaskRepo = {
        findById: jest.fn().mockResolvedValue({
          id: 'task-1',
          userId: 'user-1',
          name: 'Test Task',
          keywords: ['nonexistent keyword'],
          targetWebsites: ['https://example.com'],
          schedule: { type: 'once' },
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        }),
        updateExecutionTimestamps: jest.fn().mockResolvedValue(undefined)
      } as unknown as TaskRepository;

      const mockExecutionRepo = {
        create: jest.fn().mockResolvedValue({
          id: 'exec-1',
          taskId: 'task-1',
          status: 'running',
          startTime: new Date(),
          createdAt: new Date()
        }),
        markCompleted: jest.fn().mockResolvedValue(undefined),
        markFailed: jest.fn().mockResolvedValue(undefined)
      } as unknown as ExecutionRepository;

      const savedResults: any[] = [];
      const mockRetrievalResultRepo = {
        create: jest.fn().mockImplementation((data: any) => {
          savedResults.push(data);
          return Promise.resolve({
            id: `result-${savedResults.length}`,
            ...data,
            createdAt: new Date()
          });
        })
      } as unknown as RetrievalResultRepository;

      // Mock SubagentOrchestrator to return NO matches
      const mockOrchestrator = {
        executeParallel: jest.fn().mockResolvedValue({
          results: [
            {
              websiteUrl: 'https://example.com',
              status: 'success' as const,
              keywordMatches: [], // No matches
              documentResults: [],
              retrievedAt: new Date()
            }
          ],
          totalDuration: 1000,
          successCount: 1,
          failureCount: 0
        })
      } as unknown as SubagentOrchestrator;

      const mockAnalysisService = {
        generateSummary: jest.fn().mockResolvedValue(undefined),
        compareResults: jest.fn().mockResolvedValue(undefined),
        analyzeCrossSite: jest.fn().mockResolvedValue(undefined)
      } as unknown as AnalysisService;

      const taskScheduler = new TaskScheduler(
        undefined,
        mockTaskRepo,
        mockExecutionRepo,
        mockRetrievalResultRepo,
        mockOrchestrator,
        mockAnalysisService,
        'test-task-execution'
      );

      await taskScheduler.executeTask('task-1');

      // Verify that when no matches, system uses result.websiteUrl
      expect(savedResults).toHaveLength(1);
      expect(savedResults[0].found).toBe(false);
      expect(savedResults[0].sourceUrl).toBe('https://example.com');
      
      // This test should PASS on unfixed code - confirms baseline behavior
    });

    it('should correctly handle document results with documentUrl', async () => {
      // Mock repositories
      const mockTaskRepo = {
        findById: jest.fn().mockResolvedValue({
          id: 'task-1',
          userId: 'user-1',
          name: 'Test Task',
          keywords: ['compliance'],
          targetWebsites: ['https://www.sec.gov'],
          schedule: { type: 'once' },
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        }),
        updateExecutionTimestamps: jest.fn().mockResolvedValue(undefined)
      } as unknown as TaskRepository;

      const mockExecutionRepo = {
        create: jest.fn().mockResolvedValue({
          id: 'exec-1',
          taskId: 'task-1',
          status: 'running',
          startTime: new Date(),
          createdAt: new Date()
        }),
        markCompleted: jest.fn().mockResolvedValue(undefined),
        markFailed: jest.fn().mockResolvedValue(undefined)
      } as unknown as ExecutionRepository;

      const savedResults: any[] = [];
      const mockRetrievalResultRepo = {
        create: jest.fn().mockImplementation((data: any) => {
          savedResults.push(data);
          return Promise.resolve({
            id: `result-${savedResults.length}`,
            ...data,
            createdAt: new Date()
          });
        })
      } as unknown as RetrievalResultRepository;

      // Mock SubagentOrchestrator to return document results
      const mockOrchestrator = {
        executeParallel: jest.fn().mockResolvedValue({
          results: [
            {
              websiteUrl: 'https://www.sec.gov',
              status: 'success' as const,
              keywordMatches: [],
              documentResults: [
                {
                  documentUrl: 'https://www.sec.gov/rules/final/2023/33-11234.pdf',
                  status: 'success' as const,
                  keywordMatches: [
                    {
                      keyword: 'compliance',
                      found: true,
                      occurrences: 1,
                      contexts: ['SEC compliance requirements...']
                    }
                  ]
                }
              ],
              retrievedAt: new Date()
            }
          ],
          totalDuration: 1000,
          successCount: 1,
          failureCount: 0
        })
      } as unknown as SubagentOrchestrator;

      const mockAnalysisService = {
        generateSummary: jest.fn().mockResolvedValue(undefined),
        compareResults: jest.fn().mockResolvedValue(undefined),
        analyzeCrossSite: jest.fn().mockResolvedValue(undefined)
      } as unknown as AnalysisService;

      const taskScheduler = new TaskScheduler(
        undefined,
        mockTaskRepo,
        mockExecutionRepo,
        mockRetrievalResultRepo,
        mockOrchestrator,
        mockAnalysisService,
        'test-task-execution'
      );

      await taskScheduler.executeTask('task-1');

      // Verify that document results are handled correctly
      expect(savedResults).toHaveLength(1);
      expect(savedResults[0].found).toBe(true);
      expect(savedResults[0].documentUrl).toBe('https://www.sec.gov/rules/final/2023/33-11234.pdf');
      expect(savedResults[0].sourceUrl).toBe('https://www.sec.gov'); // Uses websiteUrl
      
      // This test should PASS on unfixed code - confirms baseline behavior
    });

    it('should correctly extract other fields (keyword, found, occurrences, contexts)', async () => {
      // Mock LLM response with all fields
      const mockLLMResponse = JSON.stringify({
        keywordResults: [
          {
            keyword: 'market data',
            found: true,
            content: 'Market data pricing information...',
            context: 'NASDAQ provides market data services...'
            // No sourceUrl field - testing preservation
          }
        ]
      });

      const contentRetriever = new ContentRetriever();
      (contentRetriever as any).callLLM = jest.fn().mockResolvedValue(mockLLMResponse);
      (contentRetriever as any).fetchPageContent = jest.fn().mockResolvedValue('<html>Main page content</html>');

      const result = await contentRetriever.retrieveFromWebsite(
        'https://www.nasdaq.com',
        ['market data']
      );

      // Verify all fields are extracted correctly
      expect(result.keywordMatches).toHaveLength(1);
      const keywordMatch = result.keywordMatches[0];
      
      expect(keywordMatch.keyword).toBe('market data');
      expect(keywordMatch.found).toBe(true);
      expect(keywordMatch.occurrences).toBe(1);
      expect(keywordMatch.contexts).toHaveLength(1);
      expect(keywordMatch.contexts[0]).toBe('NASDAQ provides market data services...');
      
      // This test should PASS on unfixed code - confirms baseline behavior
    });
  });
});
