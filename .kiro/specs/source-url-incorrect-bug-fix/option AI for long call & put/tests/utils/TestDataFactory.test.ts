// Unit tests for TestDataFactory

import { describe, it, expect } from 'vitest';
import {
  createValidUnderlying,
  createValidContract,
  createValidPriceData,
  createValidMarketAnalysis
} from './TestDataFactory.js';
import {
  MarketSentiment,
  TrendDirection,
  StrategyType,
  OptionType
} from '../../src/types/index.js';

describe('TestDataFactory', () => {
  describe('createValidUnderlying', () => {
    it('should create valid underlying with default values', () => {
      const underlying = createValidUnderlying();

      expect(underlying.symbol).toBe('AAPL');
      expect(underlying.name).toBe('Apple Inc.');
      expect(underlying.nameCn).toBe('苹果公司');
      expect(underlying.currentPrice).toBe(175.50);
      expect(underlying.priceTimestamp).toBeInstanceOf(Date);
      expect(underlying.change).toBe(2.50);
      expect(underlying.changePercent).toBe(1.45);
      expect(underlying.supportsOptions).toBe(true);
    });

    it('should allow overriding specific fields', () => {
      const underlying = createValidUnderlying({
        symbol: 'TSLA',
        name: 'Tesla Inc.',
        currentPrice: 250.0
      });

      expect(underlying.symbol).toBe('TSLA');
      expect(underlying.name).toBe('Tesla Inc.');
      expect(underlying.currentPrice).toBe(250.0);
      expect(underlying.nameCn).toBe('苹果公司'); // Other fields remain default
    });

    it('should create different instances', () => {
      const underlying1 = createValidUnderlying();
      const underlying2 = createValidUnderlying();

      expect(underlying1).not.toBe(underlying2);
    });
  });

  describe('createValidContract', () => {
    it('should create valid contract with default values', () => {
      const contract = createValidContract();

      expect(contract.contractSymbol).toBe('AAPL240119C00175000');
      expect(contract.underlyingSymbol).toBe('AAPL');
      expect(contract.type).toBe(OptionType.CALL);
      expect(contract.strike).toBe(175.0);
      expect(contract.expiration).toBeInstanceOf(Date);
      expect(contract.daysToExpiry).toBe(30);
      expect(contract.premium).toBe(8.50);
      expect(contract.bid).toBe(8.40);
      expect(contract.ask).toBe(8.60);
      expect(contract.delta).toBe(0.55);
      expect(contract.gamma).toBe(0.025);
      expect(contract.theta).toBe(-0.05);
      expect(contract.vega).toBe(0.15);
      expect(contract.impliedVolatility).toBe(0.28);
      expect(contract.volume).toBe(1500);
      expect(contract.openInterest).toBe(5000);
      expect(contract.lastUpdate).toBeInstanceOf(Date);
    });

    it('should allow overriding specific fields', () => {
      const contract = createValidContract({
        type: OptionType.PUT,
        strike: 180.0,
        delta: -0.45
      });

      expect(contract.type).toBe(OptionType.PUT);
      expect(contract.strike).toBe(180.0);
      expect(contract.delta).toBe(-0.45);
      expect(contract.underlyingSymbol).toBe('AAPL'); // Other fields remain default
    });

    it('should create contracts with future expiration dates', () => {
      const contract = createValidContract();
      const now = new Date();

      expect(contract.expiration.getTime()).toBeGreaterThan(now.getTime());
    });
  });

  describe('createValidPriceData', () => {
    it('should create valid price data with default values', () => {
      const priceData = createValidPriceData();

      expect(priceData.symbol).toBe('AAPL');
      expect(priceData.price).toBe(175.50);
      expect(priceData.timestamp).toBeInstanceOf(Date);
      expect(priceData.change).toBe(2.50);
      expect(priceData.changePercent).toBe(1.45);
    });

    it('should allow overriding specific fields', () => {
      const priceData = createValidPriceData({
        symbol: 'TSLA',
        price: 250.0,
        change: -5.0,
        changePercent: -2.0
      });

      expect(priceData.symbol).toBe('TSLA');
      expect(priceData.price).toBe(250.0);
      expect(priceData.change).toBe(-5.0);
      expect(priceData.changePercent).toBe(-2.0);
    });
  });

  describe('createValidMarketAnalysis', () => {
    it('should create valid market analysis with default values', () => {
      const analysis = createValidMarketAnalysis();

      expect(analysis.sentiment).toBe(MarketSentiment.BULLISH);
      expect(analysis.volatility).toBe(0.25);
      expect(analysis.trend).toBe(TrendDirection.UPTREND);
      expect(analysis.supportLevel).toBe(170.0);
      expect(analysis.resistanceLevel).toBe(180.0);
      expect(analysis.analysis).toContain('市场');
      expect(analysis.suggestedStrategy).toBe(StrategyType.LONG_CALL);
    });

    it('should allow overriding specific fields', () => {
      const analysis = createValidMarketAnalysis({
        sentiment: MarketSentiment.BEARISH,
        trend: TrendDirection.DOWNTREND,
        suggestedStrategy: StrategyType.LONG_PUT
      });

      expect(analysis.sentiment).toBe(MarketSentiment.BEARISH);
      expect(analysis.trend).toBe(TrendDirection.DOWNTREND);
      expect(analysis.suggestedStrategy).toBe(StrategyType.LONG_PUT);
      expect(analysis.volatility).toBe(0.25); // Other fields remain default
    });

    it('should have support level less than resistance level', () => {
      const analysis = createValidMarketAnalysis();

      expect(analysis.supportLevel).toBeLessThan(analysis.resistanceLevel!);
    });
  });

  describe('Integration with existing tests', () => {
    it('should be usable in place of manual test data creation', () => {
      // Demonstrate that factory can replace manual test data
      const underlying = createValidUnderlying({ symbol: 'TSLA' });
      const contract = createValidContract({ underlyingSymbol: 'TSLA' });
      const priceData = createValidPriceData({ symbol: 'TSLA' });
      const analysis = createValidMarketAnalysis();

      // All objects should be valid and related
      expect(underlying.symbol).toBe('TSLA');
      expect(contract.underlyingSymbol).toBe('TSLA');
      expect(priceData.symbol).toBe('TSLA');
      expect(analysis.suggestedStrategy).toBeDefined();
    });
  });
});
