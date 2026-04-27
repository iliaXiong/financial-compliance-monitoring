import { pool } from '../config/database';
import { RetrievalResult } from '../types';

export class RetrievalResultRepository {
  /**
   * Create a new retrieval result
   */
  async create(data: {
    executionId: string;
    websiteUrl: string;
    keyword: string;
    found: boolean;
    content?: string;
    context?: string;
    sourceUrl?: string;
    documentUrl?: string;
  }): Promise<RetrievalResult> {
    const query = `
      INSERT INTO retrieval_results (
        execution_id, website_url, keyword, found,
        content, context, source_url, document_url
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const values = [
      data.executionId,
      data.websiteUrl,
      data.keyword,
      data.found,
      data.content || null,
      data.context || null,
      data.sourceUrl || null,
      data.documentUrl || null
    ];
    
    const result = await pool.query(query, values);
    return this.mapRowToRetrievalResult(result.rows[0]);
  }

  /**
   * Create multiple retrieval results in a transaction
   */
  async createMany(results: Array<{
    executionId: string;
    websiteUrl: string;
    keyword: string;
    found: boolean;
    content?: string;
    context?: string;
    sourceUrl?: string;
    documentUrl?: string;
  }>): Promise<RetrievalResult[]> {
    if (results.length === 0) {
      return [];
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const createdResults: RetrievalResult[] = [];
      
      for (const data of results) {
        const query = `
          INSERT INTO retrieval_results (
            execution_id, website_url, keyword, found,
            content, context, source_url, document_url
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *
        `;
        
        const values = [
          data.executionId,
          data.websiteUrl,
          data.keyword,
          data.found,
          data.content || null,
          data.context || null,
          data.sourceUrl || null,
          data.documentUrl || null
        ];
        
        const result = await client.query(query, values);
        createdResults.push(this.mapRowToRetrievalResult(result.rows[0]));
      }
      
      await client.query('COMMIT');
      return createdResults;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Find retrieval result by ID
   */
  async findById(resultId: string): Promise<RetrievalResult | null> {
    const query = 'SELECT * FROM retrieval_results WHERE id = $1';
    const result = await pool.query(query, [resultId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToRetrievalResult(result.rows[0]);
  }

  /**
   * Find all retrieval results for an execution
   */
  async findByExecutionId(executionId: string): Promise<RetrievalResult[]> {
    const query = `
      SELECT * FROM retrieval_results
      WHERE execution_id = $1
      ORDER BY created_at ASC
    `;
    
    const result = await pool.query(query, [executionId]);
    return result.rows.map((row: any) => this.mapRowToRetrievalResult(row));
  }

  /**
   * Find retrieval results by execution ID and keyword
   */
  async findByExecutionIdAndKeyword(executionId: string, keyword: string): Promise<RetrievalResult[]> {
    const query = `
      SELECT * FROM retrieval_results
      WHERE execution_id = $1 AND keyword = $2
      ORDER BY created_at ASC
    `;
    
    const result = await pool.query(query, [executionId, keyword]);
    return result.rows.map((row: any) => this.mapRowToRetrievalResult(row));
  }

  /**
   * Find retrieval results by execution ID and website
   */
  async findByExecutionIdAndWebsite(executionId: string, websiteUrl: string): Promise<RetrievalResult[]> {
    const query = `
      SELECT * FROM retrieval_results
      WHERE execution_id = $1 AND website_url = $2
      ORDER BY created_at ASC
    `;
    
    const result = await pool.query(query, [executionId, websiteUrl]);
    return result.rows.map((row: any) => this.mapRowToRetrievalResult(row));
  }

  /**
   * Count results by execution ID
   */
  async countByExecutionId(executionId: string): Promise<number> {
    const query = 'SELECT COUNT(*) FROM retrieval_results WHERE execution_id = $1';
    const result = await pool.query(query, [executionId]);
    return parseInt(result.rows[0].count);
  }

  /**
   * Map database row to RetrievalResult object
   */
  private mapRowToRetrievalResult(row: any): RetrievalResult {
    return {
      id: row.id,
      executionId: row.execution_id,
      websiteUrl: row.website_url,
      keyword: row.keyword,
      found: row.found,
      content: row.content,
      context: row.context,
      sourceUrl: row.source_url,
      documentUrl: row.document_url,
      createdAt: row.created_at
    };
  }
}
