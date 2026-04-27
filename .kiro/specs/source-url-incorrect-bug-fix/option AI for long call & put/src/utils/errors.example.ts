// Example usage of error handling utilities
// This file demonstrates how to use the error utilities in the application

import {
  createValidationError,
  createDataError,
  createBusinessLogicError,
  createSystemError,
  createErrorResponse,
  withRetry,
  withGracefulDegradation,
  withRetryAndFallback,
  normalizeError
} from './errors.js';
import { DialogState } from '../types/dialog.js';

// ============================================================================
// Example 1: Validation Error
// ============================================================================

function validateUnderlyingInput(input: string) {
  if (!input || input.trim() === '') {
    return createErrorResponse(
      createValidationError(
        'underlying',
        '请输入标的代码或名称',
        ['AAPL', 'TSLA', 'MSFT']
      )
    );
  }
  
  // Validation passed
  return { success: true, data: input.trim() };
}

// ============================================================================
// Example 2: Data Error with Retry
// ============================================================================

async function fetchMarketDataWithRetry(symbol: string) {
  try {
    return await withRetry(
      async () => {
        // Simulated API call
        const response = await fetch(`https://api.example.com/quote/${symbol}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
      },
      'MarketDataAPI',
      {
        maxRetries: 3,
        retryDelay: 1000,
        backoffMultiplier: 2
      }
    );
  } catch (error) {
    // Error is already a DataError from withRetry
    return createErrorResponse(error as any);
  }
}

// ============================================================================
// Example 3: Graceful Degradation with Fallback
// ============================================================================

async function getMarketSentimentWithFallback(symbol: string) {
  return await withGracefulDegradation(
    async () => {
      // Try to get LLM-based analysis
      const llmAnalysis = await callLLMService(symbol);
      return llmAnalysis;
    },
    {
      // Fallback to rule-based analysis if LLM fails
      fallbackFn: () => {
        console.log('LLM unavailable, using rule-based analysis');
        return {
          sentiment: 'NEUTRAL',
          confidence: 0.5,
          reasoning: '基于规则的简化分析（LLM服务暂时不可用）'
        };
      },
      logError: true
    }
  );
}

async function callLLMService(symbol: string): Promise<any> {
  // Simulated LLM call
  throw new Error('LLM service unavailable');
}

// ============================================================================
// Example 4: Combined Retry and Fallback
// ============================================================================

async function getOptionChainRobust(symbol: string) {
  try {
    return await withRetryAndFallback(
      async () => {
        // Try primary data source
        const response = await fetch(`https://api.primary.com/options/${symbol}`);
        if (!response.ok) throw new Error('Primary source failed');
        return await response.json();
      },
      'PrimaryDataSource',
      { maxRetries: 2, retryDelay: 500 },
      {
        // Fallback to secondary data source
        fallbackFn: async () => {
          console.log('Using fallback data source');
          const response = await fetch(`https://api.fallback.com/options/${symbol}`);
          return await response.json();
        },
        logError: true
      }
    );
  } catch (error) {
    return createErrorResponse(
      createDataError(
        'OptionChainAPI',
        '无法获取期权链数据，请稍后重试',
        false,
        false
      )
    );
  }
}

// ============================================================================
// Example 5: Business Logic Error
// ============================================================================

function selectContract(sessionState: any, contractId: string) {
  // Check if in correct state
  if (sessionState.currentState !== DialogState.PRESENTING_CONTRACTS) {
    return createErrorResponse(
      createBusinessLogicError(
        'INVALID_STATE',
        '请先完成标的分析和期权筛选',
        sessionState.currentState,
        ['输入标的', '查看帮助']
      )
    );
  }
  
  // Business logic continues...
  return { success: true, data: { contractId } };
}

// ============================================================================
// Example 6: System Error with Error Normalization
// ============================================================================

async function performComplexOperation() {
  try {
    // Some operation that might throw unknown errors
    throw new Error('Unexpected database error');
  } catch (error) {
    // Normalize unknown errors to SystemError
    const normalizedError = normalizeError(error, 'performComplexOperation');
    return createErrorResponse(normalizedError);
  }
}

// ============================================================================
// Example 7: Handling Different Error Types
// ============================================================================

async function handleUserRequest(request: any) {
  const result = await validateUnderlyingInput(request.underlying);
  
  if (!result.success) {
    const errorResponse = result as any;
    
    // Different handling based on error type
    switch (errorResponse.error.type) {
      case 'VALIDATION_ERROR':
        console.log('User input error:', errorResponse.error.message);
        if (errorResponse.error.suggestions) {
          console.log('Suggestions:', errorResponse.error.suggestions);
        }
        break;
        
      case 'DATA_ERROR':
        console.log('Data source error:', errorResponse.error.message);
        if (errorResponse.error.retryable) {
          console.log('This error is retryable');
        }
        break;
        
      case 'BUSINESS_LOGIC_ERROR':
        console.log('Business logic error:', errorResponse.error.message);
        console.log('Current state:', errorResponse.error.currentState);
        break;
        
      case 'SYSTEM_ERROR':
        console.error('System error:', errorResponse.error.internalMessage);
        console.log('User message:', errorResponse.error.message);
        break;
    }
  }
  
  return result;
}
