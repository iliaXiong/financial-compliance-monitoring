import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config';

// Type assertion helper for JWT expiresIn
type JWTExpiresIn = string | number;


/**
 * Extended Request interface with user information
 */
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

/**
 * JWT Authentication Middleware
 * Validates JWT token from Authorization header
 * 
 * Requirements: All API endpoints require authentication
 * 
 * NOTE: For demo purposes, authentication is disabled when DEMO_MODE=true
 */
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Demo mode: skip authentication
  if (process.env.DEMO_MODE === 'true') {
    (req as AuthRequest).user = {
      userId: '00000000-0000-0000-0000-000000000000', // Valid UUID for demo
      email: 'demo@example.com',
    };
    next();
    return;
  }

  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: '未提供认证令牌',
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const jwtSecret = config.jwt.secret;
    const decoded = jwt.verify(token, jwtSecret) as {
      userId: string;
      email: string;
    };

    // Attach user info to request
    (req as AuthRequest).user = {
      userId: decoded.userId,
      email: decoded.email,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: '无效的认证令牌',
      });
      return;
    }

    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: '认证令牌已过期',
      });
      return;
    }

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: '认证过程发生错误',
    });
  }
};

/**
 * Generate JWT token for user
 * 
 * @param userId - User ID
 * @param email - User email
 * @returns JWT token
 */
export const generateToken = (userId: string, email: string): string => {
  return jwt.sign(
    { userId, email },
    config.jwt.secret,
    { expiresIn: '7d' }
  );
};
