import { SubagentOrchestrator, ISubagentOrchestrator } from '../SubagentOrchestrator';
import { IContentRetriever, ContentRetrievalResult } from '../ContentRetriever';

describe('SubagentOrchestrator', () => {
  let orchestrator: ISubagentOrchestrator;
  let mockContentRetriever: jest.Mocked<IContentRetriever>;

  beforeEach(() => {
    // Create mock ContentRetriever
    mockContentRetriever = {
      retrieveFromWebsite: jest.fn(),
      retrieveFromMultipleWebsites: jest.fn(),
    };

    orchestrator = new SubagentOrchestrator(mockContentRetriever);
  });

  describe('executeParallel', () => {
    it('should throw error when no websites provided', async () => {
      await expect(
        orchestrator.executeParallel([], ['keyword1'])
      ).rejects.toThrow('At least one website URL is required');
    });

    it('should throw error when no keywords provided', async () => {
      await expect(
        orchestrator.executeParallel(['https://example.com'], [])
      ).rejects.toThrow('At least one keyword is required');
    });

    it('should execute parallel retrieval for multiple websites', async () => {
      const websites = [
        'https://example1.com',
        'https://example2.com',
        'https://example3.com',
      ];
      const keywords = ['keyword1', 'keyword2'];

      const mockResults: ContentRetrievalResult[] = websites.map((url) => ({
        websiteUrl: url,
        status: 'success',
        keywordMatches: [
          { keyword: 'keyword1', found: true, occurrences: 2, contexts: [] },
          { keyword: 'keyword2', found: false, occurrences: 0, contexts: [] },
        ],
        documentResults: [],
        retrievedAt: new Date(),
      }));

      mockContentRetriever.retrieveFromWebsite
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1])
        .mockResolvedValueOnce(mockResults[2]);

      const result = await orchestrator.executeParallel(websites, keywords);

      expect(result.totalWebsites).toBe(3);
      expect(result.successCount).toBe(3);
      expect(result.failedCount).toBe(0);
      expect(result.timedOut).toBe(false);
      expect(result.results).toHaveLength(3);
      expect(mockContentRetriever.retrieveFromWebsite).toHaveBeenCalledTimes(3);
    });

    it('should handle partial failures gracefully', async () => {
      const websites = [
        'https://example1.com',
        'https://example2.com',
        'https://example3.com',
      ];
      const keywords = ['keyword1'];

      const successResult: ContentRetrievalResult = {
        websiteUrl: websites[0],
        status: 'success',
        keywordMatches: [
          { keyword: 'keyword1', found: true, occurrences: 1, contexts: [] },
        ],
        documentResults: [],
        retrievedAt: new Date(),
      };

      const failedResult: ContentRetrievalResult = {
        websiteUrl: websites[1],
        status: 'failed',
        keywordMatches: [],
        documentResults: [],
        error: 'Network error',
        retrievedAt: new Date(),
      };

      mockContentRetriever.retrieveFromWebsite
        .mockResolvedValueOnce(successResult)
        .mockResolvedValueOnce(failedResult)
        .mockResolvedValueOnce(successResult);

      const result = await orchestrator.executeParallel(websites, keywords);

      expect(result.totalWebsites).toBe(3);
      expect(result.successCount).toBe(2);
      expect(result.failedCount).toBe(1);
      expect(result.timedOut).toBe(false);
      expect(result.results).toHaveLength(3);
    });

    it('should respect timeout and return partial results', async () => {
      const websites = ['https://slow-website.com', 'https://fast-website.com'];
      const keywords = ['keyword1'];
      const shortTimeout = 100; // 100ms timeout

      // Mock slow response
      mockContentRetriever.retrieveFromWebsite.mockImplementation(
        async (url) => {
          if (url === websites[0]) {
            // Simulate slow response that exceeds timeout
            await new Promise((resolve) => setTimeout(resolve, 200));
          }
          return {
            websiteUrl: url,
            status: 'success',
            keywordMatches: [],
            documentResults: [],
            retrievedAt: new Date(),
          };
        }
      );

      const result = await orchestrator.executeParallel(
        websites,
        keywords,
        shortTimeout
      );

      expect(result.totalWebsites).toBe(2);
      expect(result.timedOut).toBe(true);
      expect(result.executionTime).toBeGreaterThanOrEqual(shortTimeout);
    });

    it('should collect results from all websites even if some reject', async () => {
      const websites = [
        'https://example1.com',
        'https://example2.com',
      ];
      const keywords = ['keyword1'];

      mockContentRetriever.retrieveFromWebsite
        .mockResolvedValueOnce({
          websiteUrl: websites[0],
          status: 'success',
          keywordMatches: [],
          documentResults: [],
          retrievedAt: new Date(),
        })
        .mockRejectedValueOnce(new Error('Connection failed'));

      const result = await orchestrator.executeParallel(websites, keywords);

      expect(result.totalWebsites).toBe(2);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].status).toBe('success');
      expect(result.results[1].status).toBe('failed');
      expect(result.results[1].error).toContain('Connection failed');
    });

    it('should include execution metadata in result', async () => {
      const websites = ['https://example.com'];
      const keywords = ['keyword1'];

      mockContentRetriever.retrieveFromWebsite.mockResolvedValue({
        websiteUrl: websites[0],
        status: 'success',
        keywordMatches: [],
        documentResults: [],
        retrievedAt: new Date(),
      });

      const result = await orchestrator.executeParallel(websites, keywords);

      expect(result.totalWebsites).toBe(1);
      expect(result.successCount).toBeDefined();
      expect(result.failedCount).toBeDefined();
      expect(result.timedOut).toBeDefined();
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.completedAt).toBeInstanceOf(Date);
    });
  });
});
