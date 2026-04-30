import { SimpleRetriever } from '../SimpleRetriever';

describe('SimpleRetriever', () => {
  let retriever: SimpleRetriever;

  beforeEach(() => {
    retriever = new SimpleRetriever();
  });

  describe('chunkContent', () => {
    it('should split content by paragraphs', () => {
      const content = 'Paragraph 1 content. This is the first paragraph and it needs to be long enough to be retained as a valid chunk. We ensure this paragraph exceeds the minimum length requirement.\n\nParagraph 2 content. This is the second paragraph and it also needs to be long enough. We continue adding more text to ensure this paragraph also meets the minimum length requirement.\n\nParagraph 3 content. This is the third paragraph and it also needs to be long enough. Let us add some more text to meet the length requirement.';
      const chunks = retriever.chunkContent(content, 'https://example.com', 'main');

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].content).toContain('Paragraph 1');
    });

    it('should handle long paragraphs by splitting into sentences', () => {
      const longParagraph = '这是一个很长的段落，包含了很多内容。'.repeat(50);
      const chunks = retriever.chunkContent(longParagraph, 'https://example.com', 'main');

      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach((chunk) => {
        expect(chunk.content.length).toBeLessThanOrEqual(500);
      });
    });

    it('should preserve metadata', () => {
      const content = 'This is a test paragraph that needs to be long enough to be retained. We add more text to ensure this paragraph meets the minimum length requirement so it will be processed correctly. Let us continue adding more content to ensure it exceeds the 100 character limit.';
      const chunks = retriever.chunkContent(content, 'https://example.com', 'main');

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].sourceUrl).toBe('https://example.com');
      expect(chunks[0].pageType).toBe('main');
      expect(chunks[0].chunkIndex).toBe(0);
    });

    it('should filter out chunks smaller than minChunkSize', () => {
      const content = '短。\n\n这是一个足够长的段落，应该被保留下来。我们需要确保这个段落的长度超过100个字符，这样它才会被作为一个有效的chunk保存下来。';
      const chunks = retriever.chunkContent(content, 'https://example.com', 'main');

      chunks.forEach((chunk) => {
        expect(chunk.content.length).toBeGreaterThanOrEqual(100);
      });
    });
  });

  describe('buildIndex and retrieve', () => {
    beforeEach(() => {
      const chunks = [
        {
          id: '1',
          content: '金融机构应当建立反洗钱制度。这是关于反洗钱的重要规定。',
          sourceUrl: 'https://example.com/page1',
          chunkIndex: 0,
          pageType: 'main' as const,
        },
        {
          id: '2',
          content: '客户身份识别是反洗钱的重要环节。金融机构必须严格执行。',
          sourceUrl: 'https://example.com/page2',
          chunkIndex: 0,
          pageType: 'subpage' as const,
        },
        {
          id: '3',
          content: '数据保留期限应符合监管要求。所有记录必须保存至少五年。',
          sourceUrl: 'https://example.com/page3',
          chunkIndex: 0,
          pageType: 'document' as const,
        },
      ];

      retriever.buildIndex(chunks);
    });

    it('should retrieve relevant chunks', () => {
      const results = retriever.retrieve('反洗钱', 10);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].content).toContain('反洗钱');
    });

    it('should limit results to topK', () => {
      const results = retriever.retrieve('金融', 1);

      expect(results.length).toBe(1);
    });

    it('should return chunks with scores', () => {
      const results = retriever.retrieve('反洗钱', 10);

      results.forEach((chunk) => {
        expect(chunk.score).toBeDefined();
        expect(typeof chunk.score).toBe('number');
      });
    });

    it('should return empty array when no chunks indexed', () => {
      const emptyRetriever = new SimpleRetriever();
      const results = emptyRetriever.retrieve('test', 10);

      expect(results).toEqual([]);
    });
  });

  describe('retrieveMultiple', () => {
    beforeEach(() => {
      const chunks = [
        {
          id: '1',
          content: '金融机构应当建立反洗钱制度。',
          sourceUrl: 'https://example.com/page1',
          chunkIndex: 0,
          pageType: 'main' as const,
        },
        {
          id: '2',
          content: '客户身份识别是反洗钱的重要环节。',
          sourceUrl: 'https://example.com/page2',
          chunkIndex: 0,
          pageType: 'subpage' as const,
        },
      ];

      retriever.buildIndex(chunks);
    });

    it('should retrieve chunks for multiple keywords', () => {
      const results = retriever.retrieveMultiple(['反洗钱', '客户身份'], 5);

      expect(results.size).toBe(2);
      expect(results.has('反洗钱')).toBe(true);
      expect(results.has('客户身份')).toBe(true);
    });
  });

  describe('getChunkCount', () => {
    it('should return correct chunk count', () => {
      const chunks = [
        {
          id: '1',
          content: '测试内容1',
          sourceUrl: 'https://example.com',
          chunkIndex: 0,
          pageType: 'main' as const,
        },
        {
          id: '2',
          content: '测试内容2',
          sourceUrl: 'https://example.com',
          chunkIndex: 1,
          pageType: 'main' as const,
        },
      ];

      retriever.buildIndex(chunks);
      expect(retriever.getChunkCount()).toBe(2);
    });
  });
});
