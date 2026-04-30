/**
 * ContentRetriever优化版本集成测试
 * 测试SimpleRetriever和DebugLogger的集成
 */

import { ContentRetriever } from '../ContentRetriever';
import { WebsiteAnalyzer } from '../WebsiteAnalyzer';

// Mock axios for HTTP requests
jest.mock('axios');
import axios from 'axios';
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ContentRetriever - Optimized Integration Tests', () => {
  let retriever: ContentRetriever;
  let mockLLMApiKey: string;
  let mockLLMApiUrl: string;

  beforeEach(() => {
    // 设置环境变量
    process.env.DEBUG_MODE = 'true';
    process.env.MAX_CHUNKS_PER_KEYWORD = '30';
    process.env.CHUNK_MAX_SIZE = '500';
    process.env.CHUNK_MIN_SIZE = '100';
    process.env.CHUNK_OVERLAP = '50';
    process.env.ENABLE_WEBSITE_ANALYZER = 'false'; // 禁用WebsiteAnalyzer简化测试

    mockLLMApiKey = 'test-api-key';
    mockLLMApiUrl = 'https://api.test.com/v1/chat/completions';

    retriever = new ContentRetriever(
      undefined,
      mockLLMApiKey,
      mockLLMApiUrl,
      'test-model'
    );

    // 清除所有mock
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.DEBUG_MODE;
    delete process.env.MAX_CHUNKS_PER_KEYWORD;
    delete process.env.CHUNK_MAX_SIZE;
    delete process.env.CHUNK_MIN_SIZE;
    delete process.env.CHUNK_OVERLAP;
    delete process.env.ENABLE_WEBSITE_ANALYZER;
  });

  describe('retrieveFromWebsite with optimization', () => {
    it('should use SimpleRetriever to chunk and retrieve content', async () => {
      // Mock网页内容 - 使用纯文本格式（模拟Jina Reader的输出）
      const mockTextContent = `Financial Compliance Policy

Anti-money laundering (AML) refers to the laws, regulations, and procedures intended to prevent criminals from disguising illegally obtained funds as legitimate income. Financial institutions must establish comprehensive AML programs.

Customer due diligence (CDD) is a critical component of AML compliance. It involves verifying the identity of customers and assessing their risk profile. Enhanced due diligence may be required for high-risk customers.

Data retention policies require financial institutions to maintain records for a minimum of five years. This includes transaction records, customer identification documents, and compliance reports.`;

      // Mock Jina Reader响应
      mockedAxios.get.mockResolvedValueOnce({
        data: mockTextContent,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      // Mock LLM响应
      const mockLLMResponse = {
        keyword: 'anti-money laundering',
        found: true,
        definition: 'Laws, regulations, and procedures intended to prevent criminals from disguising illegally obtained funds as legitimate income.',
        quotedSentence: 'Anti-money laundering (AML) refers to the laws, regulations, and procedures intended to prevent criminals from disguising illegally obtained funds as legitimate income.',
        sourceUrl: 'https://example.com',
        confidence: 0.95,
      };

      mockedAxios.post.mockResolvedValueOnce({
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify(mockLLMResponse),
              },
            },
          ],
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      // 执行检索
      const result = await retriever.retrieveFromWebsite(
        'https://example.com',
        ['anti-money laundering']
      );

      // 验证结果
      expect(result.status).toBe('success');
      expect(result.keywordMatches).toHaveLength(1);
      expect(result.keywordMatches[0].keyword).toBe('anti-money laundering');
      expect(result.keywordMatches[0].found).toBe(true);
      expect(result.keywordMatches[0].contexts).toContain(mockLLMResponse.quotedSentence);
      expect(result.keywordMatches[0].sourceUrl).toBe('https://example.com');
      expect(result.keywordMatches[0].confidence).toBe(0.95);

      // 验证debug信息存在
      expect(result.debugInfo).toBeDefined();
      expect(result.debugInfo).toHaveLength(1);
      expect(result.debugInfo![0].keyword).toBe('anti-money laundering');
      expect(result.debugInfo![0].chunking).toBeDefined();
      expect(result.debugInfo![0].retrieval).toBeDefined();
      expect(result.debugInfo![0].llmCall).toBeDefined();
      expect(result.debugInfo![0].validation).toBeDefined();
    });

    it('should limit chunks to MAX_CHUNKS_PER_KEYWORD', async () => {
      process.env.MAX_CHUNKS_PER_KEYWORD = '5';

      // 创建一个很长的内容，会生成很多chunks - 使用纯文本格式
      const longContent = Array(20)
        .fill(0)
        .map(
          (_, i) =>
            `Paragraph ${i + 1}: This is a long paragraph about financial compliance that contains important information about regulations and requirements. It needs to be long enough to be retained as a valid chunk in the system.`
        )
        .join('\n\n');

      mockedAxios.get.mockResolvedValueOnce({
        data: longContent,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      const mockLLMResponse = {
        keyword: 'compliance',
        found: true,
        definition: 'Test definition',
        quotedSentence: 'Test sentence',
        sourceUrl: 'https://example.com',
        confidence: 0.9,
      };

      mockedAxios.post.mockResolvedValueOnce({
        data: {
          choices: [{ message: { content: JSON.stringify(mockLLMResponse) } }],
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      const result = await retriever.retrieveFromWebsite(
        'https://example.com',
        ['compliance']
      );

      // 验证debug信息中的检索chunks数量不超过5
      expect(result.debugInfo).toBeDefined();
      expect(result.debugInfo![0].retrieval.retrievedChunks.length).toBeLessThanOrEqual(5);
    });

    it('should validate quoted sentence and sourceUrl', async () => {
      const mockTextContent = `This is the actual content that exists in the page. Financial institutions must comply with regulations.`;

      mockedAxios.get.mockResolvedValueOnce({
        data: mockTextContent,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      // LLM返回一个不存在的引用句子
      const mockLLMResponse = {
        keyword: 'compliance',
        found: true,
        definition: 'Test definition',
        quotedSentence: 'This sentence does not exist in the original content.',
        sourceUrl: 'https://wrong-url.com',
        confidence: 0.9,
      };

      mockedAxios.post.mockResolvedValueOnce({
        data: {
          choices: [{ message: { content: JSON.stringify(mockLLMResponse) } }],
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      const result = await retriever.retrieveFromWebsite(
        'https://example.com',
        ['compliance']
      );

      // 验证validation结果
      expect(result.debugInfo).toBeDefined();
      const validation = result.debugInfo![0].validation;
      expect(validation.quotedSentenceValid).toBe(false);
      expect(validation.sourceUrlValid).toBe(false);
      expect(validation.warnings).toContain('引用的句子在原文中不存在');
      expect(validation.warnings).toContain('来源URL无效');
    });

    it('should handle multiple keywords efficiently', async () => {
      const mockTextContent = `Anti-money laundering (AML) is important. Customer due diligence (CDD) is required. Data retention must be maintained for five years.`;

      mockedAxios.get.mockResolvedValue({
        data: mockTextContent,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      // Mock三个关键词的LLM响应
      const keywords = ['AML', 'CDD', 'data retention'];
      keywords.forEach((keyword) => {
        mockedAxios.post.mockResolvedValueOnce({
          data: {
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    keyword,
                    found: true,
                    definition: `Definition of ${keyword}`,
                    quotedSentence: `Sentence about ${keyword}`,
                    sourceUrl: 'https://example.com',
                    confidence: 0.9,
                  }),
                },
              },
            ],
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        });
      });

      const result = await retriever.retrieveFromWebsite(
        'https://example.com',
        keywords
      );

      // 验证所有关键词都被处理
      expect(result.keywordMatches).toHaveLength(3);
      expect(result.debugInfo).toHaveLength(3);

      // 验证每个关键词都有完整的debug信息
      result.debugInfo!.forEach((debug, index) => {
        expect(debug.keyword).toBe(keywords[index]);
        expect(debug.chunking).toBeDefined();
        expect(debug.retrieval).toBeDefined();
        expect(debug.llmCall).toBeDefined();
      });
    });

    it('should calculate token usage and cost', async () => {
      const mockTextContent = `Test content for token calculation. This paragraph needs to be long enough to be retained as a valid chunk.`;

      mockedAxios.get.mockResolvedValueOnce({
        data: mockTextContent,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      mockedAxios.post.mockResolvedValueOnce({
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  keyword: 'test',
                  found: true,
                  definition: 'Test definition',
                  quotedSentence: 'Test sentence',
                  sourceUrl: 'https://example.com',
                  confidence: 0.9,
                }),
              },
            },
          ],
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      const result = await retriever.retrieveFromWebsite(
        'https://example.com',
        ['test']
      );

      // 验证token和成本计算
      expect(result.debugInfo).toBeDefined();
      const llmCall = result.debugInfo![0].llmCall;
      expect(llmCall.promptTokens).toBeGreaterThan(0);
      expect(llmCall.completionTokens).toBeGreaterThan(0);
      expect(llmCall.totalTokens).toBe(
        llmCall.promptTokens + llmCall.completionTokens
      );
      expect(llmCall.cost).toBeGreaterThan(0);
      expect(llmCall.duration).toBeGreaterThanOrEqual(0); // 可能为0（测试执行很快）
    });

    it('should handle LLM errors gracefully', async () => {
      const mockTextContent = `Test content that will cause LLM to fail. This paragraph needs to be long enough to be retained as a valid chunk.`;

      mockedAxios.get.mockResolvedValueOnce({
        data: mockTextContent,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      // Mock LLM错误
      mockedAxios.post.mockRejectedValueOnce(new Error('LLM API error'));

      const result = await retriever.retrieveFromWebsite(
        'https://example.com',
        ['test']
      );

      // 应该返回失败结果但不抛出异常
      expect(result.status).toBe('success'); // 整体状态仍然是success
      expect(result.keywordMatches).toHaveLength(1);
      expect(result.keywordMatches[0].found).toBe(false);
      expect(result.keywordMatches[0].error).toBeDefined();
    });
  });

  describe('Debug mode toggle', () => {
    it('should not include debug info when DEBUG_MODE is false', async () => {
      process.env.DEBUG_MODE = 'false';

      const mockTextContent = `Test content without debug mode. This paragraph needs to be long enough to be retained as a valid chunk.`;

      mockedAxios.get.mockResolvedValueOnce({
        data: mockTextContent,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      mockedAxios.post.mockResolvedValueOnce({
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  keyword: 'test',
                  found: true,
                  definition: 'Test',
                  quotedSentence: 'Test',
                  sourceUrl: 'https://example.com',
                  confidence: 0.9,
                }),
              },
            },
          ],
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      const result = await retriever.retrieveFromWebsite(
        'https://example.com',
        ['test']
      );

      // Debug信息应该不存在
      expect(result.debugInfo).toBeUndefined();
    });
  });
});
