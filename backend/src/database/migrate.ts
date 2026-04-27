import { readFileSync } from 'fs';
import { join } from 'path';
import { pool } from '../config/database';

const migrations = [
  '001_create_users_table.sql',
  '002_create_tasks_table.sql',
  '003_create_executions_table.sql',
  '004_create_retrieval_results_table.sql',
  '005_create_original_contents_table.sql',
  '006_create_summary_documents_table.sql',
  '007_create_comparison_reports_table.sql',
  '008_create_cross_site_analyses_table.sql',
];

async function runMigrations() {
  console.log('Starting database migrations...');

  try {
    for (const migration of migrations) {
      console.log(`Running migration: ${migration}`);
      const migrationPath = join(__dirname, 'migrations', migration);
      const sql = readFileSync(migrationPath, 'utf-8');

      await pool.query(sql);
      console.log(`✓ Completed migration: ${migration}`);
    }

    console.log('All migrations completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { runMigrations };
