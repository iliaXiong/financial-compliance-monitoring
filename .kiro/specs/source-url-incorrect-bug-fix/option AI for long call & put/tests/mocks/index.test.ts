/**
 * Tests for mock implementations index
 * Verifies that mocks are properly exported and factory functions work correctly
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createMockDataProvider,
  createMockLLMService,
  configureMockFailure,
  resetMockFailure
} from './index.js';
import { MockDataProvider } from '../../src/services/DataProvider.js';
import { MockLLMService } from '../../src/services/LLMService.js';
import { OptionType, MarketSentiment, TrendDirection } from '../../src/types/index.js';

describe('Mock Implementations Index', () => {
  describe('MockDataProvider Factory', () => {
    it('should create a MockDataProvider instance', () => {
      const provider = createMockDataProvider();
      expect(provider).toBeInstanceOf(MockDataProvider);
    });

    it('should create provider with default test data', async () => {
      const provider = createMockDataProvider();
      
      // Should have AAPL data
      const results = await provider.searchUnderlying('AAPL');
      expect(results).toHaveLength(1);
      expect(results[0].symbol).toBe('AAPL');
      expect(results[0].name).toContain('Apple');
    });

    it('should support multiple stock symbols', async () => {
      const provider = createMockDataProvider();
      
      // Test AAPL
      const aaplResults = await provider.searchUnderlying('AAPL');
      expect(aaplResults[0].symbol).toBe('AAPL');
      
      // Test TSLA
      const tslaResults = await provider.searchUnderlying('TSLA');
      expect(tslaResults[0].symbol).toBe('TSLA');
      
      // Test MSFT
      const msftResults = await provider.searchUnderlying('MSFT');
      expect(msftResults[0].symbol).toBe('MSFT');
    });

    it('should support Chinese name search', async () => {
      const provider = createMockDataProvider();
      
      const results = await provider.searchUnderlying('苹果');
      expect(results).toHaveLength(1);
      expect(results[0].symbol).toBe('AAPL');
    });
  });

  describe('MockLLMService Factory', () => {
    it('should create a MockLLMService instance', () => {
      const service = createMockLLMService();
      expect(service).toBeInstanceOf(MockLLMService);
    });

    it('should create available service by default', async () => {
      const service = createMockLLMService();
      
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

      const analysis = await service.analyzeSentiment(
        mockUnderlying,
        [],
        mockIndicators
      );

      expect(analysis).toBeDefined();
      expect(analysis.sentiment).toBeDefined();
      expect(analysis.confidence).toBeGreaterThanOrEqual(0);
      expect(analysis.confidence).toBeLessThanOrEqual(1);
    });

    it('should create unavailable service when specified', async () => {
      const service = createMockLLMService(false);
      
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
        trend: TrendDirection.UPTREND
      };

      await expect(
        service.analyzeSentiment(mockUnderlying, [], mockIndicators)
      ).rejects.toThrow();
    });
  });

  describe('Failure Simulation Utilities', () => {
    let provider: MockDataProvider;

    beforeEach(() => {
      provider = createMockDataProvider();
    });

    it('should configure failure simulation', async () => {
      configureMockFailure(provider, 1);
      
      // First call should fail and retry, eventually succeeding
      const price = await provider.getCurrentPrice('AAPL');
      expect(price).toBeDefined();
      expect(price.symbol).toBe('AAPL');
    });

    it('should reset failure simulation', async () => {
      configureMockFailure(provider, 1);
      resetMockFailure(provider);
      
      // Should succeed immediately without retries
      const price = await provider.getCurrentPrice('AAPL');
      expect(price).toBeDefined();
    });
  });

  describe('Mock Data Injection', () => {
    it('should allow adding custom underlying assets', async () => {
      const provider = createMockDataProvider();
      
      provider.addMockUnderlying({
        symbol: 'TEST',
        name: 'Test Company',
        nameCn: '测试公司',
        currentPrice: 100.00,
        priceTimestamp: new Date(),
        change: 1.50,
        changePercent: 1.52,
        supportsOptions: true
      });

      const results = await provider.searchUnderlying('TEST');
      expect(results).toHaveLength(1);
      expect(results[0].symbol).toBe('TEST');
      expect(results[0].name).toBe('Test Company');
    });

    it('should allow adding custom price data', async () => {
      const provider = createMockDataProvider();
      
      provider.addMockPrice('CUSTOM', {
        symbol: 'CUSTOM',
        price: 250.00,
        timestamp: new Date(),
        change: 5.00,
        changePercent: 2.04
      });

      // First add the underlying
      provider.addMockUnderlying({
        symbol: 'CUSTOM',
        name: 'Custom Corp',
        currentPrice: 250.00,
        priceTimestamp: new Date(),
        change: 5.00,
        changePercent: 2.04,
        supportsOptions: true
      });

      const price = await provider.getCurrentPrice('CUSTOM');
      expect(price.symbol).toBe('CUSTOM');
      expect(price.price).toBe(250.00);
    });

    it('should allow adding custom option chains', async () => {
      const provider = createMockDataProvider();
      
      const customContracts = [
        {
          contractSymbol: 'TEST240119C00100000',
          underlyingSymbol: 'TEST',
          type: OptionType.CALL,
          strike: 100,
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
        }
      ];

      provider.addMockOptionChain('TEST', OptionType.CALL, customContracts);
      
      // Add underlying to support options
      provider.addMockUnderlying({
        symbol: 'TEST',
        name: 'Test Company',
        currentPrice: 100.00,
        priceTimestamp: new Date(),
        change: 0,
        changePercent: 0,
        supportsOptions: true
      });

      const chain = await provider.getOptionChain('TEST', OptionType.CALL);
      expect(chain).toHaveLength(1);
      expect(chain[0].contractSymbol).toBe('TEST240119C00100000');
    });
  });

  describe('Type Exports', () => {
    it('should export MockDataProvider class', () => {
      expect(MockDataProvider).toBeDefined();
      const instance = new MockDataProvider();
      expect(instance).toBeInstanceOf(MockDataProvider);
    });

    it('should export MockLLMService class', () => {
      expect(MockLLMService).toBeDefined();
      const instance = new MockLLMService();
      expect(instance).toBeInstanceOf(MockLLMService);
    });
  });
});
