import { pool } from '../config/database';
import { OriginalContent } from '../types';

export class OriginalContentRepository {
  /**
   * Create a new original content record
   */
  async create(data: {
    retrievalResultId: string;
    contentType: string;
    rawContent: string;
  }): Promise<OriginalContent> {
    const query = `
      INSERT INTO original_contents (retrieval_result_id, content_type, raw_content)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    
    const values = [
      data.retrievalResultId,
      data.contentType,
      data.rawContent
    ];
    
    const result = await pool.query(query, values);
    return this.mapRowToOriginalContent(result.rows[0]);
  }

  /**
   * Find original content by ID
   */
  async findById(contentId: string): Promise<OriginalContent | null> {
    const query = 'SELECT * FROM original_contents WHERE id = $1';
    const result = await pool.query(query, [contentId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToOriginalContent(result.rows[0]);
  }

  /**
   * Find original content by retrieval result ID
   */
  async findByRetrievalResultId(retrievalResultId: string): Promise<OriginalContent | null> {
    const query = `
      SELECT * FROM original_contents
      WHERE retrieval_result_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    const result = await pool.query(query, [retrievalResultId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToOriginalContent(result.rows[0]);
  }

  /**
   * Find all original contents for an execution (via retrieval results)
   */
  async findByExecutionId(executionId: string): Promise<OriginalContent[]> {
    const query = `
      SELECT oc.* FROM original_contents oc
      INNER JOIN retrieval_results rr ON oc.retrieval_result_id = rr.id
      WHERE rr.execution_id = $1
      ORDER BY oc.created_at ASC
    `;
    
    const result = await pool.query(query, [executionId]);
    return result.rows.map((row: any) => this.mapRowToOriginalContent(row));
  }

  /**
   * Delete original content
   */
  async delete(contentId: string): Promise<boolean> {
    const query = 'DELETE FROM original_contents WHERE id = $1';
    const result = await pool.query(query, [contentId]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Map database row to OriginalContent object
   */
  private mapRowToOriginalContent(row: any): OriginalContent {
    return {
      id: row.id,
      retrievalResultId: row.retrieval_result_id,
      contentType: row.content_type,
      rawContent: row.raw_content,
      createdAt: row.created_at
    };
  }
}
