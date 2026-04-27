/**
 * Example test demonstrating how to use mocks from tests/mocks/
 * This file serves as documentation and can be used as a template
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  createMockDataProvider, 
  createMockLLMService,
  configureMockFailure,
  resetMockFailure
} from './index.js';
import { OptionType, MarketSentiment, TrendDirection } from '../../src/types/index.js';

describe('Mock Usage Examples', () => {
  describe('Using MockDataProvider', () => {
    it('example: basic usage with default data', async () => {
      // Create a mock data provider with pre-configured test data
      const dataProvider = createMockDataProvider();
      
      // Search for AAPL
      const results = await dataProvider.searchUnderlying('AAPL');
      
      expect(results).toHaveLength(1);
      expect(results[0].symbol).toBe('AAPL');
      expect(results[0].supportsOptions).toBe(true);
    });

    it('example: injecting custom test data', async () => {
      const dataProvider = createMockDataProvider();
      
      // Add a custom underlying for testing
      dataProvider.addMockUnderlying({
        symbol: 'MYTEST',
        name: 'My Test Company',
        nameCn: '我的测试公司',
        currentPrice: 150.00,
        priceTimestamp: new Date(),
        change: 5.00,
        changePercent: 3.45,
        supportsOptions: true
      });
      
      // Now we can test with our custom data
      const results = await dataProvider.searchUnderlying('MYTEST');
      expect(results[0].symbol).toBe('MYTEST');
    });

    it('example: testing error handling with failure simulation', async () => {
      const dataProvider = createMockDataProvider();
      
      // Configure to fail once, then succeed (tests retry logic)
      configureMockFailure(dataProvider, 1);
      
      // This will fail once internally, retry, and succeed
      const price = await dataProvider.getCurrentPrice('AAPL');
      expect(price).toBeDefined();
      
      // Reset for next test
      resetMockFailure(dataProvider);
    });
  });

  describe('Using MockLLMService', () => {
    it('example: analyzing market sentiment', async () => {
      const llmService = createMockLLMService();
      
      const mockUnderlying = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        nameCn: '苹果公司',
        currentPrice: 175.50,
        priceTimestamp: new Date(),
        change: 2.50,
        changePercent: 1.44,
        supportsOptions: true
      };

      const mockIndicators = {
        volatility: 0.25,
        trend: TrendDirection.UPTREND,
        supportLevel: 170,
        resistanceLevel: 180
      };

      const analysis = await llmService.analyzeSentiment(
        mockUnderlying,
        [],
        mockIndicators
      );

      expect(analysis.sentiment).toBe(MarketSentiment.BULLISH);
      expect(analysis.confidence).toBeGreaterThan(0);
      expect(analysis.reasoning).toBeDefined();
      expect(analysis.suggestedStrategy).toBeDefined();
    });

    it('example: testing service unavailability', async () => {
      // Create an unavailable service for error testing
      const llmService = createMockLLMService(false);
      
      const mockUnderlying = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        currentPrice: 175.50,
        priceTimestamp: new Date(),
        change: 2.50,
        changePercent: 1.44,
        supportsOptions: true
      };

      const mockIndicators = {
        volatility: 0.25,
        trend: TrendDirection.UPTREND
      };

      // Should throw an error
      await expect(
        llmService.analyzeSentiment(mockUnderlying, [], mockIndicators)
      ).rejects.toThrow();
    });

    it('example: analyzing option contracts', async () => {
      const llmService = createMockLLMService();
      
      const mockContract = {
        contractSymbol: 'AAPL240119C00175000',
        underlyingSymbol: 'AAPL',
        type: OptionType.CALL,
        strike: 175,
        expiration: new Date('2024-01-19'),
        daysToExpiry: 30,
        premium: 5.50,
        bid: 5.45,
        ask: 5.55,
        delta: 0.52,
        gamma: 0.015,
        theta: -0.08,
        vega: 0.15,
        impliedVolatility: 0.25,
        volume: 1000,
        openInterest: 5000,
        lastUpdate: new Date()
      };

      const mockUnderlying = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        currentPrice: 175.50,
        priceTimestamp: new Date(),
        change: 2.50,
        changePercent: 1.44,
        supportsOptions: true
      };

      const analysis = await llmService.analyzeOptionContract(
        mockContract,
        mockUnderlying,
        MarketSentiment.BULLISH
      );

      expect(analysis.score).toBeGreaterThanOrEqual(0);
      expect(analysis.score).toBeLessThanOrEqual(100);
      expect(analysis.riskLevel).toBeDefined();
      expect(analysis.reasoning).toBeDefined();
      expect(analysis.keyPoints).toBeInstanceOf(Array);
    });
  });

  describe('Combined Usage', () => {
    it('example: using both mocks together', async () => {
      const dataProvider = createMockDataProvider();
      const llmService = createMockLLMService();
      
      // Get underlying data
      const results = await dataProvider.searchUnderlying('AAPL');
      const underlying = results[0];
      
      // Get option chain
      const contracts = await dataProvider.getOptionChain('AAPL', OptionType.CALL);
      
      // Analyze a contract
      const analysis = await llmService.analyzeOptionContract(
        contracts[0],
        underlying,
        MarketSentiment.BULLISH
      );
      
      expect(analysis).toBeDefined();
      expect(analysis.score).toBeGreaterThan(0);
    });
  });

  describe('Test Setup Patterns', () => {
    let dataProvider: ReturnType<typeof createMockDataProvider>;
    let llmService: ReturnType<typeof createMockLLMService>;

    beforeEach(() => {
      // Create fresh instances for each test
      dataProvider = createMockDataProvider();
      llmService = createMockLLMService();
    });

    it('example: using beforeEach for clean state', async () => {
      // Each test gets fresh mock instances
      const results = await dataProvider.searchUnderlying('AAPL');
      expect(results).toHaveLength(1);
    });

    it('example: another test with clean state', async () => {
      // This test also gets fresh instances
      const price = await dataProvider.getCurrentPrice('TSLA');
      expect(price.symbol).toBe('TSLA');
    });
  });
});
