#!/usr/bin/env ts-node
/**
 * Script to fix stuck executions that are in 'running' state for too long
 * 
 * This script:
 * 1. Finds executions that have been running for more than a specified timeout
 * 2. Marks them as failed with an appropriate error message
 * 3. Optionally retries them
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'financial_compliance',
});

interface StuckExecution {
  id: string;
  task_id: string;
  start_time: Date;
  duration_minutes: number;
}

async function findStuckExecutions(timeoutMinutes: number = 30): Promise<StuckExecution[]> {
  const query = `
    SELECT 
      id,
      task_id,
      start_time,
      EXTRACT(EPOCH FROM (NOW() - start_time)) / 60 AS duration_minutes
    FROM executions
    WHERE status = 'running'
      AND start_time < NOW() - INTERVAL '${timeoutMinutes} minutes'
    ORDER BY start_time ASC;
  `;

  const result = await pool.query(query);
  return result.rows;
}

async function markExecutionAsFailed(executionId: string, errorMessage: string): Promise<void> {
  const query = `
    UPDATE executions
    SET 
      status = 'failed',
      error_message = $1,
      end_time = NOW()
    WHERE id = $2;
  `;

  await pool.query(query, [errorMessage, executionId]);
  console.log(`✓ Marked execution ${executionId} as failed`);
}

async function main() {
  console.log('🔍 Checking for stuck executions...\n');

  const timeoutMinutes = parseInt(process.argv[2] || '30');
  console.log(`Timeout threshold: ${timeoutMinutes} minutes\n`);

  try {
    const stuckExecutions = await findStuckExecutions(timeoutMinutes);

    if (stuckExecutions.length === 0) {
      console.log('✓ No stuck executions found');
      return;
    }

    console.log(`Found ${stuckExecutions.length} stuck execution(s):\n`);

    for (const execution of stuckExecutions) {
      console.log(`- Execution ID: ${execution.id}`);
      console.log(`  Task ID: ${execution.task_id}`);
      console.log(`  Started: ${execution.start_time}`);
      console.log(`  Duration: ${Math.round(execution.duration_minutes)} minutes`);
      console.log();

      const errorMessage = `Execution timeout: stuck in running state for ${Math.round(execution.duration_minutes)} minutes. Automatically marked as failed.`;
      await markExecutionAsFailed(execution.id, errorMessage);
    }

    console.log(`\n✓ Fixed ${stuckExecutions.length} stuck execution(s)`);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
