import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { config } from './config';
import { pool } from './config/database';
import apiRoutes from './routes';
import { errorHandler, notFoundHandler } from './middleware';
import { TaskScheduler } from './services/TaskScheduler.pgboss';

dotenv.config();

const app = express();

// Initialize TaskScheduler with PostgreSQL (no Redis needed!)
const taskScheduler = new TaskScheduler({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'financial_compliance',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// Middleware
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : ['http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    // Check if origin is allowed or matches Vercel preview pattern
    if (allowedOrigins.includes(origin) || origin.match(/^https:\/\/financial-compliance-monitoring.*\.vercel\.app$/)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
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
        queue: 'pg-boss',  // 使用 PostgreSQL 队列
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

// API routes
app.get('/', (req, res) => {
  res.json({
    message: 'Financial Compliance Monitoring API',
    version: '1.0.0',
    queue: 'pg-boss (PostgreSQL)',
  });
});

// Mount API routes
app.use('/api', apiRoutes);

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const PORT = config.server.port;

async function startServer() {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connected');

    // Start pg-boss task scheduler
    await taskScheduler.start();
    console.log('✅ Task scheduler started (pg-boss)');

    // Start Express server
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🚀 API: http://localhost:${PORT}/api`);
      console.log(`💾 Queue: PostgreSQL (pg-boss)`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down gracefully...');
      await taskScheduler.stop();
      await pool.end();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT received, shutting down gracefully...');
      await taskScheduler.stop();
      await pool.end();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Export for testing
export { app, taskScheduler };
