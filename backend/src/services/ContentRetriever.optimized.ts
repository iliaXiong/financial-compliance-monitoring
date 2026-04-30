/**
 * ContentRetriever优化版本 - 集成SimpleRetriever和DebugLogger
 * 
 * 这个文件包含优化后的llmWebSearch方法和相关辅助方法
 * 将在下一步集成到ContentRetriever.ts中
 */

import { SimpleRetriever, Chunk } from './SimpleRetriever';
import { DebugLogger, DebugInfo } from './DebugLogger';
import { KeywordMatch } from '../types';
import { DocumentRetrievalResult } from './ContentRetriever';

/**
 * 优化后的LLM Web搜索方法
 */
export async function llmWebSearchOptimized(
  websiteUrl: string,
  keywords: string[],
  mainPageContent: string,
  subPageContents: Array<{ url: string; content: string }>,
  documentContents: Array<{ url: string; content: string }>,
  extractTextContent: (content: string) => string,
  callLLM: (prompt: string) => Promise<string>,
  getErrorMessage: (error: unknown) => string
): Promise<{
  keywordMatches: KeywordMatch[];
  documentResults: DocumentRetrievalResult[];
  debugInfo?: DebugInfo[];
}> {
  const startTime = Date.now();
  const debugInfoList: DebugInfo[] = [];
  const debugMode = process.env.DEBUG_MODE === 'true';
  const maxChunks = parseInt(process.env.MAX_CHUNKS_PER_KEYWORD || '30', 10);

  console.log(`[ContentRetriever] Using optimized LLM search for ${websiteUrl}`);

  // 1. 初始化SimpleRetriever
  const retriever = new SimpleRetriever(
    parseInt(process.env.CHUNK_MAX_SIZE || '500', 10),
    parseInt(process.env.CHUNK_MIN_SIZE || '100', 10),
    parseInt(process.env.CHUNK_OVERLAP || '50', 10)
  );

  // 2. 拆分所有内容为chunks
  const allChunks: Chunk[] = [];

  // 主页面
  const mainChunks = retriever.chunkContent(
    extractTextContent(mainPageContent),
    websiteUrl,
    'main'
  );
  allChunks.push(...mainChunks);

  // 子页面
  subPageContents.forEach((page) => {
    const chunks = retriever.chunkContent(
      extractTextContent(page.content),
      page.url,
      'subpage'
    );
    allChunks.push(...chunks);
  });

  // 文档
  documentContents.forEach((doc) => {
    const chunks = retriever.chunkContent(
      extractTextContent(doc.content),
      doc.url,
      'document'
    );
    allChunks.push(...chunks);
  });

  console.log(`[ContentRetriever] Total chunks created: ${allChunks.length}`);

  // 3. 建立BM25索引
  retriever.buildIndex(allChunks);

  // 4. 为每个关键词检索和调用LLM
  const keywordMatches: KeywordMatch[] = [];

  for (const keyword of keywords) {
    const debugLogger = new DebugLogger(keyword, websiteUrl);

    try {
      // 记录内容获取信息
      debugLogger.logContentFetch(
        mainPageContent.length,
        subPageContents.length,
        documentContents.length,
        mainPageContent.length +
          subPageContents.reduce((sum, p) => sum + p.content.length, 0) +
          documentContents.reduce((sum, d) => sum + d.content.length, 0)
      );

      // 记录chunk信息
      debugLogger.logChunking(allChunks);

      // 检索相关chunks（最多maxChunks个）
      const retrievedChunks = retriever.retrieve(keyword, maxChunks);
      debugLogger.logRetrieval(retrievedChunks);

      if (retrievedChunks.length === 0) {
        console.warn(
          `[ContentRetriever] No chunks retrieved for keyword: ${keyword}`
        );
        keywordMatches.push({
          keyword,
          found: false,
          occurrences: 0,
          contexts: [],
        });
        continue;
      }

      // 构建优化后的prompt
      const prompt = buildOptimizedPrompt(keyword, retrievedChunks);

      // 调用LLM
      const llmStartTime = Date.now();
      const llmResponse = await callLLM(prompt);
      const llmDuration = Date.now() - llmStartTime;

      // 估算token数量（简单估算：中文1字符≈1.5tokens）
      const promptTokens = Math.ceil(prompt.length * 1.5);
      const completionTokens = Math.ceil(llmResponse.length * 1.5);
      debugLogger.logLLMCall(promptTokens, completionTokens, llmDuration);

      // 解析LLM响应
      const answer = parseLLMResponse(llmResponse);
      debugLogger.logLLMAnswer(answer);

      // 验证响应
      debugLogger.validate(retrievedChunks);

      // 转换为KeywordMatch格式
      keywordMatches.push({
        keyword: answer.keyword,
        found: answer.found,
        occurrences: answer.found ? 1 : 0,
        contexts: answer.found && answer.quotedSentence ? [answer.quotedSentence] : [],
        sourceUrl: answer.sourceUrl,
        confidence: answer.confidence,
      });

      // 保存debug信息
      if (debugMode) {
        debugInfoList.push(debugLogger.getDebugInfo());
        debugLogger.print();
      }
    } catch (error) {
      console.error(
        `[ContentRetriever] Error processing keyword ${keyword}:`,
        getErrorMessage(error)
      );
      keywordMatches.push({
        keyword,
        found: false,
        occurrences: 0,
        contexts: [],
        error: getErrorMessage(error),
      });
    }
  }

  const totalDuration = Date.now() - startTime;
  console.log(
    `[ContentRetriever] Completed all keywords in ${totalDuration}ms`
  );

  // 构建文档结果（基于sourceUrl分组）
  const documentResults = buildDocumentResults(keywordMatches, documentContents);

  return {
    keywordMatches,
    documentResults,
    debugInfo: debugMode ? debugInfoList : undefined,
  };
}

/**
 * 构建优化后的LLM prompt
 */
function buildOptimizedPrompt(keyword: string, chunks: Chunk[]): string {
  // 格式化chunks
  const formattedChunks = chunks
    .map((chunk, index) => {
      return `[Chunk ${index + 1} | ${chunk.sourceUrl}]\n${chunk.content}`;
    })
    .join('\n\n');

  return `关键词: ${keyword}

以下是可能相关的内容片段：

${formattedChunks}

任务：
1. 判断关键词"${keyword}"是否在上述内容中存在
2. 如果存在，给出该关键词的定义/解释/描述
3. 必须引用原文句子（完整的句子，不要截断）
4. 必须提供来源URL
5. 如果不存在，明确说"该关键词在提供的内容中不存在"

输出格式（严格JSON）：
{
  "keyword": "${keyword}",
  "found": true/false,
  "definition": "关键词的定义/解释（如果found为false，此字段为空字符串）",
  "quotedSentence": "引用的原文句子（完整句子）",
  "sourceUrl": "来源URL",
  "confidence": 0.0-1.0
}

注意：
- quotedSentence必须是原文中的完整句子，不能修改或截断
- sourceUrl必须是实际的来源URL，格式为 [Chunk X | URL] 中的URL
- 如果found为false，quotedSentence和sourceUrl都应为空字符串
- confidence表示答案的可信度（0.0-1.0）`;
}

/**
 * System Prompt
 */
export const OPTIMIZED_SYSTEM_PROMPT = `你是一个金融合规政策分析专家。

你的任务是：
1. 在提供的内容片段中查找指定关键词
2. 提取关键词的定义、解释或描述
3. 必须引用原文句子作为证据
4. 必须提供准确的来源URL

重要规则：
- 只能基于提供的内容片段回答，不能使用外部知识
- 引用的句子必须是原文中的完整句子
- 如果内容中没有该关键词，必须明确说明
- 返回严格的JSON格式，不要包含任何其他文本`;

/**
 * 解析LLM响应
 */
function parseLLMResponse(llmResponse: string): any {
  try {
    // 提取JSON
    let content = llmResponse.trim();

    // 移除markdown代码块
    const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      content = jsonMatch[1];
    }

    // 提取第一个{到最后一个}
    const jsonStart = content.indexOf('{');
    const jsonEnd = content.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      content = content.substring(jsonStart, jsonEnd + 1);
    }

    const parsed = JSON.parse(content);

    // 确保所有必需字段存在
    return {
      keyword: parsed.keyword || '',
      found: parsed.found || false,
      definition: parsed.definition || '',
      quotedSentence: parsed.quotedSentence || '',
      sourceUrl: parsed.sourceUrl || '',
      confidence: parsed.confidence || 0,
    };
  } catch (error) {
    console.error('[ContentRetriever] Failed to parse LLM response:', error);
    throw new Error('Failed to parse LLM response as JSON');
  }
}

/**
 * 构建文档结果
 */
function buildDocumentResults(
  keywordMatches: KeywordMatch[],
  documentContents: Array<{ url: string; content: string }>
): DocumentRetrievalResult[] {
  const documentMap = new Map<string, KeywordMatch[]>();

  // 按sourceUrl分组
  keywordMatches.forEach((match) => {
    if (match.found && match.sourceUrl) {
      const isDocument = documentContents.some(
        (doc) => doc.url === match.sourceUrl
      );
      if (isDocument) {
        if (!documentMap.has(match.sourceUrl)) {
          documentMap.set(match.sourceUrl, []);
        }
        documentMap.get(match.sourceUrl)!.push(match);
      }
    }
  });

  // 构建结果
  const results: DocumentRetrievalResult[] = [];
  documentMap.forEach((matches, url) => {
    results.push({
      documentUrl: url,
      status: 'success',
      keywordMatches: matches,
    });
  });

  return results;
}
