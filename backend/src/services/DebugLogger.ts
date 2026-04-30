import { Chunk } from './SimpleRetriever';

/**
 * Debug信息接口
 */
export interface DebugInfo {
  keyword: string;
  timestamp: string;
  websiteUrl: string;

  // 内容获取阶段
  contentFetch: {
    mainPageSize: number;
    subPagesCount: number;
    documentsCount: number;
    totalContentSize: number;
  };

  // Chunk拆分阶段
  chunking: {
    totalChunks: number;
    chunkSizes: number[];
    avgChunkSize: number;
  };

  // 检索阶段
  retrieval: {
    retrievedChunks: Array<{
      id: string;
      content: string;
      sourceUrl: string;
      score: number;
    }>;
    topScore: number;
    avgScore: number;
  };

  // LLM调用阶段
  llmCall: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    duration: number;
    cost: number;
  };

  // LLM响应
  llmAnswer: {
    keyword: string;
    found: boolean;
    definition: string;
    quotedSentence: string;
    sourceUrl: string;
    confidence: number;
  };

  // 验证结果
  validation: {
    quotedSentenceValid: boolean;
    sourceUrlValid: boolean;
    warnings: string[];
  };
}

/**
 * Debug日志记录器
 */
export class DebugLogger {
  private debugInfo: Partial<DebugInfo>;

  constructor(keyword: string, websiteUrl: string) {
    this.debugInfo = {
      keyword,
      timestamp: new Date().toISOString(),
      websiteUrl,
    };
  }

  /**
   * 记录内容获取信息
   */
  logContentFetch(
    mainPageSize: number,
    subPagesCount: number,
    documentsCount: number,
    totalContentSize: number
  ): void {
    this.debugInfo.contentFetch = {
      mainPageSize,
      subPagesCount,
      documentsCount,
      totalContentSize,
    };
  }

  /**
   * 记录chunk拆分信息
   */
  logChunking(chunks: Chunk[]): void {
    const chunkSizes = chunks.map((c) => c.content.length);
    const avgChunkSize =
      chunkSizes.length > 0
        ? chunkSizes.reduce((a, b) => a + b, 0) / chunkSizes.length
        : 0;

    this.debugInfo.chunking = {
      totalChunks: chunks.length,
      chunkSizes,
      avgChunkSize: Math.round(avgChunkSize),
    };
  }

  /**
   * 记录检索信息
   */
  logRetrieval(retrievedChunks: Chunk[]): void {
    const scores = retrievedChunks.map((c) => c.score || 0);
    const topScore = scores.length > 0 ? Math.max(...scores) : 0;
    const avgScore =
      scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    this.debugInfo.retrieval = {
      retrievedChunks: retrievedChunks.map((c) => ({
        id: c.id,
        content: c.content.substring(0, 200) + '...', // 只保留前200字符
        sourceUrl: c.sourceUrl,
        score: c.score || 0,
      })),
      topScore,
      avgScore,
    };
  }

  /**
   * 记录LLM调用信息
   */
  logLLMCall(
    promptTokens: number,
    completionTokens: number,
    duration: number
  ): void {
    const totalTokens = promptTokens + completionTokens;
    const cost = this.calculateCost(promptTokens, completionTokens);

    this.debugInfo.llmCall = {
      promptTokens,
      completionTokens,
      totalTokens,
      duration,
      cost,
    };
  }

  /**
   * 记录LLM响应
   */
  logLLMAnswer(answer: any): void {
    this.debugInfo.llmAnswer = answer;
  }

  /**
   * 验证LLM响应
   */
  validate(chunks: Chunk[]): void {
    const warnings: string[] = [];
    let quotedSentenceValid = false;
    let sourceUrlValid = false;

    if (this.debugInfo.llmAnswer) {
      const { quotedSentence, sourceUrl, confidence } = this.debugInfo.llmAnswer;

      // 验证引用句子是否存在于chunks中
      if (quotedSentence) {
        quotedSentenceValid = chunks.some((chunk) =>
          chunk.content.includes(quotedSentence)
        );

        if (!quotedSentenceValid) {
          warnings.push('引用的句子在原文中不存在');
        }
      }

      // 验证sourceUrl是否有效
      if (sourceUrl) {
        sourceUrlValid = chunks.some((chunk) => chunk.sourceUrl === sourceUrl);

        if (!sourceUrlValid) {
          warnings.push('来源URL无效');
        }
      }

      // 检查confidence
      if (confidence < 0.5) {
        warnings.push('LLM置信度较低（< 0.5）');
      }
    }

    this.debugInfo.validation = {
      quotedSentenceValid,
      sourceUrlValid,
      warnings,
    };
  }

  /**
   * 获取完整的debug信息
   */
  getDebugInfo(): DebugInfo {
    return this.debugInfo as DebugInfo;
  }

  /**
   * 输出debug信息到日志
   */
  print(): void {
    console.log('\n========== DEBUG INFO ==========');
    console.log(JSON.stringify(this.debugInfo, null, 2));
    console.log('================================\n');
  }

  /**
   * 计算LLM调用成本
   */
  private calculateCost(
    promptTokens: number,
    completionTokens: number
  ): number {
    // Claude Sonnet 4 定价（示例）
    const promptCost = (promptTokens / 1000) * 0.003; // $0.003 per 1K tokens
    const completionCost = (completionTokens / 1000) * 0.015; // $0.015 per 1K tokens
    return promptCost + completionCost;
  }
}
