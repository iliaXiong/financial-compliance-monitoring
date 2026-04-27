import { ContentRetriever } from '../ContentRetriever';
import { TaskScheduler } from '../TaskScheduler';
import { TaskRepository } from '../../repositories/TaskRepository';
import { ExecutionRepository } from '../../repositories/ExecutionRepository';
import { RetrievalResultRepository } from '../../repositories/RetrievalResultRepository';
import { SubagentOrchestrator } from '../SubagentOrchestrator';
import { AnalysisService } from '../AnalysisService';

/**
 * Bug Condition Exploration Test
 * 
 * Property 1: Source URL Extraction and Usage
 * 
 * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists
 * 
 * Goal: Surface counterexamples that demonstrate the bug exists
 * 
 * Test that when LLM returns a search response with sourceUrl field,
 * the system extracts it into KeywordMatch object and uses it when saving retrieval results
 */
describe('Bug Condition Exploration - Source URL Incorrect', () => {
  describe('Property 1: Source URL Extraction and Usage', () => {
    it('should extract sourceUrl from LLM response and use it in retrieval results - Sub-page URL case', async () => {
      // Mock LLM response with sourceUrl pointing to a sub-page
      const mockLLMResponse = JSON.stringify({
        keywordResults: [
          {
            keyword: 'trading hours',
            found: true,
            content: 'NYSE trading hours are from 9:30 AM to 4:00 PM ET',
            sourceUrl: 'https://www.nyse.com/markets/hours-calendars',
            context: 'The NYSE operates during regular trading hours...'
          }
        ]
      });

      // Create ContentRetriever with mocked LLM
      const contentRetriever = new ContentRetriever();
      
      // Mock the callLLM method to return our test response
      (contentRetriever as any).callLLM = jest.fn().mockResolvedValue(mockLLMResponse);
      
      // Mock fetchPageContent to return dummy content
      (contentRetriever as any).fetchPageContent = jest.fn().mockResolvedValue('<html>Main page content</html>');

      // Execute retrieval
      const result = await contentRetriever.retrieveFromWebsite(
        'https://www.nyse.com/index',
        ['trading hours']
      );

      // ASSERTION 1: KeywordMatch should have sourceUrl extracted from LLM response
      expect(result.keywordMatches).toHaveLength(1);
      const keywordMatch = result.keywordMatches[0];
      
      // This assertion will FAIL on unfixed code because KeywordMatch doesn't have sourceUrl field
      expect(keywordMatch).toHaveProperty('sourceUrl');
      expect((keywordMatch as any).sourceUrl).toBe('https://www.nyse.com/markets/hours-calendars');
      
      // ASSERTION 2: When saved to database, retrievalResult.sourceUrl should use keywordMatch.sourceUrl
      // This will be tested in the integration test below
    });

    it('should extract sourceUrl from LLM response and use it in retrieval results - Document URL case', async () => {
      // Mock LLM response with sourceUrl pointing to a document
      const mockLLMResponse = JSON.stringify({
        keywordResults: [
          {
            keyword: 'compliance',
            found: true,
            content: 'SEC compliance requirements for market data...',
            sourceUrl: 'https://www.sec.gov/rules/final/2023/33-11234.pdf',
            context: 'The SEC has established compliance requirements...'
          }
        ]
      });

      const contentRetriever = new ContentRetriever();
      (contentRetriever as any).callLLM = jest.fn().mockResolvedValue(mockLLMResponse);
      (contentRetriever as any).fetchPageContent = jest.fn().mockResolvedValue('<html>Main page content</html>');

      const result = await contentRetriever.retrieveFromWebsite(
        'https://www.sec.gov',
        ['compliance']
      );

      expect(result.keywordMatches).toHaveLength(1);
      const keywordMatch = result.keywordMatches[0];
      
      // This assertion will FAIL on unfixed code
      expect(keywordMatch).toHaveProperty('sourceUrl');
      expect((keywordMatch as any).sourceUrl).toBe('https://www.sec.gov/rules/final/2023/33-11234.pdf');
    });

    it('should extract different sourceUrls for multiple keywords', async () => {
      // Mock LLM response with multiple keywords having different sourceUrls
      const mockLLMResponse = JSON.stringify({
        keywordResults: [
          {
            keyword: 'market data',
            found: true,
            content: 'Market data pricing information...',
            sourceUrl: 'https://www.nasdaq.com/market-activity/stocks',
            context: 'NASDAQ provides market data...'
          },
          {
            keyword: 'trading fees',
            found: true,
            content: 'Trading fees schedule...',
            sourceUrl: 'https://www.nasdaq.com/solutions/trading-fees',
            context: 'The trading fees are structured...'
          }
        ]
      });

      const contentRetriever = new ContentRetriever();
      (contentRetriever as any).callLLM = jest.fn().mockResolvedValue(mockLLMResponse);
      (contentRetriever as any).fetchPageContent = jest.fn().mockResolvedValue('<html>Main page content</html>');

      const result = await contentRetriever.retrieveFromWebsite(
        'https://www.nasdaq.com',
        ['market data', 'trading fees']
      );

      expect(result.keywordMatches).toHaveLength(2);
      
      // This assertion will FAIL on unfixed code - all keywords will have same websiteUrl
      expect(result.keywordMatches[0]).toHaveProperty('sourceUrl');
      expect((result.keywordMatches[0] as any).sourceUrl).toBe('https://www.nasdaq.com/market-activity/stocks');
      
      expect(result.keywordMatches[1]).toHaveProperty('sourceUrl');
      expect((result.keywordMatches[1] as any).sourceUrl).toBe('https://www.nasdaq.com/solutions/trading-fees');
    });
  });

  describe('Integration Test: TaskScheduler should use sourceUrl from KeywordMatch', () => {
    it('should save retrieval results with sourceUrl from KeywordMatch, not websiteUrl', async () => {
      // This test verifies the complete flow from LLM response to database save
      
      // Mock repositories
      const mockTaskRepo = {
        findById: jest.fn().mockResolvedValue({
          id: 'task-1',
          userId: 'user-1',
          name: 'Test Task',
          keywords: ['trading hours'],
          targetWebsites: ['https://www.nyse.com/index'],
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

      // Mock SubagentOrchestrator to return results with keywordMatches containing sourceUrl
      const mockOrchestrator = {
        executeParallel: jest.fn().mockResolvedValue({
          results: [
            {
              websiteUrl: 'https://www.nyse.com/index',
              status: 'success' as const,
              keywordMatches: [
                {
                  keyword: 'trading hours',
                  found: true,
                  occurrences: 1,
                  contexts: ['NYSE trading hours are from 9:30 AM to 4:00 PM ET'],
                  sourceUrl: 'https://www.nyse.com/markets/hours-calendars' // This is the specific sub-page
                }
              ],
              documentResults: [],
              retrievedAt: new Date()
            }
          ],
          totalDuration: 1000,
          successCount: 1,
          failureCount: 0
        })
      } as unknown as SubagentOrchestrator;

      // Mock AnalysisService
      const mockAnalysisService = {
        generateSummary: jest.fn().mockResolvedValue(undefined),
        compareResults: jest.fn().mockResolvedValue(undefined),
        analyzeCrossSite: jest.fn().mockResolvedValue(undefined)
      } as unknown as AnalysisService;

      // Create TaskScheduler with mocked dependencies
      const taskScheduler = new TaskScheduler(
        undefined,
        mockTaskRepo,
        mockExecutionRepo,
        mockRetrievalResultRepo,
        mockOrchestrator,
        mockAnalysisService,
        'test-task-execution'
      );

      // Execute task
      await taskScheduler.executeTask('task-1');

      // ASSERTION: Verify that the saved retrieval result uses sourceUrl from KeywordMatch
      expect(savedResults).toHaveLength(1);
      const savedResult = savedResults[0];
      
      // This assertion will FAIL on unfixed code because TaskScheduler uses result.websiteUrl
      expect(savedResult.sourceUrl).toBe('https://www.nyse.com/markets/hours-calendars');
      expect(savedResult.sourceUrl).not.toBe('https://www.nyse.com/index'); // Should NOT be the main website URL
    });
  });
});
