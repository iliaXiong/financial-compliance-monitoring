import { pool } from '../config/database';
import { SummaryDocument, Source } from '../types';

export class SummaryDocumentRepository {
  /**
   * Create a new summary document
   */
  async create(data: {
    executionId: string;
    content: string;
    sources: Source[];
  }): Promise<SummaryDocument> {
    const query = `
      INSERT INTO summary_documents (execution_id, content, sources)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    
    const values = [
      data.executionId,
      data.content,
      JSON.stringify(data.sources)
    ];
    
    const result = await pool.query(query, values);
    return this.mapRowToSummaryDocument(result.rows[0]);
  }

  /**
   * Find summary document by ID
   */
  async findById(documentId: string): Promise<SummaryDocument | null> {
    const query = 'SELECT * FROM summary_documents WHERE id = $1';
    const result = await pool.query(query, [documentId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToSummaryDocument(result.rows[0]);
  }

  /**
   * Find summary document by execution ID
   */
  async findByExecutionId(executionId: string): Promise<SummaryDocument | null> {
    const query = `
      SELECT * FROM summary_documents
      WHERE execution_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    const result = await pool.query(query, [executionId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToSummaryDocument(result.rows[0]);
  }

  /**
   * Update summary document content
   */
  async update(documentId: string, content: string, sources: Source[]): Promise<SummaryDocument | null> {
    const query = `
      UPDATE summary_documents
      SET content = $1, sources = $2
      WHERE id = $3
      RETURNING *
    `;
    
    const result = await pool.query(query, [content, JSON.stringify(sources), documentId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToSummaryDocument(result.rows[0]);
  }

  /**
   * Delete summary document
   */
  async delete(documentId: string): Promise<boolean> {
    const query = 'DELETE FROM summary_documents WHERE id = $1';
    const result = await pool.query(query, [documentId]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Map database row to SummaryDocument object
   */
  private mapRowToSummaryDocument(row: any): SummaryDocument {
    return {
      id: row.id,
      executionId: row.execution_id,
      content: row.content,
      sources: typeof row.sources === 'string' ? JSON.parse(row.sources) : row.sources,
      createdAt: row.created_at
    };
  }
}
