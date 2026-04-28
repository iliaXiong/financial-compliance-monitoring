import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { config } from './config';
import { pool } from './config/database';
import { connectRedis } from './config/redis';
import apiRoutes from './routes';
import { errorHandler, notFoundHandler } from './middleware';
import { taskScheduler } from './routes/tasks';

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'healthy',
      services: {
        database: 'up',
        redis: 'up',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: 'Service unavailable',
      timestamp: new Date().toISOString(),
    });
  }
});

// API routes will be added here
app.get('/', (req, res) => {
  res.json({
    message: 'Financial Compliance Monitoring API',
    version: '1.0.0',
  });
});

// Mount API routes
app.use('/api', apiRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handling middleware
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Connect to Redis
    await connectRedis();
    console.log('✓ Redis connected');

    // Test database connection
    await pool.query('SELECT 1');
    console.log('✓ Database connected');

    // Reschedule all active tasks on startup
    await rescheduleActiveTasks();

    // Start listening
    app.listen(config.server.port, () => {
      console.log(`✓ Server running on port ${config.server.port}`);
      console.log(`✓ Environment: ${config.server.nodeEnv}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

/**
 * On startup, reload all active tasks from DB and reschedule them.
 * Uses existing next_execution_at from DB if still in the future,
 * otherwise recalculates (for tasks that missed their window during downtime).
 */
async function rescheduleActiveTasks(): Promise<void> {
  try {
    const result = await pool.query(
      "SELECT * FROM tasks WHERE status = 'active' ORDER BY created_at ASC"
    );

    const now = new Date();

    const activeTasks = result.rows.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      keywords: row.keywords,
      targetWebsites: row.target_websites,
      schedule: {
        type: row.schedule_type,
        time: row.schedule_time,
        dayOfWeek: row.schedule_day_of_week,
        dayOfMonth: row.schedule_day_of_month,
      },
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastExecutedAt: row.last_executed_at,
      // Pass raw string so scheduleTask can use it
      nextExecutionAt: row.next_execution_at,
      _nextExecutionRaw: row.next_execution_at, // raw local time string from DB
    }));

    console.log(`✓ Rescheduling ${activeTasks.length} active task(s) on startup`);

    for (const task of activeTasks) {
      try {
        const rawNext = (task as any)._nextExecutionRaw;
        // If DB has a future next_execution_at, re-queue directly without recalculating
        if (rawNext) {
          const nextTime = new Date(rawNext + 'Z'); // treat as local time stored without tz
          // Actually stored as local time, so parse correctly
          const nextLocal = new Date(rawNext.replace(' ', 'T'));
          const delay = nextLocal.getTime() - now.getTime();
          if (delay > 0) {
            // Future: re-queue with existing time, don't recalculate
            await (taskScheduler as any).taskQueue.add(
              { taskId: task.id, executionId: '' },
              {
                delay,
                jobId: `task-${task.id}-${nextLocal.getTime()}`,
              }
            );
            console.log(`  - Re-queued task: ${task.name} (${task.id}) at ${rawNext}`);
            continue;
          }
          // Past: execute immediately (missed window)
          console.log(`  - Task ${task.name} missed window (${rawNext}), executing now`);
          await taskScheduler.executeTask(task.id);
          continue;
        }
        // No next_execution_at: use scheduleTask to calculate
        await taskScheduler.scheduleTask(task);
        console.log(`  - Rescheduled task: ${task.name} (${task.id})`);
      } catch (err) {
        console.warn(`  - Failed to reschedule task ${task.id}:`, err);
      }
    }
  } catch (error) {
    console.warn('Warning: Could not reschedule tasks on startup:', error);
  }
}

startServer();

export { app };
