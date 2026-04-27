import { Request, Response, NextFunction } from 'express';

/**
 * Custom error class with status code
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Global error handling middleware
 * Catches all errors and returns appropriate HTTP responses
 * 
 * Requirements: Unified error handling for all API endpoints
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('[Error Handler]', {
    name: err.name,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Handle AppError (custom errors)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
      ...(err.details && { details: err.details }),
    });
    return;
  }

  // Handle validation errors
  if (err.name === 'ValidationError' || (err as any).code === 'VALIDATION_ERROR') {
    res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: err.message,
      ...((err as any).details && { details: (err as any).details }),
    });
    return;
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: '认证失败',
    });
    return;
  }

  // Handle database errors
  if ((err as any).code?.startsWith('23')) {
    // PostgreSQL constraint violation
    res.status(400).json({
      error: 'DATABASE_ERROR',
      message: '数据库约束违反',
    });
    return;
  }

  // Default to 500 Internal Server Error
  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: '服务器内部错误',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: `路径 ${req.path} 不存在`,
  });
};

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
