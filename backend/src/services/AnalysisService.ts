import {
  RetrievalResult,
  SummaryDocument,
  ComparisonReport,
  CrossSiteAnalysis,
  Source,
  Changes,
  Difference,
} from '../types';
import { SummaryDocumentRepository } from '../repositories/SummaryDocumentRepository';
import { ComparisonReportRepository } from '../repositories/ComparisonReportRepository';
import { CrossSiteAnalysisRepository } from '../repositories/CrossSiteAnalysisRepository';
import { RetrievalResultRepository } from '../repositories/RetrievalResultRepository';
import { ExecutionRepository } from '../repositories/ExecutionRepository';

/**
 * AnalysisService handles the generation of summaries, comparisons, and cross-site analyses
 * using LLM APIs to process retrieval results.
 */
export class AnalysisService {
  private summaryDocumentRepo: SummaryDocumentRepository;
  private comparisonReportRepo: ComparisonReportRepository;
  private crossSiteAnalysisRepo: CrossSiteAnalysisRepository;
  private retrievalResultRepo: RetrievalResultRepository;
  private executionRepo: ExecutionRepository;
  private llmApiKey: string;
  private llmApiUrl: string;
  private llmModel: string;
  private llmApiKeyHeader: string;
  private llmAuthPrefix: string;

  constructor(
    summaryDocumentRepo: SummaryDocumentRepository,
    comparisonReportRepo: ComparisonReportRepository,
    crossSiteAnalysisRepo: CrossSiteAnalysisRepository,
    retrievalResultRepo: RetrievalResultRepository,
    executionRepo: ExecutionRepository,
    llmApiKey?: string,
    llmApiUrl?: string,
    llmModel?: string,
    llmApiKeyHeader?: string,
    llmAuthPrefix?: string
  ) {
    this.summaryDocumentRepo = summaryDocumentRepo;
    this.comparisonReportRepo = comparisonReportRepo;
    this.crossSiteAnalysisRepo = crossSiteAnalysisRepo;
    this.retrievalResultRepo = retrievalResultRepo;
    this.executionRepo = executionRepo;
    
    // Support custom LLM API configuration
    this.llmApiKey = llmApiKey || process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || '';
    this.llmApiUrl = llmApiUrl || process.env.LLM_API_URL || process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';
    this.llmModel = llmModel || process.env.LLM_MODEL || process.env.OPENAI_MODEL || 'gpt-4';
    this.llmApiKeyHeader = llmApiKeyHeader || process.env.LLM_API_KEY_HEADER || 'Authorization';
    this.llmAuthPrefix = llmAuthPrefix || process.env.LLM_AUTH_PREFIX || 'Bearer';
  }

  /**
   * Generate a summary document from retrieval results using LLM
   * Requirements: 5.1, 5.2, 5.3
   */
  async generateSummary(
    executionId: string,
    results: RetrievalResult[]
  ): Promise<SummaryDocument> {
    // Filter only results where content was found
    const foundResults = results.filter(r => r.found && r.content);

    if (foundResults.length === 0) {
      // No content found, create a simple summary
      const emptySummary = await this.summaryDocumentRepo.create({
        executionId,
        content: '# 检索结果摘要\n\n未找到任何关键词内容。',
        sources: []
      });
      return emptySummary;
    }

    // Prepare sources
    const sources: Source[] = foundResults.map(r => ({
      website: r.websiteUrl,
      url: r.sourceUrl || r.websiteUrl,
      keyword: r.keyword
    }));

    // Build prompt for LLM
    const prompt = this.buildSummaryPrompt(foundResults);

    // Call LLM to generate summary
    const summaryContent = await this.callLLM(prompt);

    // Save summary document
    const summaryDocument = await this.summaryDocumentRepo.create({
      executionId,
      content: summaryContent,
      sources
    });

    return summaryDocument;
  }

  /**
   * Compare current and previous retrieval results
   * Requirements: 6.1, 6.2, 6.3, 6.4
   */
  async compareResults(
    currentExecutionId: string,
    taskId: string
  ): Promise<ComparisonReport[]> {
    // Get previous execution for this task
    const previousExecution = await this.getPreviousExecution(taskId, currentExecutionId);

    if (!previousExecution) {
      // First execution, no comparison possible
      return [];
    }

    // Get current and previous results
    const currentResults = await this.retrievalResultRepo.findByExecutionId(currentExecutionId);
    const previousResults = await this.retrievalResultRepo.findByExecutionId(previousExecution.id);

    // Group results by website and keyword
    const comparisonReports: ComparisonReport[] = [];

    for (const currentResult of currentResults) {
      const previousResult = previousResults.find(
        r => r.websiteUrl === currentResult.websiteUrl && r.keyword === currentResult.keyword
      );

      if (!previousResult) {
        // New website/keyword combination
        continue;
      }

      // Compare the two results
      const changes = this.detectChanges(currentResult, previousResult);

      // Generate comparison summary using LLM
      const summary = await this.generateComparisonSummary(currentResult, previousResult, changes);

      // Create comparison report
      const report = await this.comparisonReportRepo.create({
        currentExecutionId,
        previousExecutionId: previousExecution.id,
        websiteUrl: currentResult.websiteUrl,
        keyword: currentResult.keyword,
        changes,
        summary
      });

      comparisonReports.push(report);
    }

    return comparisonReports;
  }

  /**
   * Analyze and compare results across different websites
   * Requirements: 8.2, 8.3, 8.4, 8.5
   */
  async analyzeCrossSite(
    executionId: string,
    results: RetrievalResult[]
  ): Promise<CrossSiteAnalysis[]> {
    // Group results by keyword
    const resultsByKeyword = new Map<string, RetrievalResult[]>();
    
    for (const result of results) {
      if (!result.found || !result.content) {
        continue;
      }
      
      if (!resultsByKeyword.has(result.keyword)) {
        resultsByKeyword.set(result.keyword, []);
      }
      resultsByKeyword.get(result.keyword)!.push(result);
    }

    const analyses: CrossSiteAnalysis[] = [];

    // Analyze each keyword across websites
    for (const [keyword, keywordResults] of resultsByKeyword.entries()) {
      if (keywordResults.length < 2) {
        // Need at least 2 websites to compare
        continue;
      }

      // Use LLM to analyze differences and commonalities
      const { differences, commonalities, analysisSummary } = 
        await this.performCrossSiteAnalysis(keyword, keywordResults);

      // Create cross-site analysis
      const analysis = await this.crossSiteAnalysisRepo.create({
        executionId,
        keyword,
        differences,
        commonalities,
        analysisSummary
      });

      analyses.push(analysis);
    }

    return analyses;
  }

  /**
   * Get the previous execution for a task (for historical comparison)
   * Requirements: 6.1, 6.5
   */
  private async getPreviousExecution(taskId: string, currentExecutionId: string) {
    const paginatedExecutions = await this.executionRepo.findByTaskId(taskId, 1, 100);
    
    // Filter out current execution and get the most recent completed one
    const previousExecutions = paginatedExecutions.executions
      .filter((e: { id: string; status: string }) => e.id !== currentExecutionId && e.status === 'completed')
      .sort((a: { startTime: Date }, b: { startTime: Date }) => b.startTime.getTime() - a.startTime.getTime());

    return previousExecutions.length > 0 ? previousExecutions[0] : null;
  }

  /**
   * Detect changes between current and previous retrieval results
   */
  private detectChanges(current: RetrievalResult, previous: RetrievalResult): Changes {
    const changes: Changes = {
      added: [],
      removed: [],
      modified: []
    };

    // Simple change detection based on content
    if (!previous.found && current.found) {
      changes.added.push('关键词内容首次被找到');
    } else if (previous.found && !current.found) {
      changes.removed.push('关键词内容不再可见');
    } else if (previous.content !== current.content) {
      changes.modified.push({
        field: 'content',
        oldValue: previous.content || '',
        newValue: current.content || ''
      });
    }

    if (previous.context !== current.context) {
      changes.modified.push({
        field: 'context',
        oldValue: previous.context || '',
        newValue: current.context || ''
      });
    }

    return changes;
  }

  /**
   * Build prompt for summary generation
   */
  private buildSummaryPrompt(results: RetrievalResult[]): string {
    let prompt = '你是一个金融合规政策分析专家。请根据以下检索结果生成一份简洁的摘要文档（使用Markdown格式）。\n\n';
    prompt += '检索结果：\n\n';

    for (const result of results) {
      prompt += `## 网站: ${result.websiteUrl}\n`;
      prompt += `关键词: ${result.keyword}\n`;
      prompt += `内容:\n${result.content}\n\n`;
      if (result.context) {
        prompt += `上下文:\n${result.context}\n\n`;
      }
      prompt += '---\n\n';
    }

    prompt += '请生成摘要，包括：\n';
    prompt += '1. 每个关键词的定义和解释\n';
    prompt += '2. 关键要点\n';
    prompt += '3. 信息来源引用\n\n';
    prompt += '使用Markdown格式，清晰易读。';

    return prompt;
  }

  /**
   * Generate comparison summary using LLM
   */
  private async generateComparisonSummary(
    current: RetrievalResult,
    previous: RetrievalResult,
    changes: Changes
  ): Promise<string> {
    if (changes.added.length === 0 && changes.removed.length === 0 && changes.modified.length === 0) {
      return '内容无变化';
    }

    const prompt = `你是一个金融合规政策分析专家。请对比以下两次检索结果的变化，生成简洁的对比摘要。

关键词: ${current.keyword}
网站: ${current.websiteUrl}

上次内容:
${previous.content || '未找到'}

本次内容:
${current.content || '未找到'}

变化:
- 新增: ${changes.added.join(', ') || '无'}
- 删除: ${changes.removed.join(', ') || '无'}
- 修改: ${changes.modified.map(m => m.field).join(', ') || '无'}

请用1-2句话总结主要变化。`;

    return await this.callLLM(prompt);
  }

  /**
   * Perform cross-site analysis using LLM
   */
  private async performCrossSiteAnalysis(
    keyword: string,
    results: RetrievalResult[]
  ): Promise<{
    differences: Difference[];
    commonalities: string[];
    analysisSummary: string;
  }> {
    let prompt = `你是一个金融合规政策分析专家。请对比不同网站对同一关键词的解释，分析差异和共同点。

关键词: ${keyword}

`;

    for (const result of results) {
      prompt += `## ${result.websiteUrl}\n`;
      prompt += `${result.content}\n\n`;
    }

    prompt += `请以markdown格式返回分析结果，包含：
1. analysisSummary: 总体分析摘要（1-2段文字）
2. differences: 差异列表，每项包含 websites（涉及的网站）、aspect（差异方面）、description（描述）
3. commonalities: 共同点列表（字符串数组）`;

    const response = await this.callLLM(prompt);

    // Parse markdown response to extract structured data
    return this.parseMarkdownAnalysis(response, results);
  }

  /**
   * Parse markdown analysis response into structured data
   */
  private parseMarkdownAnalysis(
    markdown: string,
    results: RetrievalResult[]
  ): {
    differences: Difference[];
    commonalities: string[];
    analysisSummary: string;
  } {
    const differences: Difference[] = [];
    const commonalities: string[] = [];
    let analysisSummary = '';

    // Try to extract sections from markdown
    const lines = markdown.split('\n');
    let currentSection = '';
    let summaryLines: string[] = [];
    let inDifferences = false;
    let inCommonalities = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Detect section headers
      if (line.match(/^#+\s*(总体分析|分析摘要|summary)/i)) {
        currentSection = 'summary';
        inDifferences = false;
        inCommonalities = false;
        continue;
      } else if (line.match(/^#+\s*(差异|differences)/i)) {
        currentSection = 'differences';
        inDifferences = true;
        inCommonalities = false;
        continue;
      } else if (line.match(/^#+\s*(共同点|commonalities)/i)) {
        currentSection = 'commonalities';
        inDifferences = false;
        inCommonalities = true;
        continue;
      }

      // Extract content based on current section
      if (currentSection === 'summary' && line && !line.startsWith('#')) {
        summaryLines.push(line);
      } else if (inDifferences && line.startsWith('-')) {
        // Parse difference item
        const content = line.substring(1).trim();
        differences.push({
          websites: results.map(r => r.websiteUrl),
          aspect: '差异点',
          description: content
        });
      } else if (inCommonalities && line.startsWith('-')) {
        // Parse commonality item
        const content = line.substring(1).trim();
        commonalities.push(content);
      }
    }

    analysisSummary = summaryLines.join('\n').trim() || markdown;

    // If no structured data was extracted, return the full response as summary
    if (differences.length === 0 && commonalities.length === 0) {
      return {
        differences: [],
        commonalities: [],
        analysisSummary: markdown
      };
    }

    return {
      differences,
      commonalities,
      analysisSummary
    };
  }

  /**
   * Call LLM API to generate text
   * Private method that encapsulates LLM API calls (supports OpenAI and custom endpoints)
   */
  private async callLLM(prompt: string): Promise<string> {
    if (!this.llmApiKey) {
      throw new Error('LLM API key is not configured');
    }

    try {
      // Build headers with custom authentication
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      // Add authentication header with custom format
      const authValue = this.llmAuthPrefix 
        ? `${this.llmAuthPrefix} ${this.llmApiKey}`
        : this.llmApiKey;
      
      headers[this.llmApiKeyHeader] = authValue;

      const response = await fetch(this.llmApiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: this.llmModel,
          messages: [
            {
              role: 'system',
              content: '你是一个专业的金融合规政策分析专家，擅长总结和对比分析政策内容。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LLM API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('LLM API returned no choices');
      }

      return data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error calling LLM API:', error);
      throw new Error(`Failed to call LLM API: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
