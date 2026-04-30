import natural from 'natural';

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
 * 简单检索器 - 使用BM25算法（基于TF-IDF）
 */
export class SimpleRetriever {
  private tfidf: natural.TfIdf;
  private chunks: Chunk[] = [];
  private readonly maxChunkSize: number;
  private readonly minChunkSize: number;
  private readonly overlapSize: number;

  constructor(
    maxChunkSize: number = 500,
    minChunkSize: number = 100,
    overlapSize: number = 50
  ) {
    this.tfidf = new natural.TfIdf();
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
   * 建立BM25索引（使用TF-IDF作为近似）
   */
  buildIndex(chunks: Chunk[]): void {
    this.chunks = chunks;
    this.tfidf = new natural.TfIdf();

    // 为每个chunk添加到TF-IDF索引
    chunks.forEach((chunk) => {
      this.tfidf.addDocument(chunk.content);
    });

    console.log(`[SimpleRetriever] Built index with ${chunks.length} chunks`);
  }

  /**
   * 检索相关chunks
   */
  retrieve(query: string, topK: number = 30): Chunk[] {
    if (this.chunks.length === 0) {
      return [];
    }

    // 使用TF-IDF计算相关性
    const scores: Array<{ chunk: Chunk; score: number }> = [];

    this.tfidf.tfidfs(query, (i, score) => {
      if (i < this.chunks.length) {
        scores.push({
          chunk: { ...this.chunks[i], score },
          score,
        });
      }
    });

    // 按分数排序并返回Top K
    const topChunks = scores
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map((item) => item.chunk);

    console.log(
      `[SimpleRetriever] Retrieved ${topChunks.length} chunks for query: "${query}"`
    );

    return topChunks;
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
