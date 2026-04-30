/**
 * Chunk接口
 */
export interface Chunk {
  id: string;
  content: string;
  sourceUrl: string;
  chunkIndex: number;
  pageType: 'main' | 'subpage' | 'document';
  score?: number;
}

/**
 * 简单的TF-IDF实现（不依赖natural库）
 */
class SimpleTfIdf {
  private documents: string[] = [];
  private documentTerms: Map<number, Map<string, number>> = new Map();
  private idf: Map<string, number> = new Map();

  addDocument(text: string): void {
    const docIndex = this.documents.length;
    this.documents.push(text);

    // 分词并计算词频
    const terms = this.tokenize(text);
    const termFreq = new Map<string, number>();
    
    terms.forEach(term => {
      termFreq.set(term, (termFreq.get(term) || 0) + 1);
    });

    this.documentTerms.set(docIndex, termFreq);
  }

  buildIndex(): void {
    // 计算IDF
    const docCount = this.documents.length;
    const termDocCount = new Map<string, number>();

    // 统计每个词出现在多少个文档中
    this.documentTerms.forEach(termFreq => {
      const uniqueTerms = new Set(termFreq.keys());
      uniqueTerms.forEach(term => {
        termDocCount.set(term, (termDocCount.get(term) || 0) + 1);
      });
    });

    // 计算IDF: log(N / df)
    termDocCount.forEach((df, term) => {
      this.idf.set(term, Math.log(docCount / df));
    });
  }

  search(query: string, maxResults: number = 10): Array<{ index: number; score: number }> {
    const queryTerms = this.tokenize(query);
    const scores: Array<{ index: number; score: number }> = [];

    // 计算每个文档的相关性分数
    this.documentTerms.forEach((termFreq, docIndex) => {
      let score = 0;

      queryTerms.forEach(term => {
        const tf = termFreq.get(term) || 0;
        const idf = this.idf.get(term) || 0;
        score += tf * idf;
      });

      if (score > 0) {
        scores.push({ index: docIndex, score });
      }
    });

    // 按分数降序排序
    scores.sort((a, b) => b.score - a.score);

    return scores.slice(0, maxResults);
  }

  private tokenize(text: string): string[] {
    const tokens: string[] = [];
    
    // 处理中文：按字符分割（bigram和trigram）
    const chineseChars = text.match(/[\u4e00-\u9fa5]+/g) || [];
    chineseChars.forEach(chunk => {
      // 单字
      for (let i = 0; i < chunk.length; i++) {
        tokens.push(chunk[i]);
      }
      // 双字组合（bigram）
      for (let i = 0; i < chunk.length - 1; i++) {
        tokens.push(chunk.substring(i, i + 2));
      }
      // 三字组合（trigram）
      for (let i = 0; i < chunk.length - 2; i++) {
        tokens.push(chunk.substring(i, i + 3));
      }
    });
    
    // 处理英文：转小写，按空格分割，保留连字符
    const englishText = text
      .toLowerCase()
      .replace(/[\u4e00-\u9fa5]/g, ' '); // 移除中文
    
    // 提取单词（包括连字符的词组）
    const words = englishText.match(/[a-z0-9]+(?:-[a-z0-9]+)*/g) || [];
    tokens.push(...words);
    
    // 对于连字符的词组，也添加拆分后的部分
    words.forEach(word => {
      if (word.includes('-')) {
        const parts = word.split('-');
        tokens.push(...parts.filter(p => p.length > 1));
      }
    });
    
    return tokens.filter(t => t.length > 0);
  }
}

/**
 * 简单检索器 - 使用TF-IDF算法
 */
export class SimpleRetriever {
  private tfidf: SimpleTfIdf;
  private chunks: Chunk[] = [];
  private readonly maxChunkSize: number;
  private readonly minChunkSize: number;
  private readonly overlapSize: number;

  constructor(
    maxChunkSize: number = 500,
    minChunkSize: number = 100,
    overlapSize: number = 50
  ) {
    this.tfidf = new SimpleTfIdf();
    this.maxChunkSize = maxChunkSize;
    this.minChunkSize = minChunkSize;
    this.overlapSize = overlapSize;
  }

  /**
   * 将内容拆分为chunks
   */
  chunkContent(
    content: string,
    sourceUrl: string,
    pageType: 'main' | 'subpage' | 'document'
  ): Chunk[] {
    const chunks: Chunk[] = [];

    // 1. 按段落拆分
    const paragraphs = content
      .split(/\n\n+/)
      .filter((p) => p.trim().length > 0);

    let chunkIndex = 0;
    for (const paragraph of paragraphs) {
      // 2. 如果段落过长，按句子拆分
      if (paragraph.length > this.maxChunkSize) {
        const sentences = paragraph.split(/([。！？])/);
        let currentChunk = '';

        for (let i = 0; i < sentences.length; i += 2) {
          const sentence = sentences[i] + (sentences[i + 1] || '');

          if (currentChunk.length + sentence.length > this.maxChunkSize) {
            if (currentChunk.length >= this.minChunkSize) {
              chunks.push(
                this.createChunk(currentChunk, sourceUrl, pageType, chunkIndex++)
              );
            }
            currentChunk = sentence;
          } else {
            currentChunk += sentence;
          }
        }

        if (currentChunk.length >= this.minChunkSize) {
          chunks.push(
            this.createChunk(currentChunk, sourceUrl, pageType, chunkIndex++)
          );
        }
      } else if (paragraph.length >= this.minChunkSize) {
        // 3. 段落长度适中，直接作为chunk
        chunks.push(
          this.createChunk(paragraph, sourceUrl, pageType, chunkIndex++)
        );
      }
    }

    return chunks;
  }

  /**
   * 创建chunk对象
   */
  private createChunk(
    content: string,
    sourceUrl: string,
    pageType: 'main' | 'subpage' | 'document',
    chunkIndex: number
  ): Chunk {
    return {
      id: `${sourceUrl}_${chunkIndex}`,
      content: content.trim(),
      sourceUrl,
      chunkIndex,
      pageType,
    };
  }

  /**
   * 建立TF-IDF索引
   */
  buildIndex(chunks: Chunk[]): void {
    this.chunks = chunks;
    this.tfidf = new SimpleTfIdf();

    // 为每个chunk添加到TF-IDF索引
    chunks.forEach((chunk) => {
      this.tfidf.addDocument(chunk.content);
    });

    // 构建索引
    this.tfidf.buildIndex();

    console.log(`[SimpleRetriever] Built index with ${chunks.length} chunks`);
  }

  /**
   * 检索相关chunks
   */
  retrieve(query: string, topK: number = 30): Chunk[] {
    if (this.chunks.length === 0) {
      return [];
    }

    // 使用TF-IDF搜索
    const results = this.tfidf.search(query, topK);

    // 将结果映射回chunks并添加分数
    const retrievedChunks = results.map((result) => ({
      ...this.chunks[result.index],
      score: result.score,
    }));

    console.log(
      `[SimpleRetriever] Retrieved ${retrievedChunks.length} chunks for query: "${query}"`
    );

    return retrievedChunks;
  }

  /**
   * 批量检索多个关键词
   */
  retrieveMultiple(
    keywords: string[],
    topKPerKeyword: number = 10
  ): Map<string, Chunk[]> {
    const results = new Map<string, Chunk[]>();

    keywords.forEach((keyword) => {
      const chunks = this.retrieve(keyword, topKPerKeyword);
      results.set(keyword, chunks);
    });

    return results;
  }

  /**
   * 获取所有chunks
   */
  getAllChunks(): Chunk[] {
    return this.chunks;
  }

  /**
   * 获取chunks数量
   */
  getChunkCount(): number {
    return this.chunks.length;
  }
}
