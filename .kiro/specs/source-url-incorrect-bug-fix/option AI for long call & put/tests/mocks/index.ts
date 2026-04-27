/**
 * Mock Implementations for Testing
 * 
 * This module provides convenient access to mock implementations of core services
 * for use in unit tests, integration tests, and property-based tests.
 * 
 * All mocks are fully functional implementations with configurable behavior
 * for testing various scenarios including success cases, error conditions,
 * and edge cases.
 */

// Import the mock classes
import { 
  MockDataProvider as DataProviderMock,
  DataProvider,
  RetryConfig,
  DEFAULT_RETRY_CONFIG
} from '../../src/services/DataProvider.js';

import {
  MockLLMService as LLMServiceMock,
  LLMService,
  SentimentAnalysis,
  ContractAnalysis,
  UserIntent
} from '../../src/services/LLMService.js';

// Re-export types and classes
export type { DataProvider, RetryConfig, LLMService, SentimentAnalysis, ContractAnalysis };
export { DEFAULT_RETRY_CONFIG, UserIntent };
export { MockDataProvider, MockLLMService };

// Create type aliases for convenience
export type MockDataProvider = DataProviderMock;
export type MockLLMService = LLMServiceMock;

// Re-export the classes with their original names
const MockDataProvider = DataProviderMock;
const MockLLMService = LLMServiceMock;

/**
 * Factory function to create a pre-configured MockDataProvider
 * with default test data (AAPL, TSLA, MSFT)
 * 
 * @returns A new MockDataProvider instance with default mock data
 * 
 * @example
 * ```typescript
 * const dataProvider = createMockDataProvider();
 * const results = await dataProvider.searchUnderlying('AAPL');
 * ```
 */
export function createMockDataProvider(): DataProviderMock {
  return new DataProviderMock();
}

/**
 * Factory function to create a pre-configured MockLLMService
 * 
 * @param available - Whether the service should be available (default: true)
 * @returns A new MockLLMService instance
 * 
 * @example
 * ```typescript
 * // Create available service
 * const llmService = createMockLLMService();
 * 
 * // Create unavailable service for error testing
 * const unavailableService = createMockLLMService(false);
 * ```
 */
export function createMockLLMService(available: boolean = true): LLMServiceMock {
  const service = new LLMServiceMock();
  service.setAvailability(available);
  return service;
}

/**
 * Utility function to configure MockDataProvider for failure simulation
 * 
 * @param provider - The MockDataProvider instance to configure
 * @param maxFailures - Number of times operations should fail before succeeding
 * 
 * @example
 * ```typescript
 * const provider = createMockDataProvider();
 * configureMockFailure(provider, 2); // Fail twice, then succeed
 * ```
 */
export function configureMockFailure(
  provider: DataProviderMock,
  maxFailures: number
): void {
  provider.simulateFailure(maxFailures);
}

/**
 * Utility function to reset failure simulation on MockDataProvider
 * 
 * @param provider - The MockDataProvider instance to reset
 * 
 * @example
 * ```typescript
 * const provider = createMockDataProvider();
 * provider.simulateFailure(2);
 * // ... run tests ...
 * resetMockFailure(provider); // Reset to normal operation
 * ```
 */
export function resetMockFailure(provider: DataProviderMock): void {
  provider.resetFailureSimulation();
}
