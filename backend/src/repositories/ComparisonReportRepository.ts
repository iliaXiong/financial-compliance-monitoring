import { pool } from '../config/database';
import { ComparisonReport, Changes } from '../types';

export class ComparisonReportRepository {
  /**
   * Create a new comparison report
   */
  async create(data: {
    currentExecutionId: string;
    previousExecutionId: string;
    websiteUrl: string;
    keyword: string;
    changes: Changes;
    summary?: string;
  }): Promise<ComparisonReport> {
    const query = `
      INSERT INTO comparison_reports (
        current_execution_id, previous_execution_id,
        website_url, keyword, changes, summary
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const values = [
      data.currentExecutionId,
      data.previousExecutionId,
      data.websiteUrl,
      data.keyword,
      JSON.stringify(data.changes),
      data.summary || null
    ];
    
    const result = await pool.query(query, values);
    return this.mapRowToComparisonReport(result.rows[0]);
  }

  /**
   * Create multiple comparison reports in a transaction
   */
  async createMany(reports: Array<{
    currentExecutionId: string;
    previousExecutionId: string;
    websiteUrl: string;
    keyword: string;
    changes: Changes;
    summary?: string;
  }>): Promise<ComparisonReport[]> {
    if (reports.length === 0) {
      return [];
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const createdReports: ComparisonReport[] = [];
      
      for (const data of reports) {
        const query = `
          INSERT INTO comparison_reports (
            current_execution_id, previous_execution_id,
            website_url, keyword, changes, summary
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `;
        
        const values = [
          data.currentExecutionId,
          data.previousExecutionId,
          data.websiteUrl,
          data.keyword,
          JSON.stringify(data.changes),
          data.summary || null
        ];
        
        const result = await client.query(query, values);
        createdReports.push(this.mapRowToComparisonReport(result.rows[0]));
      }
      
      await client.query('COMMIT');
      return createdReports;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Find comparison report by ID
   */
  async findById(reportId: string): Promise<ComparisonReport | null> {
    const query = 'SELECT * FROM comparison_reports WHERE id = $1';
    const result = await pool.query(query, [reportId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToComparisonReport(result.rows[0]);
  }

  /**
   * Find all comparison reports for a current execution
   */
  async findByCurrentExecutionId(executionId: string): Promise<ComparisonReport[]> {
    const query = `
      SELECT * FROM comparison_reports
      WHERE current_execution_id = $1
      ORDER BY created_at ASC
    `;
    
    const result = await pool.query(query, [executionId]);
    return result.rows.map((row: any) => this.mapRowToComparisonReport(row));
  }

  /**
   * Find comparison report by execution and website/keyword
   */
  async findByExecutionAndWebsiteKeyword(
    currentExecutionId: string,
    websiteUrl: string,
    keyword: string
  ): Promise<ComparisonReport | null> {
    const query = `
      SELECT * FROM comparison_reports
      WHERE current_execution_id = $1
        AND website_url = $2
        AND keyword = $3
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    const result = await pool.query(query, [currentExecutionId, websiteUrl, keyword]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToComparisonReport(result.rows[0]);
  }

  /**
   * Delete comparison report
   */
  async delete(reportId: string): Promise<boolean> {
    const query = 'DELETE FROM comparison_reports WHERE id = $1';
    const result = await pool.query(query, [reportId]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Map database row to ComparisonReport object
   */
  private mapRowToComparisonReport(row: any): ComparisonReport {
    return {
      id: row.id,
      currentExecutionId: row.current_execution_id,
      previousExecutionId: row.previous_execution_id,
      websiteUrl: row.website_url,
      keyword: row.keyword,
      changes: typeof row.changes === 'string' ? JSON.parse(row.changes) : row.changes,
      summary: row.summary,
      createdAt: row.created_at
    };
  }
}
