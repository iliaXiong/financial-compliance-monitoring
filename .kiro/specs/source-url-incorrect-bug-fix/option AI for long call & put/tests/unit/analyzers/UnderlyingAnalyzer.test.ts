// Unit tests for UnderlyingAnalyzer

import { describe, it, expect, beforeEach } from 'vitest';
import { DefaultUnderlyingAnalyzer } from '../../../src/analyzers/UnderlyingAnalyzer.js';
import { MockDataProvider } from '../../../src/services/DataProvider.js';
import { MarketSentiment, StrategyType, TrendDirection } from '../../../src/types/index.js';

describe('UnderlyingAnalyzer', () => {
  let analyzer: DefaultUnderlyingAnalyzer;
  let dataProvider: MockDataProvider;

  beforeEach(() => {
    dataProvider = new MockDataProvider();
    analyzer = new DefaultUnderlyingAnalyzer(dataProvider);
  });

  describe('validateUnderlying', () => {
    it('should validate AAPL by stock code', async () => {
      const result = await analyzer.validateUnderlying('AAPL');
      
      expect(result.isValid).toBe(true);
      expect(result.symbol).toBe('AAPL');
      expect(result.name).toContain('Apple');
    });

    it('should validate Apple by Chinese name', async () => {
      const result = await analyzer.validateUnderlying('苹果');
      
      expect(result.isValid).toBe(true);
      expect(result.symbol).toBe('AAPL');
    });

    it('should handle empty input', async () => {
      const result = await analyzer.validateUnderlying('');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('请输入有效的标的代码或名称');
    });

    it('should handle whitespace-only input', async () => {
      const result = await analyzer.validateUnderlying('   ');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle very long input', async () => {
      const longInput = 'A'.repeat(150);
      const result = await analyzer.validateUnderlying(longInput);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('过长');
    });

    it('should handle non-existent underlying', async () => {
      const result = await analyzer.validateUnderlying('NONEXISTENT');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('未找到标的');
    });

    it('should sanitize special characters', async () => {
      const result = await analyzer.validateUnderlying('AAPL$@#');
      
      // Should still find AAPL after sanitization
      expect(result.isValid).toBe(true);
      expect(result.symbol).toBe('AAPL');
    });
  });

  describe('getUnderlyingInfo', () => {
    it('should return complete underlying info for valid symbol', async () => {
      const info = await analyzer.getUnderlyingInfo('AAPL');
      
      expect(info.symbol).toBe('AAPL');
      expect(info.name).toBeDefined();
      expect(info.currentPrice).toBeGreaterThan(0);
      expect(info.priceTimestamp).toBeInstanceOf(Date);
      expect(info.supportsOptions).toBe(true);
    });

    it('should throw error for empty symbol', async () => {
      await expect(analyzer.getUnderlyingInfo('')).rejects.toThrow();
    });

    it('should throw error for non-existent symbol', async () => {
      await expect(analyzer.getUnderlyingInfo('NONEXISTENT')).rejects.toThrow();
    });

    it('should include price change information', async () => {
      const info = await analyzer.getUnderlyingInfo('AAPL');
      
      expect(info.change).toBeDefined();
      expect(info.changePercent).toBeDefined();
      expect(typeof info.change).toBe('number');
      expect(typeof info.changePercent).toBe('number');
    });
  });

  describe('analyzeMarketSentiment', () => {
    it('should return complete market analysis', async () => {
      const analysis = await analyzer.analyzeMarketSentiment('AAPL');
      
      expect(analysis.sentiment).toBeDefined();
      expect([MarketSentiment.BULLISH, MarketSentiment.BEARISH, MarketSentiment.NEUTRAL])
        .toContain(analysis.sentiment);
      expect(analysis.volatility).toBeGreaterThan(0);
      expect(analysis.trend).toBeDefined();
      expect(analysis.analysis).toBeDefined();
      expect(analysis.suggestedStrategy).toBeDefined();
    });

    it('should map bullish sentiment to Long Call strategy', async () => {
      const analysis = await analyzer.analyzeMarketSentiment('AAPL');
      
      if (analysis.sentiment === MarketSentiment.BULLISH) {
        expect(analysis.suggestedStrategy).toBe(StrategyType.LONG_CALL);
      }
    });

    it('should map bearish sentiment to Long Put strategy', async () => {
      const analysis = await analyzer.analyzeMarketSentiment('TSLA');
      
      if (analysis.sentiment === MarketSentiment.BEARISH) {
        expect(analysis.suggestedStrategy).toBe(StrategyType.LONG_PUT);
      }
    });

    it('should include technical indicators', async () => {
      const analysis = await analyzer.analyzeMarketSentiment('AAPL');
      
      expect(analysis.volatility).toBeDefined();
      expect(analysis.trend).toBeDefined();
      expect([TrendDirection.UPTREND, TrendDirection.DOWNTREND, TrendDirection.SIDEWAYS])
        .toContain(analysis.trend);
    });

    it('should include support and resistance levels', async () => {
      const analysis = await analyzer.analyzeMarketSentiment('AAPL');
      
      expect(analysis.supportLevel).toBeDefined();
      expect(analysis.resistanceLevel).toBeDefined();
      
      if (analysis.supportLevel && analysis.resistanceLevel) {
        expect(analysis.supportLevel).toBeLessThan(analysis.resistanceLevel);
      }
    });

    it('should provide analysis text in Chinese', async () => {
      const analysis = await analyzer.analyzeMarketSentiment('AAPL');
      
      expect(analysis.analysis).toBeDefined();
      expect(analysis.analysis.length).toBeGreaterThan(0);
      // Should contain Chinese characters
      expect(/[\u4e00-\u9fa5]/.test(analysis.analysis)).toBe(true);
    });

    it('should throw error for empty symbol', async () => {
      await expect(analyzer.analyzeMarketSentiment('')).rejects.toThrow();
    });

    it('should throw error for non-existent symbol', async () => {
      await expect(analyzer.analyzeMarketSentiment('NONEXISTENT')).rejects.toThrow();
    });
  });

  describe('Multi-format input equivalence', () => {
    it('should return same symbol for stock code and Chinese name', async () => {
      const resultByCode = await analyzer.validateUnderlying('AAPL');
      const resultByChineseName = await analyzer.validateUnderlying('苹果');
      
      expect(resultByCode.isValid).toBe(true);
      expect(resultByChineseName.isValid).toBe(true);
      expect(resultByCode.symbol).toBe(resultByChineseName.symbol);
    });

    it('should return same symbol for different input formats (TSLA)', async () => {
      const resultByCode = await analyzer.validateUnderlying('TSLA');
      const resultByChineseName = await analyzer.validateUnderlying('特斯拉');
      
      expect(resultByCode.isValid).toBe(true);
      expect(resultByChineseName.isValid).toBe(true);
      expect(resultByCode.symbol).toBe(resultByChineseName.symbol);
    });
  });

  describe('Error handling', () => {
    it('should handle data provider failures gracefully', async () => {
      dataProvider.simulateFailure(5); // Fail more times than retry attempts
      
      const result = await analyzer.validateUnderlying('AAPL');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should recover from transient failures with retry', async () => {
      dataProvider.simulateFailure(2); // Fail twice, then succeed
      
      const result = await analyzer.validateUnderlying('AAPL');
      
      // Should succeed after retries
      expect(result.isValid).toBe(true);
      expect(result.symbol).toBe('AAPL');
    });
  });
});
