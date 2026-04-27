// Error handling utilities

import {
  ValidationError,
  DataError,
  BusinessLogicError,
  SystemError,
  ErrorResponse,
  AppError
} from '../types/error.js';
import { DialogState } from '../types/dialog.js';
import { generateRequestId } from './index.js';

// ============================================================================
// Error Factory Functions
// ============================================================================

/**
 * Creates a validation error for invalid user input
 */
export function createValidationError(
  field: string,
  message: string,
  suggestions?: string[]
): ValidationError {
  return {
    type: "VALIDATION_ERROR",
    field,
    message,
    suggestions
  };
}

/**
 * Creates a data error for external data source failures
 */
export function createDataError(
  source: string,
  message: string,
  retryable: boolean = true,
  fallbackAvailable: boolean = false
): DataError {
  return {
    type: "DATA_ERROR",
    source,
    message,
    retryable,
    fallbackAvailable
  };
}

/**
 * Creates a business logic error for invalid operations or state transitions
 */
export function createBusinessLogicError(
  code: string,
  message: string,
  currentState?: DialogState,
  allowedActions?: string[]
): BusinessLogicError {
  return {
    type: "BUSINESS_LOGIC_ERROR",
    code,
    message,
    currentState,
    allowedActions
  };
}

/**
 * Creates a system error for internal failures
 */
export function createSystemError(
  code: string,
  message: string,
  internalMessage: string
): SystemError {
  return {
    type: "SYSTEM_ERROR",
    code,
    message,
    internalMessage,
    timestamp: new Date()
  };
}

/**
 * Wraps an error in a standardized error response
 */
export function createErrorResponse(error: AppError): ErrorResponse {
  return {
    success: false,
    error,
    requestId: generateRequestId(),
    timestamp: new Date()
  };
}

// ============================================================================
// Retry Mechanism for Data Errors
// ============================================================================

export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
  retryableErrors?: string[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  backoffMultiplier: 2
};

/**
 * Executes an async operation with retry logic for transient failures
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  source: string,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | null = null;
  let delay = finalConfig.retryDelay;

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on last attempt
      if (attempt === finalConfig.maxRetries) {
        break;
      }

      // Check if error is retryable
      if (!isRetryableError(error, finalConfig.retryableErrors)) {
        break;
      }

      // Wait before retrying with exponential backoff
      await sleep(delay);
      delay *= finalConfig.backoffMultiplier;
    }
  }

  // All retries exhausted, throw data error
  throw createDataError(
    source,
    `操作失败，已重试 ${finalConfig.maxRetries} 次: ${lastError?.message}`,
    false,
    false
  );
}

/**
 * Determines if an error is retryable based on error type
 */
function isRetryableError(error: unknown, retryableErrors?: string[]): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  // Default retryable error patterns
  const defaultRetryablePatterns = [
    'timeout',
    'network',
    'econnrefused',
    'enotfound',
    'rate limit',
    'too many requests',
    '503',
    '504',
    '429'
  ];

  const patterns = retryableErrors || defaultRetryablePatterns;

  return patterns.some(pattern => message.includes(pattern.toLowerCase()));
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// Graceful Degradation for System Errors
// ============================================================================

export interface FallbackConfig<T> {
  fallbackValue?: T;
  fallbackFn?: () => T | Promise<T>;
  logError?: boolean;
}

/**
 * Executes an operation with graceful degradation on failure
 */
export async function withGracefulDegradation<T>(
  operation: () => Promise<T>,
  config: FallbackConfig<T>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (config.logError) {
      console.error('Operation failed, using fallback:', error);
    }

    // Use fallback function if provided
    if (config.fallbackFn) {
      return await config.fallbackFn();
    }

    // Use fallback value if provided
    if (config.fallbackValue !== undefined) {
      return config.fallbackValue;
    }

    // No fallback available, rethrow
    throw error;
  }
}

/**
 * Wraps an operation with both retry and graceful degradation
 */
export async function withRetryAndFallback<T>(
  operation: () => Promise<T>,
  source: string,
  retryConfig: Partial<RetryConfig> = {},
  fallbackConfig: FallbackConfig<T>
): Promise<T> {
  try {
    return await withRetry(operation, source, retryConfig);
  } catch (error) {
    // Retry exhausted, try graceful degradation
    return await withGracefulDegradation(
      async () => { throw error; },
      fallbackConfig
    );
  }
}

// ============================================================================
// Error Type Guards
// ============================================================================

export function isValidationError(error: AppError): error is ValidationError {
  return error.type === "VALIDATION_ERROR";
}

export function isDataError(error: AppError): error is DataError {
  return error.type === "DATA_ERROR";
}

export function isBusinessLogicError(error: AppError): error is BusinessLogicError {
  return error.type === "BUSINESS_LOGIC_ERROR";
}

export function isSystemError(error: AppError): error is SystemError {
  return error.type === "SYSTEM_ERROR";
}

// ============================================================================
// Error Handling Helpers
// ============================================================================

/**
 * Converts unknown errors to AppError
 */
export function normalizeError(error: unknown, context: string): AppError {
  if (error instanceof Error) {
    return createSystemError(
      'UNKNOWN_ERROR',
      '系统发生未知错误，请稍后重试',
      `${context}: ${error.message}`
    );
  }

  return createSystemError(
    'UNKNOWN_ERROR',
    '系统发生未知错误，请稍后重试',
    `${context}: ${String(error)}`
  );
}

/**
 * Checks if an error response indicates a retryable failure
 */
export function isRetryableErrorResponse(response: ErrorResponse): boolean {
  if (isDataError(response.error)) {
    return response.error.retryable;
  }
  return false;
}

/**
 * Checks if an error response has a fallback available
 */
export function hasFallbackAvailable(response: ErrorResponse): boolean {
  if (isDataError(response.error)) {
    return response.error.fallbackAvailable;
  }
  return false;
}
