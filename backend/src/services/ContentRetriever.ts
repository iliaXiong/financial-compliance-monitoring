import axios, { AxiosError } from 'axios';
import { JSDOM } from 'jsdom';
import { WebsiteAnalyzer, IWebsiteAnalyzer } from './WebsiteAnalyzer';
import { KeywordMatch } from '../types';

/**
 * ContentRetriever interface
 * Defines the contract for retrieving and searching content from websites
 */
export interface IContentRetriever {
  retrieveFromWebsite(
    websiteUrl: string,
    keywords: string[]
  ): Promise<ContentRetrievalResult>;
  retrieveFromMultipleWebsites(
    websiteUrls: string[],
    keywords: string[]
  ): Promise<ContentRetrievalResult[]>;
}

/**
 * Content retrieval result for a single website
 */
export interface ContentRetrievalResult {
  websiteUrl: string;
  status: 'success' | 'failed';
  keywordMatches: KeywordMatch[];
  documentResults: DocumentRetrievalResult[];
  error?: string;
  retrievedAt: Date;
}

/**
 * Document retrieval result
 */
export interface DocumentRetrievalResult {
  documentUrl: string;
  status: 'success' | 'failed';
  keywordMatches: KeywordMatch[];
  error?: string;
}

/**
 * ContentRetriever class
 * Retrieves content from websites and documents, searches for keywords using LLM
 * Implements error tolerance - failures don't stop the entire process
 */
export class ContentRetriever implements IContentRetriever {
  private readonly websiteAnalyzer: IWebsiteAnalyzer;
  private readonly maxRetries: number = 3;
  private readonly initialRetryDelay: number = 1000; // 1 second
  private readonly timeout: number = 30000; // 30 seconds
  private readonly jinaReaderBaseUrl: string = 'https://r.jina.ai';
  private llmApiKey: string;
  private llmApiUrl: string;
  private llmModel: string;
  private llmApiKeyHeader: string;
  private llmAuthPrefix: string;

  constructor(
    websiteAnalyzer?: IWebsiteAnalyzer,
    llmApiKey?: string,
    llmApiUrl?: string,
    llmModel?: string,
    llmApiKeyHeader?: string,
    llmAuthPrefix?: string
  ) {
    this.websiteAnalyzer = websiteAnalyzer || new WebsiteAnalyzer();
    this.llmApiKey = llmApiKey || process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || '';
    this.llmApiUrl = llmApiUrl || process.env.LLM_API_URL || process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';
    this.llmModel = llmModel || process.env.LLM_MODEL || process.env.OPENAI_MODEL || 'gpt-4';
    this.llmApiKeyHeader = llmApiKeyHeader || process.env.LLM_API_KEY_HEADER || 'Authorization';
    this.llmAuthPrefix = llmAuthPrefix || process.env.LLM_AUTH_PREFIX || 'Bearer';
  }

  /**
   * Retrieve content from a single website and search for keywords using LLM
   * @param websiteUrl - The URL of the website to retrieve content from
   * @param keywords - Array of keywords to search for
   * @returns ContentRetrievalResult with keyword matches
   */
  async retrieveFromWebsite(
    websiteUrl: string,
    keywords: string[]
  ): Promise<ContentRetrievalResult> {
    const startTime = new Date();

    try {
      console.log(`[ContentRetriever] Processing website: ${websiteUrl}`);

      // Check if WebsiteAnalyzer is enabled
      const enableWebsiteAnalyzer = process.env.ENABLE_WEBSITE_ANALYZER !== 'false';
      
      let pageLinks: string[] = [];
      let documentLinks: string[] = [];

      if (enableWebsiteAnalyzer) {
        // Step 1: Analyze website to get page and document links
        const analysisResult = await this.websiteAnalyzer.analyze(websiteUrl);

        if (analysisResult.error) {
          console.warn(`[ContentRetriever] WebsiteAnalyzer failed: ${analysisResult.error}, continuing with main page only`);
        } else {
          pageLinks = analysisResult.pageLinks;
          documentLinks = analysisResult.documentLinks.map(doc => doc.url);
          console.log(`[ContentRetriever] Found ${pageLinks.length} page links and ${documentLinks.length} document links`);
        }
      } else {
        console.log(`[ContentRetriever] WebsiteAnalyzer is disabled, processing main page only`);
      }

      // Step 2: Fetch main page content
      const mainPageContent = await this.fetchPageContent(websiteUrl);

      // Step 3: Fetch content from policy-related sub-pages (no limit)
      const subPageContents = enableWebsiteAnalyzer && pageLinks.length > 0
        ? await this.fetchSubPages(pageLinks)
        : [];

      // Step 4: Fetch content from documents (no limit)
      const documentContents = enableWebsiteAnalyzer && documentLinks.length > 0
        ? await this.fetchDocuments(documentLinks)
        : [];

      // Step 5: Use LLM to search for keywords across all content
      const llmSearchResult = await this.llmWebSearch(
        websiteUrl,
        keywords,
        mainPageContent,
        subPageContents,
        documentContents,
        pageLinks,
        documentLinks
      );

      return {
        websiteUrl,
        status: 'success',
        keywordMatches: llmSearchResult.keywordMatches,
        documentResults: llmSearchResult.documentResults,
        retrievedAt: startTime,
      };
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      console.error(
        `[ContentRetriever] Failed to retrieve from ${websiteUrl}:`,
        errorMessage
      );

      return {
        websiteUrl,
        status: 'failed',
        keywordMatches: [],
        documentResults: [],
        error: errorMessage,
        retrievedAt: startTime,
      };
    }
  }

  /**
   * Retrieve content from multiple websites in parallel
   * Single website failures don't affect other websites
   * @param websiteUrls - Array of website URLs
   * @param keywords - Array of keywords to search for
   * @returns Array of ContentRetrievalResult
   */
  async retrieveFromMultipleWebsites(
    websiteUrls: string[],
    keywords: string[]
  ): Promise<ContentRetrievalResult[]> {
    console.log(
      `[ContentRetriever] Processing ${websiteUrls.length} websites in parallel`
    );

    // Process all websites in parallel, errors are caught per website
    const results = await Promise.all(
      websiteUrls.map((url) => this.retrieveFromWebsite(url, keywords))
    );

    const successCount = results.filter((r) => r.status === 'success').length;
    const failCount = results.filter((r) => r.status === 'failed').length;

    console.log(
      `[ContentRetriever] Completed: ${successCount} succeeded, ${failCount} failed`
    );

    return results;
  }

  /**
   * Fetch page content from a URL using Jina Reader API (supports JavaScript rendering)
   * Falls back to direct fetch if Jina Reader fails
   * @param url - The URL to fetch
   * @returns HTML content as string
   */
  async fetchPageContent(url: string): Promise<string> {
    // Try Jina Reader first (supports JavaScript rendering)
    try {
      console.log(
        `[ContentRetriever] Fetching page content from ${url} via Jina Reader`
      );

      const jinaUrl = `${this.jinaReaderBaseUrl}/${url}`;
      const response = await axios.get(jinaUrl, {
        timeout: this.timeout * 2, // Jina Reader may take longer
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; FinancialComplianceBot/1.0)',
        },
      });

      console.log(
        `[ContentRetriever] Successfully fetched via Jina Reader: ${url}`
      );
      return response.data;
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      console.warn(
        `[ContentRetriever] Jina Reader failed for ${url}: ${errorMessage}, falling back to direct fetch`
      );

      // Fallback to direct fetch
      return await this.fetchPageContentDirect(url);
    }
  }

  /**
   * Fetch page content directly from URL (without Jina Reader)
   * @param url - The URL to fetch
   * @returns HTML content as string
   */
  private async fetchPageContentDirect(url: string): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        console.log(
          `[ContentRetriever] Direct fetch from ${url} (attempt ${attempt + 1}/${this.maxRetries})`
        );

        const response = await axios.get(url, {
          timeout: this.timeout,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (compatible; FinancialComplianceBot/1.0)',
          },
          maxRedirects: 5,
        });

        return response.data;
      } catch (error) {
        lastError = error as Error;
        const errorMessage = this.getErrorMessage(error);

        console.warn(
          `[ContentRetriever] Attempt ${attempt + 1} failed for ${url}: ${errorMessage}`
        );

        // Don't retry on client errors (4xx)
        if (
          axios.isAxiosError(error) &&
          error.response?.status &&
          error.response.status >= 400 &&
          error.response.status < 500
        ) {
          throw new Error(
            `Client error ${error.response.status}: ${errorMessage}`
          );
        }

        // Wait before retrying (exponential backoff)
        if (attempt < this.maxRetries - 1) {
          const delay = this.initialRetryDelay * Math.pow(2, attempt);
          console.log(
            `[ContentRetriever] Waiting ${delay}ms before retry...`
          );
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error('Failed to fetch page content after retries');
  }

  /**
   * Read document content using Jina Reader API
   * @param documentUrl - The URL of the document to read
   * @returns Document content as string
   */
  async readDocument(documentUrl: string): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        console.log(
          `[ContentRetriever] Reading document ${documentUrl} via Jina Reader (attempt ${attempt + 1}/${this.maxRetries})`
        );

        const jinaUrl = `${this.jinaReaderBaseUrl}/${documentUrl}`;

        const response = await axios.get(jinaUrl, {
          timeout: this.timeout * 2, // Documents may take longer
          headers: {
            'User-Agent':
              'Mozilla/5.0 (compatible; FinancialComplianceBot/1.0)',
          },
        });

        return response.data;
      } catch (error) {
        lastError = error as Error;
        const errorMessage = this.getErrorMessage(error);

        console.warn(
          `[ContentRetriever] Attempt ${attempt + 1} failed for document ${documentUrl}: ${errorMessage}`
        );

        // Don't retry on client errors (4xx)
        if (
          axios.isAxiosError(error) &&
          error.response?.status &&
          error.response.status >= 400 &&
          error.response.status < 500
        ) {
          throw new Error(
            `Client error ${error.response.status}: ${errorMessage}`
          );
        }

        // Wait before retrying (exponential backoff)
        if (attempt < this.maxRetries - 1) {
          const delay = this.initialRetryDelay * Math.pow(2, attempt);
          console.log(
            `[ContentRetriever] Waiting ${delay}ms before retry...`
          );
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error('Failed to read document after retries');
  }

  /**
   * Search for keywords in content
   * @param content - The content to search in (HTML or plain text)
   * @param keywords - Array of keywords to search for
   * @returns Array of KeywordMatch results
   */
  searchKeywords(content: string, keywords: string[]): KeywordMatch[] {
    // Extract text from HTML if needed
    const textContent = this.extractTextContent(content);

    return keywords.map((keyword) => {
      const regex = new RegExp(keyword, 'gi');
      const matches = textContent.match(regex);
      const occurrences = matches ? matches.length : 0;
      const found = occurrences > 0;

      // Extract contexts around keyword occurrences
      const contexts = found
        ? this.extractContext(textContent, keyword)
        : [];

      return {
        keyword,
        found,
        occurrences,
        contexts,
      };
    });
  }

  /**
   * Extract context around keyword occurrences
   * @param content - The content to search in
   * @param keyword - The keyword to find context for
   * @param contextLength - Number of characters before and after keyword (default: 150)
   * @returns Array of context strings
   */
  extractContext(
    content: string,
    keyword: string,
    contextLength: number = 150
  ): string[] {
    const contexts: string[] = [];
    const regex = new RegExp(keyword, 'gi');
    let match: RegExpExecArray | null;

    // Find all occurrences and extract context
    while ((match = regex.exec(content)) !== null && contexts.length < 5) {
      // Limit to 5 contexts
      const startIndex = Math.max(0, match.index - contextLength);
      const endIndex = Math.min(
        content.length,
        match.index + keyword.length + contextLength
      );

      let context = content.substring(startIndex, endIndex).trim();

      // Add ellipsis if context is truncated
      if (startIndex > 0) {
        context = '...' + context;
      }
      if (endIndex < content.length) {
        context = context + '...';
      }

      contexts.push(context);
    }

    return contexts;
  }

  /**
   * Process multiple documents with error tolerance
   * Document reading failures don't stop processing of other documents
   * @param documentUrls - Array of document URLs
   * @param keywords - Array of keywords to search for
   * @returns Array of DocumentRetrievalResult
   */
  private async processDocuments(
    documentUrls: string[],
    keywords: string[]
  ): Promise<DocumentRetrievalResult[]> {
    if (documentUrls.length === 0) {
      return [];
    }

    console.log(
      `[ContentRetriever] Processing ${documentUrls.length} documents`
    );

    // Process all documents in parallel with error tolerance
    const results = await Promise.all(
      documentUrls.map((url) => this.processDocument(url, keywords))
    );

    const successCount = results.filter((r) => r.status === 'success').length;
    const failCount = results.filter((r) => r.status === 'failed').length;

    console.log(
      `[ContentRetriever] Documents processed: ${successCount} succeeded, ${failCount} failed`
    );

    return results;
  }

  /**
   * Process a single document
   * @param documentUrl - The document URL
   * @param keywords - Array of keywords to search for
   * @returns DocumentRetrievalResult
   */
  private async processDocument(
    documentUrl: string,
    keywords: string[]
  ): Promise<DocumentRetrievalResult> {
    try {
      // Read document content using Jina Reader
      const documentContent = await this.readDocument(documentUrl);

      // Search keywords in document content
      const keywordMatches = this.searchKeywords(documentContent, keywords);

      return {
        documentUrl,
        status: 'success',
        keywordMatches,
      };
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      console.error(
        `[ContentRetriever] Failed to process document ${documentUrl}:`,
        errorMessage
      );

      // Return failed result but don't throw - error tolerance
      return {
        documentUrl,
        status: 'failed',
        keywordMatches: [],
        error: errorMessage,
      };
    }
  }

  /**
   * Extract text content from HTML
   * @param content - HTML or plain text content
   * @returns Plain text content
   */
  private extractTextContent(content: string): string {
    // Check if content is HTML
    if (content.trim().startsWith('<')) {
      try {
        const dom = new JSDOM(content);
        const document = dom.window.document;
        // Remove script and style tags before extracting text
        document.querySelectorAll('script, style, noscript').forEach(el => el.remove());
        return document.body.textContent || '';
      } catch (error) {
        console.warn(
          '[ContentRetriever] Failed to parse HTML, treating as plain text'
        );
        return content;
      }
    }

    return content;
  }

  /**
   * Fetch content from multiple sub-pages
   * @param pageUrls - Array of page URLs to fetch
   * @returns Array of page contents with their URLs
   */
  private async fetchSubPages(
    pageUrls: string[]
  ): Promise<Array<{ url: string; content: string }>> {
    if (pageUrls.length === 0) {
      return [];
    }

    console.log(`[ContentRetriever] Fetching ${pageUrls.length} sub-pages`);

    const results = await Promise.all(
      pageUrls.map(async (url) => {
        try {
          const content = await this.fetchPageContent(url);
          return { url, content };
        } catch (error) {
          console.warn(`[ContentRetriever] Failed to fetch sub-page ${url}:`, this.getErrorMessage(error));
          return { url, content: '' };
        }
      })
    );

    return results.filter(r => r.content.length > 0);
  }

  /**
   * Fetch content from multiple documents
   * @param documentUrls - Array of document URLs to fetch
   * @returns Array of document contents with their URLs
   */
  private async fetchDocuments(
    documentUrls: string[]
  ): Promise<Array<{ url: string; content: string }>> {
    if (documentUrls.length === 0) {
      return [];
    }

    console.log(`[ContentRetriever] Fetching ${documentUrls.length} documents`);

    const results = await Promise.all(
      documentUrls.map(async (url) => {
        try {
          const content = await this.readDocument(url);
          return { url, content };
        } catch (error) {
          console.warn(`[ContentRetriever] Failed to fetch document ${url}:`, this.getErrorMessage(error));
          return { url, content: '' };
        }
      })
    );

    return results.filter(r => r.content.length > 0);
  }

  /**
   * Use LLM to search for keywords across website content
   * @param websiteUrl - The main website URL
   * @param keywords - Keywords to search for
   * @param mainPageContent - Content from the main page
   * @param subPageContents - Contents from sub-pages
   * @param documentContents - Contents from documents
   * @param pageLinks - All page links found
   * @param documentLinks - All document links found
   * @returns Search results with keyword matches and document results
   */
  private async llmWebSearch(
    websiteUrl: string,
    keywords: string[],
    mainPageContent: string,
    subPageContents: Array<{ url: string; content: string }>,
    documentContents: Array<{ url: string; content: string }>,
    pageLinks: string[],
    documentLinks: string[]
  ): Promise<{
    keywordMatches: KeywordMatch[];
    documentResults: DocumentRetrievalResult[];
  }> {
    console.log(`[ContentRetriever] Using LLM to search for keywords in ${websiteUrl}`);

    // Build comprehensive prompt for LLM
    const prompt = this.buildLLMSearchPrompt(
      websiteUrl,
      keywords,
      mainPageContent,
      subPageContents,
      documentContents
    );

    try {
      // Call LLM to perform intelligent search
      const llmResponse = await this.callLLM(prompt);
      
      // Debug: Log LLM response
      console.log(`[ContentRetriever] LLM response (first 500 chars):`, llmResponse.substring(0, 500));

      // Parse LLM response
      const searchResult = this.parseLLMSearchResponse(
        llmResponse,
        keywords,
        subPageContents,
        documentContents
      );

      console.log(`[ContentRetriever] LLM search completed: found ${searchResult.keywordMatches.filter(k => k.found).length}/${keywords.length} keywords`);
      console.log(`[ContentRetriever] Keyword matches:`, JSON.stringify(searchResult.keywordMatches.map(k => ({keyword: k.keyword, found: k.found}))));

      return searchResult;
    } catch (error) {
      console.error(`[ContentRetriever] LLM search failed:`, this.getErrorMessage(error));
      
      // Fallback to simple keyword matching if LLM fails
      console.log(`[ContentRetriever] Falling back to simple keyword matching`);
      return this.fallbackKeywordSearch(
        keywords,
        mainPageContent,
        subPageContents,
        documentContents
      );
    }
  }

  /**
   * Build prompt for LLM web search
   */
  private buildLLMSearchPrompt(
    websiteUrl: string,
    keywords: string[],
    mainPageContent: string,
    subPageContents: Array<{ url: string; content: string }>,
    documentContents: Array<{ url: string; content: string }>
  ): string {
    const mainText = this.extractTextContent(mainPageContent).substring(0, 5000);
    
    let prompt = `目标网站: ${websiteUrl}
搜索关键词: ${keywords.join(', ')}

## 主页面内容:
${mainText}

`;

    // Add sub-page contents
    if (subPageContents.length > 0) {
      prompt += `## 子页面内容:\n\n`;
      subPageContents.forEach((page, index) => {
        const pageText = this.extractTextContent(page.content).substring(0, 3000);
        prompt += `### 子页面 ${index + 1} (${page.url}):\n${pageText}\n\n`;
      });
    }

    // Add document contents
    if (documentContents.length > 0) {
      prompt += `## 文档内容:\n\n`;
      documentContents.forEach((doc, index) => {
        const docText = this.extractTextContent(doc.content).substring(0, 3000);
        prompt += `### 文档 ${index + 1} (${doc.url}):\n${docText}\n\n`;
      });
    }

    return prompt;
  }

  /**
   * Parse LLM search response
   */
  private parseLLMSearchResponse(
    llmResponse: string,
    keywords: string[],
    subPageContents: Array<{ url: string; content: string }>,
    documentContents: Array<{ url: string; content: string }>
  ): {
    keywordMatches: KeywordMatch[];
    documentResults: DocumentRetrievalResult[];
  } {
    try {
      // Try to parse JSON response
      const parsed = JSON.parse(llmResponse);
      
      const keywordMatches: KeywordMatch[] = [];
      const documentResultsMap = new Map<string, KeywordMatch[]>();

      // Process each keyword result
      for (const result of parsed.keywordResults || []) {
        const keywordMatch: KeywordMatch = {
          keyword: result.keyword,
          found: result.found || false,
          occurrences: result.found ? 1 : 0,
          contexts: result.context ? [result.context] : [],
          sourceUrl: result.sourceUrl // Extract sourceUrl from LLM response
        };

        keywordMatches.push(keywordMatch);

        // Track which documents contain which keywords
        if (result.found && result.sourceUrl) {
          const isDocument = documentContents.some(doc => doc.url === result.sourceUrl);
          if (isDocument) {
            if (!documentResultsMap.has(result.sourceUrl)) {
              documentResultsMap.set(result.sourceUrl, []);
            }
            documentResultsMap.get(result.sourceUrl)!.push(keywordMatch);
          }
        }
      }

      // Build document results
      const documentResults: DocumentRetrievalResult[] = [];
      for (const [docUrl, matches] of documentResultsMap.entries()) {
        documentResults.push({
          documentUrl: docUrl,
          status: 'success',
          keywordMatches: matches
        });
      }

      return { keywordMatches, documentResults };
    } catch (error) {
      console.error('[ContentRetriever] Failed to parse LLM response:', error);
      throw new Error('Failed to parse LLM search response');
    }
  }

  /**
   * Fallback to simple keyword matching if LLM fails
   */
  private fallbackKeywordSearch(
    keywords: string[],
    mainPageContent: string,
    subPageContents: Array<{ url: string; content: string }>,
    documentContents: Array<{ url: string; content: string }>
  ): {
    keywordMatches: KeywordMatch[];
    documentResults: DocumentRetrievalResult[];
  } {
    // Combine all content
    const allContent = [
      mainPageContent,
      ...subPageContents.map(p => p.content),
      ...documentContents.map(d => d.content)
    ].join('\n\n');

    // Use simple keyword search
    const keywordMatches = this.searchKeywords(allContent, keywords);

    // Process documents
    const documentResults: DocumentRetrievalResult[] = documentContents.map(doc => ({
      documentUrl: doc.url,
      status: 'success',
      keywordMatches: this.searchKeywords(doc.content, keywords)
    }));

    return { keywordMatches, documentResults };
  }

  /**
   * Call LLM API
   */
  private async callLLM(prompt: string): Promise<string> {
    if (!this.llmApiKey) {
      throw new Error('LLM API key is not configured');
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      const authValue = this.llmAuthPrefix 
        ? `${this.llmAuthPrefix} ${this.llmApiKey}`
        : this.llmApiKey;
      
      headers[this.llmApiKeyHeader] = authValue;

      // Extract websiteUrl and keywords from prompt for system message
      const websiteUrlMatch = prompt.match(/目标网站: (.+)/);
      const keywordsMatch = prompt.match(/搜索关键词: (.+)/);
      const websiteUrl = websiteUrlMatch ? websiteUrlMatch[1].split('\n')[0].trim() : '';
      const keywords = keywordsMatch ? keywordsMatch[1].split('\n')[0].trim() : '';

      const systemPrompt = `你是一个金融合规政策分析专家。请在${websiteUrl}域名下搜索${keywords}相关内容，总结每个关键词的定义/解释/描述，并以JSON格式返回总结内容。

# 技能：
1. 调用Jina Reader读取网站信息
2. 在金融语境下理解关键词
3. 在查找结果中分析关键词的定义/解释/描述

# 限制：
返回总结文本必须为JSON格式

# 输出格式要求：
你必须严格按照以下JSON格式返回结果，不要包含任何其他文本：

{
  "keywordResults": [
    {
      "keyword": "关键词1",
      "found": true,
      "content": "关键词的完整定义和解释...",
      "sourceUrl": "https://example.com/page1",
      "context": "在此页面中，关键词1被定义为..."
    },
    {
      "keyword": "关键词2",
      "found": false,
      "content": "",
      "sourceUrl": "",
      "context": ""
    }
  ]
}

# 注意事项：
- 如果关键词在多个页面/文档中出现，选择最详细和权威的一个
- 如果未找到关键词，设置 found 为 false，content、sourceUrl 和 context 为空字符串
- 提取完整的定义和解释，而不仅仅是包含关键词的句子
- 只返回有效的 JSON，不要包含任何额外的文本、解释或markdown格式`;

      const requestBody: any = {
        model: this.llmModel,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0,
        max_tokens: 3000
      };

      // Only add response_format for OpenAI-compatible APIs
      // Some APIs (like Webull's Claude) may not support this parameter
      if (this.llmApiUrl.includes('openai.com')) {
        requestBody.response_format = { type: 'json_object' };
      }

      const response = await axios.post(
        this.llmApiUrl,
        requestBody,
        {
          headers,
          timeout: 60000 // 60 seconds for LLM
        }
      );

      if (!response.data.choices || response.data.choices.length === 0) {
        throw new Error('LLM API returned no choices');
      }

      let content = response.data.choices[0].message.content.trim();
      
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        content = jsonMatch[1];
      }
      
      // Remove any leading/trailing non-JSON text
      const jsonStart = content.indexOf('{');
      const jsonEnd = content.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        content = content.substring(jsonStart, jsonEnd + 1);
      }

      return content;
    } catch (error) {
      console.error('[ContentRetriever] Error calling LLM API:', error);
      throw new Error(`Failed to call LLM API: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Extract error message from various error types
   * @param error - The error object
   * @returns Error message string
   */
  private getErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.code === 'ECONNABORTED') {
        return 'Connection timeout';
      } else if (axiosError.code === 'ENOTFOUND') {
        return 'Domain not found';
      } else if (axiosError.response) {
        return `HTTP ${axiosError.response.status}: ${axiosError.response.statusText}`;
      } else if (axiosError.request) {
        return 'No response received from server';
      }
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown error';
  }

  /**
   * Sleep for a specified duration
   * @param ms - Duration in milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
