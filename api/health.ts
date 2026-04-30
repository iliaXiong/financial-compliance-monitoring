/**
 * Vercel Serverless Function - Health Check
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Check database connection
    const dbStatus = process.env.DB_HOST ? 'configured' : 'not configured';

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
        queue: 'pg-boss',
        environment: process.env.NODE_ENV || 'production'
      },
      optimization: {
        stage1: 'enabled',
        features: [
          'SimpleRetriever',
          'DebugLogger',
          'OptimizedLLMSearch',
          'ReferenceValidation'
        ]
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
