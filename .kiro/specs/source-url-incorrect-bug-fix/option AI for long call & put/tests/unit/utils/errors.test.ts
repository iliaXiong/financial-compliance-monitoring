// Unit tests for error handling utilities

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createValidationError,
  createDataError,
  createBusinessLogicError,
  createSystemError,
  createErrorResponse,
  withRetry,
  withGracefulDegradation,
  withRetryAndFallback,
  isValidationError,
  isDataError,
  isBusinessLogicError,
  isSystemError,
  normalizeError,
  isRetryableErrorResponse,
  hasFallbackAvailable
} from '../../../src/utils/errors.js';
import { DialogState } from '../../../src/types/dialog.js';

describe('Error Factory Functions', () => {
  
  describe('createValidationError', () => {
    it('should create validation error with required fields', () => {
      const error = createValidationError('underlying', '标的不存在');
      
      expect(error.type).toBe('VALIDATION_ERROR');
      expect(error.field).toBe('underlying');
      expect(error.message).toBe('标的不存在');
      expect(error.suggestions).toBeUndefined();
    });

    it('should create validation error with suggestions', () => {
      const error = createValidationError(
        'underlying',
        '标的不存在',
        ['AAPL', 'TSLA']
      );
      
      expect(error.suggestions).toEqual(['AAPL', 'TSLA']);
    });

    it('should handle empty suggestions array', () => {
      const error = createValidationError('field', 'message', []);
      expect(error.suggestions).toEqual([]);
    });
  });

  describe('createDataError', () => {
    it('should create data error with default values', () => {
      const error = createDataError('API', '数据获取失败');
      
      expect(error.type).toBe('DATA_ERROR');
      expect(error.source).toBe('API');
      expect(error.message).toBe('数据获取失败');
      expect(error.retryable).toBe(true);
      expect(error.fallbackAvailable).toBe(false);
    });

    it('should create data error with custom retryable and fallback flags', () => {
      const error = createDataError('Cache', '缓存失败', false, true);
      
      expect(error.retryable).toBe(false);
      expect(error.fallbackAvailable).toBe(true);
    });
  });

  describe('createBusinessLogicError', () => {
    it('should create business logic error with minimal fields', () => {
      const error = createBusinessLogicError('INVALID_STATE', '无效操作');
      
      expect(error.type).toBe('BUSINESS_LOGIC_ERROR');
      expect(error.code).toBe('INVALID_STATE');
      expect(error.message).toBe('无效操作');
      expect(error.currentState).toBeUndefined();
      expect(error.allowedActions).toBeUndefined();
    });

    it('should create business logic error with state and actions', () => {
      const error = createBusinessLogicError(
        'INVALID_TRANSITION',
        '请先选择标的',
        DialogState.AWAITING_UNDERLYING,
        ['输入标的', '查看帮助']
      );
      
      expect(error.currentState).toBe(DialogState.AWAITING_UNDERLYING);
      expect(error.allowedActions).toEqual(['输入标的', '查看帮助']);
    });
  });

  describe('createSystemError', () => {
    it('should create system error with timestamp', () => {
      const before = new Date();
      const error = createSystemError(
        'LLM_UNAVAILABLE',
        'LLM服务暂时不可用',
        'Connection timeout to LLM service'
      );
      const after = new Date();
      
      expect(error.type).toBe('SYSTEM_ERROR');
      expect(error.code).toBe('LLM_UNAVAILABLE');
      expect(error.message).toBe('LLM服务暂时不可用');
      expect(error.internalMessage).toBe('Connection timeout to LLM service');
      expect(error.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(error.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('createErrorResponse', () => {
    it('should wrap error in response with metadata', () => {
      const error = createValidationError('field', 'message');
      const response = createErrorResponse(error);
      
      expect(response.success).toBe(false);
      expect(response.error).toBe(error);
      expect(response.requestId).toMatch(/^req_\d+_[a-z0-9]+$/);
      expect(response.timestamp).toBeInstanceOf(Date);
    });

    it('should generate unique request IDs', () => {
      const error = createValidationError('field', 'message');
      const response1 = createErrorResponse(error);
      const response2 = createErrorResponse(error);
      
      expect(response1.requestId).not.toBe(response2.requestId);
    });
  });
});

describe('Retry Mechanism', () => {
  
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should succeed on first attempt', async () => {
    const operation = vi.fn().mockResolvedValue('success');
    
    const result = await withRetry(operation, 'TestSource');
    
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry on retryable errors', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('timeout'))
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValue('success');
    
    const promise = withRetry(operation, 'TestSource', {
      maxRetries: 3,
      retryDelay: 100,
      backoffMultiplier: 2
    });

    // Fast-forward through retries
    await vi.advanceTimersByTimeAsync(100); // First retry
    await vi.advanceTimersByTimeAsync(200); // Second retry
    
    const result = await promise;
    
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should not retry on non-retryable errors', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Invalid input'));
    
    await expect(withRetry(operation, 'TestSource')).rejects.toThrow();
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should throw data error after max retries exhausted', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('timeout'));
    
    const promise = withRetry(operation, 'TestSource', {
      maxRetries: 2,
      retryDelay: 100,
      backoffMultiplier: 2
    }).catch(error => error); // Catch to prevent unhandled rejection

    // Fast-forward through all retries
    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(200);
    
    const error = await promise;
    
    expect(error.type).toBe('DATA_ERROR');
    expect(error.source).toBe('TestSource');
    expect(error.retryable).toBe(false);
    expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it('should use exponential backoff', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('timeout'))
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValue('success');
    
    const promise = withRetry(operation, 'TestSource', {
      maxRetries: 2,
      retryDelay: 100,
      backoffMultiplier: 2
    });

    // First retry after 100ms
    await vi.advanceTimersByTimeAsync(100);
    expect(operation).toHaveBeenCalledTimes(2);
    
    // Second retry after 200ms (100 * 2)
    await vi.advanceTimersByTimeAsync(200);
    expect(operation).toHaveBeenCalledTimes(3);
    
    await promise;
  });

  it('should recognize rate limit errors as retryable', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('429 Too Many Requests'))
      .mockResolvedValue('success');
    
    const promise = withRetry(operation, 'API');
    await vi.advanceTimersByTimeAsync(1000);
    
    const result = await promise;
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should recognize 503 errors as retryable', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('503 Service Unavailable'))
      .mockResolvedValue('success');
    
    const promise = withRetry(operation, 'API');
    await vi.advanceTimersByTimeAsync(1000);
    
    const result = await promise;
    expect(result).toBe('success');
  });
});

describe('Graceful Degradation', () => {
  
  it('should return operation result on success', async () => {
    const operation = vi.fn().mockResolvedValue('success');
    
    const result = await withGracefulDegradation(operation, {
      fallbackValue: 'fallback'
    });
    
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should use fallback value on failure', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Failed'));
    
    const result = await withGracefulDegradation(operation, {
      fallbackValue: 'fallback'
    });
    
    expect(result).toBe('fallback');
  });

  it('should use fallback function on failure', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Failed'));
    const fallbackFn = vi.fn().mockReturnValue('computed fallback');
    
    const result = await withGracefulDegradation(operation, {
      fallbackFn
    });
    
    expect(result).toBe('computed fallback');
    expect(fallbackFn).toHaveBeenCalledTimes(1);
  });

  it('should prefer fallback function over fallback value', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Failed'));
    const fallbackFn = vi.fn().mockReturnValue('from function');
    
    const result = await withGracefulDegradation(operation, {
      fallbackValue: 'from value',
      fallbackFn
    });
    
    expect(result).toBe('from function');
  });

  it('should throw if no fallback provided', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Failed'));
    
    await expect(withGracefulDegradation(operation, {})).rejects.toThrow('Failed');
  });

  it('should log error when logError is true', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const operation = vi.fn().mockRejectedValue(new Error('Failed'));
    
    await withGracefulDegradation(operation, {
      fallbackValue: 'fallback',
      logError: true
    });
    
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});

describe('Combined Retry and Fallback', () => {
  
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should succeed without using fallback', async () => {
    const operation = vi.fn().mockResolvedValue('success');
    
    const result = await withRetryAndFallback(
      operation,
      'TestSource',
      { maxRetries: 2 },
      { fallbackValue: 'fallback' }
    );
    
    expect(result).toBe('success');
  });

  it('should use fallback after retries exhausted', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('timeout'));
    
    const promise = withRetryAndFallback(
      operation,
      'TestSource',
      { maxRetries: 1, retryDelay: 100 },
      { fallbackValue: 'fallback' }
    );

    await vi.advanceTimersByTimeAsync(100);
    const result = await promise;
    
    expect(result).toBe('fallback');
    expect(operation).toHaveBeenCalledTimes(2); // Initial + 1 retry
  });
});

describe('Error Type Guards', () => {
  
  it('should identify validation errors', () => {
    const error = createValidationError('field', 'message');
    expect(isValidationError(error)).toBe(true);
    expect(isDataError(error)).toBe(false);
    expect(isBusinessLogicError(error)).toBe(false);
    expect(isSystemError(error)).toBe(false);
  });

  it('should identify data errors', () => {
    const error = createDataError('source', 'message');
    expect(isDataError(error)).toBe(true);
    expect(isValidationError(error)).toBe(false);
  });

  it('should identify business logic errors', () => {
    const error = createBusinessLogicError('code', 'message');
    expect(isBusinessLogicError(error)).toBe(true);
    expect(isValidationError(error)).toBe(false);
  });

  it('should identify system errors', () => {
    const error = createSystemError('code', 'message', 'internal');
    expect(isSystemError(error)).toBe(true);
    expect(isValidationError(error)).toBe(false);
  });
});

describe('Error Handling Helpers', () => {
  
  describe('normalizeError', () => {
    it('should convert Error to SystemError', () => {
      const error = new Error('Something went wrong');
      const normalized = normalizeError(error, 'TestContext');
      
      expect(normalized.type).toBe('SYSTEM_ERROR');
      expect(normalized.message).toBe('系统发生未知错误，请稍后重试');
      expect((normalized as any).internalMessage).toContain('TestContext');
      expect((normalized as any).internalMessage).toContain('Something went wrong');
    });

    it('should convert non-Error to SystemError', () => {
      const normalized = normalizeError('string error', 'TestContext');
      
      expect(normalized.type).toBe('SYSTEM_ERROR');
      expect((normalized as any).internalMessage).toContain('string error');
    });

    it('should handle null and undefined', () => {
      const normalized1 = normalizeError(null, 'TestContext');
      const normalized2 = normalizeError(undefined, 'TestContext');
      
      expect(normalized1.type).toBe('SYSTEM_ERROR');
      expect(normalized2.type).toBe('SYSTEM_ERROR');
    });
  });

  describe('isRetryableErrorResponse', () => {
    it('should return true for retryable data errors', () => {
      const error = createDataError('API', 'Failed', true);
      const response = createErrorResponse(error);
      
      expect(isRetryableErrorResponse(response)).toBe(true);
    });

    it('should return false for non-retryable data errors', () => {
      const error = createDataError('API', 'Failed', false);
      const response = createErrorResponse(error);
      
      expect(isRetryableErrorResponse(response)).toBe(false);
    });

    it('should return false for non-data errors', () => {
      const error = createValidationError('field', 'message');
      const response = createErrorResponse(error);
      
      expect(isRetryableErrorResponse(response)).toBe(false);
    });
  });

  describe('hasFallbackAvailable', () => {
    it('should return true when fallback available', () => {
      const error = createDataError('API', 'Failed', true, true);
      const response = createErrorResponse(error);
      
      expect(hasFallbackAvailable(response)).toBe(true);
    });

    it('should return false when no fallback', () => {
      const error = createDataError('API', 'Failed', true, false);
      const response = createErrorResponse(error);
      
      expect(hasFallbackAvailable(response)).toBe(false);
    });

    it('should return false for non-data errors', () => {
      const error = createSystemError('code', 'message', 'internal');
      const response = createErrorResponse(error);
      
      expect(hasFallbackAvailable(response)).toBe(false);
    });
  });
});

describe('Edge Cases', () => {
  
  it('should handle empty strings in error messages', () => {
    const error = createValidationError('', '');
    expect(error.field).toBe('');
    expect(error.message).toBe('');
  });

  it('should handle very long error messages', () => {
    const longMessage = 'A'.repeat(10000);
    const error = createDataError('source', longMessage);
    expect(error.message).toBe(longMessage);
  });

  it('should handle special characters in error messages', () => {
    const message = '错误: <script>alert("xss")</script>';
    const error = createValidationError('field', message);
    expect(error.message).toBe(message);
  });

  it('should handle concurrent retry operations', async () => {
    vi.useFakeTimers();
    
    const operation1 = vi.fn()
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValue('result1');
    
    const operation2 = vi.fn()
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValue('result2');
    
    const promise1 = withRetry(operation1, 'Source1');
    const promise2 = withRetry(operation2, 'Source2');
    
    await vi.advanceTimersByTimeAsync(1000);
    
    const [result1, result2] = await Promise.all([promise1, promise2]);
    
    expect(result1).toBe('result1');
    expect(result2).toBe('result2');
    
    vi.restoreAllMocks();
  });
});
