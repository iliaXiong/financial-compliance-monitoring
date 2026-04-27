import { ContentRetriever } from '../ContentRetriever';
import { WebsiteAnalyzer } from '../WebsiteAnalyzer';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock WebsiteAnalyzer
jest.mock('../WebsiteAnalyzer');
const MockedWebsiteAnalyzer = WebsiteAnalyzer as jest.MockedClass<
  typeof WebsiteAnalyzer
>;

describe('ContentRetriever', () => {
  let contentRetriever: ContentRetriever;
  let mockWebsiteAnalyzer: jest.Mocked<WebsiteAnalyzer>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock WebsiteAnalyzer instance
    mockWebsiteAnalyzer = new MockedWebsiteAnalyzer() as jest.Mocked<WebsiteAnalyzer>;
    contentRetriever = new ContentRetriever(mockWebsiteAnalyzer);
  });

  describe('fetchPageContent', () => {
    it('should fetch page content successfully', async () => {
      const mockHtml = '<html><body>Test content</body></html>';
      mockedAxios.get.mockResolvedValueOnce({ data: mockHtml });

      const result = await contentRetriever.fetchPageContent(
        'https://example.com'
      );

      expect(result).toBe(mockHtml);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          timeout: 30000,
          maxRedirects: 5,
        })
      );
    });

    it('should retry on network errors', async () => {
      const mockHtml = '<html><body>Success after retry</body></html>';

      // First two attempts fail, third succeeds
      mockedAxios.get
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: mockHtml });

      const result = await contentRetriever.fetchPageContent(
        'https://example.com'
      );

      expect(result).toBe(mockHtml);
      expect(mockedAxios.get).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max retries', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      await expect(
        contentRetriever.fetchPageContent('https://example.com')
      ).rejects.toThrow();

      expect(mockedAxios.get).toHaveBeenCalledTimes(3);
    });

    it('should not retry on 4xx client errors', async () => {
      const error = {
        isAxiosError: true,
        response: { status: 404, statusText: 'Not Found' },
      };
      mockedAxios.get.mockRejectedValueOnce(error);
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(
        contentRetriever.fetchPageContent('https://example.com')
      ).rejects.toThrow('Client error 404');

      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('readDocument', () => {
    it('should read document using Jina Reader API', async () => {
      const mockContent = 'Document content from Jina Reader';
      mockedAxios.get.mockResolvedValueOnce({ data: mockContent });

      const result = await contentRetriever.readDocument(
        'https://example.com/doc.pdf'
      );

      expect(result).toBe(mockContent);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://r.jina.ai/https://example.com/doc.pdf',
        expect.objectContaining({
          timeout: 60000, // 2x normal timeout for documents
        })
      );
    });

    it('should retry on document reading errors', async () => {
      const mockContent = 'Document content';

      mockedAxios.get
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce({ data: mockContent });

      const result = await contentRetriever.readDocument(
        'https://example.com/doc.pdf'
      );

      expect(result).toBe(mockContent);
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });

    it('should throw error after max retries for documents', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Jina Reader error'));

      await expect(
        contentRetriever.readDocument('https://example.com/doc.pdf')
      ).rejects.toThrow();

      expect(mockedAxios.get).toHaveBeenCalledTimes(3);
    });
  });

  describe('searchKeywords', () => {
    it('should find keywords in plain text content', () => {
      const content = 'This is a test about financial regulation and compliance policy.';
      const keywords = ['regulation', 'compliance'];

      const results = contentRetriever.searchKeywords(content, keywords);

      expect(results).toHaveLength(2);
      expect(results[0]).toMatchObject({
        keyword: 'regulation',
        found: true,
        occurrences: 1,
      });
      expect(results[1]).toMatchObject({
        keyword: 'compliance',
        found: true,
        occurrences: 1,
      });
    });

    it('should find keywords in HTML content', () => {
      const content =
        '<html><body><p>Financial regulation is important. Regulation helps maintain order.</p></body></html>';
      const keywords = ['regulation'];

      const results = contentRetriever.searchKeywords(content, keywords);

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        keyword: 'regulation',
        found: true,
        occurrences: 2,
      });
    });

    it('should be case-insensitive', () => {
      const content = 'REGULATION, Regulation, regulation';
      const keywords = ['regulation'];

      const results = contentRetriever.searchKeywords(content, keywords);

      expect(results[0]).toMatchObject({
        keyword: 'regulation',
        found: true,
        occurrences: 3,
      });
    });

    it('should return not found for missing keywords', () => {
      const content = 'This is some content';
      const keywords = ['missing', 'notfound'];

      const results = contentRetriever.searchKeywords(content, keywords);

      expect(results).toHaveLength(2);
      expect(results[0]).toMatchObject({
        keyword: 'missing',
        found: false,
        occurrences: 0,
        contexts: [],
      });
      expect(results[1]).toMatchObject({
        keyword: 'notfound',
        found: false,
        occurrences: 0,
        contexts: [],
      });
    });
  });

  describe('extractContext', () => {
    it('should extract context around keyword', () => {
      const content =
        'This is some text before the keyword regulation and some text after the keyword.';
      const keyword = 'regulation';

      const contexts = contentRetriever.extractContext(content, keyword, 20);

      expect(contexts).toHaveLength(1);
      expect(contexts[0]).toContain('regulation');
      expect(contexts[0]).toContain('keyword');
    });

    it('should add ellipsis when context is truncated', () => {
      const content = 'A'.repeat(200) + ' regulation ' + 'B'.repeat(200);
      const keyword = 'regulation';

      const contexts = contentRetriever.extractContext(content, keyword, 50);

      expect(contexts[0]).toMatch(/^\.\.\./);
      expect(contexts[0]).toMatch(/\.\.\.$/);
    });

    it('should limit to 5 contexts', () => {
      const content = 'regulation '.repeat(10);
      const keyword = 'regulation';

      const contexts = contentRetriever.extractContext(content, keyword);

      expect(contexts.length).toBeLessThanOrEqual(5);
    });

    it('should handle keyword at start of content', () => {
      const content = 'regulation is important for financial markets';
      const keyword = 'regulation';

      const contexts = contentRetriever.extractContext(content, keyword, 20);

      expect(contexts[0]).not.toMatch(/^\.\.\./);
      expect(contexts[0]).toContain('regulation');
    });

    it('should handle keyword at end of content', () => {
      const content = 'Financial markets need regulation';
      const keyword = 'regulation';

      const contexts = contentRetriever.extractContext(content, keyword, 20);

      expect(contexts[0]).not.toMatch(/\.\.\.$/);
      expect(contexts[0]).toContain('regulation');
    });
  });

  describe('retrieveFromWebsite', () => {
    it('should retrieve content and search keywords successfully', async () => {
      const mockHtml =
        '<html><body>Financial regulation and compliance policy</body></html>';

      // Mock WebsiteAnalyzer
      mockWebsiteAnalyzer.analyze.mockResolvedValueOnce({
        websiteUrl: 'https://example.com',
        pageLinks: ['https://example.com/page1'],
        documentLinks: [],
        analyzedAt: new Date(),
      });

      // Mock page content fetch
      mockedAxios.get.mockResolvedValueOnce({ data: mockHtml });

      const result = await contentRetriever.retrieveFromWebsite(
        'https://example.com',
        ['regulation', 'compliance']
      );

      expect(result.status).toBe('success');
      expect(result.websiteUrl).toBe('https://example.com');
      expect(result.keywordMatches).toHaveLength(2);
      expect(result.keywordMatches[0].keyword).toBe('regulation');
      expect(result.keywordMatches[0].found).toBe(true);
      expect(result.keywordMatches[1].keyword).toBe('compliance');
      expect(result.keywordMatches[1].found).toBe(true);
    });

    it('should process documents when found', async () => {
      const mockHtml = '<html><body>Page content</body></html>';
      const mockDocContent = 'Document content with regulation keyword';

      // Mock WebsiteAnalyzer with document links
      mockWebsiteAnalyzer.analyze.mockResolvedValueOnce({
        websiteUrl: 'https://example.com',
        pageLinks: [],
        documentLinks: [
          { url: 'https://example.com/doc.pdf', type: 'pdf' },
        ],
        analyzedAt: new Date(),
      });

      // Mock page content fetch
      mockedAxios.get.mockResolvedValueOnce({ data: mockHtml });

      // Mock document content fetch via Jina Reader
      mockedAxios.get.mockResolvedValueOnce({ data: mockDocContent });

      const result = await contentRetriever.retrieveFromWebsite(
        'https://example.com',
        ['regulation']
      );

      expect(result.status).toBe('success');
      expect(result.documentResults).toHaveLength(1);
      expect(result.documentResults[0].status).toBe('success');
      expect(result.documentResults[0].keywordMatches[0].found).toBe(true);
    });

    it('should handle website analysis errors gracefully', async () => {
      // Mock WebsiteAnalyzer with error
      mockWebsiteAnalyzer.analyze.mockResolvedValueOnce({
        websiteUrl: 'https://example.com',
        pageLinks: [],
        documentLinks: [],
        analyzedAt: new Date(),
        error: 'Connection timeout',
      });

      const result = await contentRetriever.retrieveFromWebsite(
        'https://example.com',
        ['regulation']
      );

      expect(result.status).toBe('failed');
      expect(result.error).toBe('Connection timeout');
      expect(result.keywordMatches).toHaveLength(0);
    });

    it('should continue when document reading fails', async () => {
      const mockHtml = '<html><body>Page with regulation</body></html>';

      // Mock WebsiteAnalyzer with document links
      mockWebsiteAnalyzer.analyze.mockResolvedValueOnce({
        websiteUrl: 'https://example.com',
        pageLinks: [],
        documentLinks: [
          { url: 'https://example.com/doc.pdf', type: 'pdf' },
        ],
        analyzedAt: new Date(),
      });

      // Mock page content fetch (succeeds)
      mockedAxios.get.mockResolvedValueOnce({ data: mockHtml });

      // Mock document fetch (fails)
      mockedAxios.get.mockRejectedValueOnce(new Error('Document not found'));

      const result = await contentRetriever.retrieveFromWebsite(
        'https://example.com',
        ['regulation']
      );

      // Should still succeed with page content
      expect(result.status).toBe('success');
      expect(result.keywordMatches[0].found).toBe(true);

      // Document should be marked as failed
      expect(result.documentResults).toHaveLength(1);
      expect(result.documentResults[0].status).toBe('failed');
      expect(result.documentResults[0].error).toBeDefined();
    });
  });

  describe('retrieveFromMultipleWebsites', () => {
    it('should process multiple websites in parallel', async () => {
      const websites = [
        'https://example1.com',
        'https://example2.com',
        'https://example3.com',
      ];

      // Mock WebsiteAnalyzer for all websites
      mockWebsiteAnalyzer.analyze
        .mockResolvedValueOnce({
          websiteUrl: websites[0],
          pageLinks: [],
          documentLinks: [],
          analyzedAt: new Date(),
        })
        .mockResolvedValueOnce({
          websiteUrl: websites[1],
          pageLinks: [],
          documentLinks: [],
          analyzedAt: new Date(),
        })
        .mockResolvedValueOnce({
          websiteUrl: websites[2],
          pageLinks: [],
          documentLinks: [],
          analyzedAt: new Date(),
        });

      // Mock page content fetches
      mockedAxios.get
        .mockResolvedValueOnce({ data: '<html>Content 1 with regulation</html>' })
        .mockResolvedValueOnce({ data: '<html>Content 2 with compliance</html>' })
        .mockResolvedValueOnce({ data: '<html>Content 3 with policy</html>' });

      const results = await contentRetriever.retrieveFromMultipleWebsites(
        websites,
        ['regulation', 'compliance', 'policy']
      );

      expect(results).toHaveLength(3);
      expect(results[0].status).toBe('success');
      expect(results[1].status).toBe('success');
      expect(results[2].status).toBe('success');
    });

    it('should continue processing when one website fails', async () => {
      const websites = [
        'https://example1.com',
        'https://example2.com',
        'https://example3.com',
      ];

      // Mock WebsiteAnalyzer - second one fails
      mockWebsiteAnalyzer.analyze
        .mockResolvedValueOnce({
          websiteUrl: websites[0],
          pageLinks: [],
          documentLinks: [],
          analyzedAt: new Date(),
        })
        .mockResolvedValueOnce({
          websiteUrl: websites[1],
          pageLinks: [],
          documentLinks: [],
          analyzedAt: new Date(),
          error: 'Connection timeout',
        })
        .mockResolvedValueOnce({
          websiteUrl: websites[2],
          pageLinks: [],
          documentLinks: [],
          analyzedAt: new Date(),
        });

      // Mock page content fetches (only for successful ones)
      mockedAxios.get
        .mockResolvedValueOnce({ data: '<html>Content 1</html>' })
        .mockResolvedValueOnce({ data: '<html>Content 3</html>' });

      const results = await contentRetriever.retrieveFromMultipleWebsites(
        websites,
        ['regulation']
      );

      expect(results).toHaveLength(3);
      expect(results[0].status).toBe('success');
      expect(results[1].status).toBe('failed');
      expect(results[1].error).toBe('Connection timeout');
      expect(results[2].status).toBe('success');
    });

    it('should handle all websites failing', async () => {
      const websites = ['https://example1.com', 'https://example2.com'];

      // Mock WebsiteAnalyzer - all fail
      mockWebsiteAnalyzer.analyze
        .mockResolvedValueOnce({
          websiteUrl: websites[0],
          pageLinks: [],
          documentLinks: [],
          analyzedAt: new Date(),
          error: 'Error 1',
        })
        .mockResolvedValueOnce({
          websiteUrl: websites[1],
          pageLinks: [],
          documentLinks: [],
          analyzedAt: new Date(),
          error: 'Error 2',
        });

      const results = await contentRetriever.retrieveFromMultipleWebsites(
        websites,
        ['regulation']
      );

      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('failed');
      expect(results[1].status).toBe('failed');
    });
  });
});
