import { pool } from '../config/database';
import { CrossSiteAnalysis, Difference } from '../types';

export class CrossSiteAnalysisRepository {
  /**
   * Create a new cross-site analysis
   */
  async create(data: {
    executionId: string;
    keyword: string;
    differences: Difference[];
    commonalities: string[];
    analysisSummary?: string;
  }): Promise<CrossSiteAnalysis> {
    const query = `
      INSERT INTO cross_site_analyses (
        execution_id, keyword, differences, commonalities, analysis_summary
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const values = [
      data.executionId,
      data.keyword,
      JSON.stringify(data.differences),
      JSON.stringify(data.commonalities),
      data.analysisSummary || null
    ];
    
    const result = await pool.query(query, values);
    return this.mapRowToCrossSiteAnalysis(result.rows[0]);
  }

  /**
   * Create multiple cross-site analyses in a transaction
   */
  async createMany(analyses: Array<{
    executionId: string;
    keyword: string;
    differences: Difference[];
    commonalities: string[];
    analysisSummary?: string;
  }>): Promise<CrossSiteAnalysis[]> {
    if (analyses.length === 0) {
      return [];
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const createdAnalyses: CrossSiteAnalysis[] = [];
      
      for (const data of analyses) {
        const query = `
          INSERT INTO cross_site_analyses (
            execution_id, keyword, differences, commonalities, analysis_summary
          )
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `;
        
        const values = [
          data.executionId,
          data.keyword,
          JSON.stringify(data.differences),
          JSON.stringify(data.commonalities),
          data.analysisSummary || null
        ];
        
        const result = await client.query(query, values);
        createdAnalyses.push(this.mapRowToCrossSiteAnalysis(result.rows[0]));
      }
      
      await client.query('COMMIT');
      return createdAnalyses;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Find cross-site analysis by ID
   */
  async findById(analysisId: string): Promise<CrossSiteAnalysis | null> {
    const query = 'SELECT * FROM cross_site_analyses WHERE id = $1';
    const result = await pool.query(query, [analysisId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToCrossSiteAnalysis(result.rows[0]);
  }

  /**
   * Find all cross-site analyses for an execution
   */
  async findByExecutionId(executionId: string): Promise<CrossSiteAnalysis[]> {
    const query = `
      SELECT * FROM cross_site_analyses
      WHERE execution_id = $1
      ORDER BY created_at ASC
    `;
    
    const result = await pool.query(query, [executionId]);
    return result.rows.map((row: any) => this.mapRowToCrossSiteAnalysis(row));
  }

  /**
   * Find cross-site analysis by execution ID and keyword
   */
  async findByExecutionIdAndKeyword(executionId: string, keyword: string): Promise<CrossSiteAnalysis | null> {
    const query = `
      SELECT * FROM cross_site_analyses
      WHERE execution_id = $1 AND keyword = $2
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    const result = await pool.query(query, [executionId, keyword]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToCrossSiteAnalysis(result.rows[0]);
  }

  /**
   * Delete cross-site analysis
   */
  async delete(analysisId: string): Promise<boolean> {
    const query = 'DELETE FROM cross_site_analyses WHERE id = $1';
    const result = await pool.query(query, [analysisId]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Map database row to CrossSiteAnalysis object
   */
  private mapRowToCrossSiteAnalysis(row: any): CrossSiteAnalysis {
    return {
      id: row.id,
      executionId: row.execution_id,
      keyword: row.keyword,
      differences: typeof row.differences === 'string' ? JSON.parse(row.differences) : row.differences,
      commonalities: typeof row.commonalities === 'string' ? JSON.parse(row.commonalities) : row.commonalities,
      analysisSummary: row.analysis_summary,
      createdAt: row.created_at
    };
  }
}
