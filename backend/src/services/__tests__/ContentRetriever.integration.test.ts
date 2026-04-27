import { ContentRetriever } from '../ContentRetriever';
import { WebsiteAnalyzer } from '../WebsiteAnalyzer';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

/**
 * Integration tests for ContentRetriever
 * These tests verify error tolerance and multi-website processing
 */
describe('ContentRetriever Integration Tests', () => {
  let contentRetriever: ContentRetriever;

  beforeEach(() => {
    jest.clearAllMocks();
    contentRetriever = new ContentRetriever();
  });

  describe('Error Tolerance - Requirement 3.4 and 4.4', () => {
    it('should continue processing page content when document reading fails', async () => {
      // Mock website analysis with document link
      mockedAxios.get
        .mockResolvedValueOnce({
          data: '<html><body><a href="doc.pdf">Policy Document</a><p>Page content with regulation</p></body></html>',
        })
        .mockResolvedValueOnce({
          data: '<html><body><p>Page content with regulation</p></body></html>',
        });

      // Mock document reading failure via Jina Reader
      mockedAxios.get.mockRejectedValueOnce(new Error('Document not accessible'));

      const result = await contentRetriever.retrieveFromWebsite(
        'https://example.com',
        ['regulation']
      );

      // Should succeed with page content even though document failed
      expect(result.status).toBe('success');
      expect(result.keywordMatches[0].found).toBe(true);
      expect(result.keywordMatches[0].keyword).toBe('regulation');

      // Document should be marked as failed
      expect(result.documentResults).toHaveLength(1);
      expect(result.documentResults[0].status).toBe('failed');
      expect(result.documentResults[0].error).toBeDefined();
    });

    it('should process all documents even when some fail', async () => {
      // Mock website analysis with multiple document links
      mockedAxios.get
        .mockResolvedValueOnce({
          data: `<html><body>
            <a href="doc1.pdf">Document 1</a>
            <a href="doc2.pdf">Document 2</a>
            <a href="doc3.pdf">Document 3</a>
          </body></html>`,
        })
        .mockResolvedValueOnce({
          data: '<html><body>Page content</body></html>',
        });

      // Mock document reading: doc1 succeeds, doc2 fails, doc3 succeeds
      mockedAxios.get
        .mockResolvedValueOnce({ data: 'Document 1 content with regulation' })
        .mockRejectedValueOnce(new Error('Document 2 not found'))
        .mockResolvedValueOnce({ data: 'Document 3 content with compliance' });

      const result = await contentRetriever.retrieveFromWebsite(
        'https://example.com',
        ['regulation', 'compliance']
      );

      expect(result.status).toBe('success');
      expect(result.documentResults).toHaveLength(3);

      // Doc 1: Success
      expect(result.documentResults[0].status).toBe('success');
      expect(result.documentResults[0].keywordMatches[0].found).toBe(true);

      // Doc 2: Failed
      expect(result.documentResults[1].status).toBe('failed');
      expect(result.documentResults[1].error).toBeDefined();

      // Doc 3: Success
      expect(result.documentResults[2].status).toBe('success');
      expect(result.documentResults[2].keywordMatches[1].found).toBe(true);
    });
  });

  describe('Keyword Search - Requirement 3.1 and 3.2', () => {
    it('should search for all keywords in website content', async () => {
      const keywords = ['regulation', 'compliance', 'policy', 'guideline'];

      mockedAxios.get
        .mockResolvedValueOnce({
          data: '<html><body><a href="page.html">Info</a></body></html>',
        })
        .mockResolvedValueOnce({
          data: '<html><body>Content about regulation and compliance policy</body></html>',
        });

      const result = await contentRetriever.retrieveFromWebsite(
        'https://example.com',
        keywords
      );

      expect(result.status).toBe('success');
      expect(result.keywordMatches).toHaveLength(4);

      // regulation: found
      expect(result.keywordMatches[0].keyword).toBe('regulation');
      expect(result.keywordMatches[0].found).toBe(true);
      expect(result.keywordMatches[0].occurrences).toBe(1);

      // compliance: found
      expect(result.keywordMatches[1].keyword).toBe('compliance');
      expect(result.keywordMatches[1].found).toBe(true);

      // policy: found
      expect(result.keywordMatches[2].keyword).toBe('policy');
      expect(result.keywordMatches[2].found).toBe(true);

      // guideline: not found
      expect(result.keywordMatches[3].keyword).toBe('guideline');
      expect(result.keywordMatches[3].found).toBe(false);
      expect(result.keywordMatches[3].occurrences).toBe(0);
    });

    it('should extract context around found keywords', async () => {
      const content = `
        Financial regulation is a critical component of market stability.
        The regulation framework ensures that all participants follow the rules.
      `;

      mockedAxios.get
        .mockResolvedValueOnce({
          data: '<html><body></body></html>',
        })
        .mockResolvedValueOnce({
          data: `<html><body>${content}</body></html>`,
        });

      const result = await contentRetriever.retrieveFromWebsite(
        'https://example.com',
        ['regulation']
      );

      expect(result.status).toBe('success');
      expect(result.keywordMatches[0].found).toBe(true);
      expect(result.keywordMatches[0].contexts.length).toBeGreaterThan(0);

      // Context should contain the keyword and surrounding text
      const context = result.keywordMatches[0].contexts[0];
      expect(context).toContain('regulation');
      expect(context.toLowerCase()).toMatch(/financial|market|framework/);
    });
  });

  describe('Document Reading - Requirement 4.2 and 4.3', () => {
    it('should use Jina Reader API to read document content', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({
          data: '<html><body><a href="https://example.com/policy.pdf">Policy PDF</a></body></html>',
        })
        .mockResolvedValueOnce({
          data: '<html><body>Page content</body></html>',
        })
        .mockResolvedValueOnce({
          data: 'PDF content extracted by Jina Reader with regulation details',
        });

      const result = await contentRetriever.retrieveFromWebsite(
        'https://example.com',
        ['regulation']
      );

      expect(result.status).toBe('success');
      expect(result.documentResults).toHaveLength(1);

      // Verify Jina Reader API was called
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('https://r.jina.ai/'),
        expect.any(Object)
      );

      // Verify keyword was found in document
      expect(result.documentResults[0].status).toBe('success');
      expect(result.documentResults[0].keywordMatches[0].found).toBe(true);
    });

    it('should search keywords in document content', async () => {
      const documentContent = `
        This policy document outlines the financial regulation requirements.
        All institutions must comply with the compliance framework.
      `;

      mockedAxios.get
        .mockResolvedValueOnce({
          data: '<html><body><a href="doc.pdf">Document</a></body></html>',
        })
        .mockResolvedValueOnce({
          data: '<html><body>Page</body></html>',
        })
        .mockResolvedValueOnce({
          data: documentContent,
        });

      const result = await contentRetriever.retrieveFromWebsite(
        'https://example.com',
        ['regulation', 'compliance', 'missing']
      );

      expect(result.documentResults).toHaveLength(1);
      const docResult = result.documentResults[0];

      expect(docResult.status).toBe('success');
      expect(docResult.keywordMatches).toHaveLength(3);

      // regulation: found
      expect(docResult.keywordMatches[0].found).toBe(true);

      // compliance: found
      expect(docResult.keywordMatches[1].found).toBe(true);

      // missing: not found
      expect(docResult.keywordMatches[2].found).toBe(false);
    });
  });
});
