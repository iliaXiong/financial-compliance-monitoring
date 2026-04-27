import { describe, it, expect } from 'vitest';
import {
  MarketSentiment,
  TrendDirection,
  StrategyType,
  TimePeriod,
  UnderlyingAsset,
  PriceData,
  TechnicalIndicators,
  MarketAnalysis,
  ValidationResult
} from '../../../src/types/market';

describe('Market Types', () => {
  describe('Enums', () => {
    it('should define MarketSentiment enum with correct values', () => {
      expect(MarketSentiment.BULLISH).toBe('看涨');
      expect(MarketSentiment.BEARISH).toBe('看跌');
      expect(MarketSentiment.NEUTRAL).toBe('中性');
    });

    it('should define TrendDirection enum with correct values', () => {
      expect(TrendDirection.UPTREND).toBe('上升趋势');
      expect(TrendDirection.DOWNTREND).toBe('下降趋势');
      expect(TrendDirection.SIDEWAYS).toBe('横盘整理');
    });

    it('should define StrategyType enum with correct values', () => {
      expect(StrategyType.LONG_CALL).toBe('Long Call');
      expect(StrategyType.LONG_PUT).toBe('Long Put');
    });

    it('should define TimePeriod enum with correct values', () => {
      expect(TimePeriod.ONE_DAY).toBe('1d');
      expect(TimePeriod.ONE_WEEK).toBe('1w');
      expect(TimePeriod.ONE_MONTH).toBe('1m');
      expect(TimePeriod.THREE_MONTHS).toBe('3m');
      expect(TimePeriod.ONE_YEAR).toBe('1y');
    });
  });

  describe('Interfaces', () => {
    it('should create valid UnderlyingAsset object', () => {
      const asset: UnderlyingAsset = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        nameCn: '苹果公司',
        currentPrice: 150.00,
        priceTimestamp: new Date(),
        change: 2.50,
        changePercent: 1.69,
        supportsOptions: true
      };

      expect(asset.symbol).toBe('AAPL');
      expect(asset.supportsOptions).toBe(true);
    });

    it('should create valid PriceData object', () => {
      const priceData: PriceData = {
        symbol: 'AAPL',
        price: 150.00,
        timestamp: new Date(),
        change: 2.50,
        changePercent: 1.69
      };

      expect(priceData.symbol).toBe('AAPL');
      expect(priceData.price).toBe(150.00);
    });

    it('should create valid TechnicalIndicators object', () => {
      const indicators: TechnicalIndicators = {
        volatility: 0.25,
        trend: TrendDirection.UPTREND,
        supportLevel: 145.00,
        resistanceLevel: 155.00,
        rsi: 65,
        movingAverage: {
          ma20: 148.00,
          ma50: 145.00,
          ma200: 140.00
        }
      };

      expect(indicators.volatility).toBe(0.25);
      expect(indicators.trend).toBe(TrendDirection.UPTREND);
    });

    it('should create valid MarketAnalysis object', () => {
      const analysis: MarketAnalysis = {
        sentiment: MarketSentiment.BULLISH,
        volatility: 0.25,
        trend: TrendDirection.UPTREND,
        supportLevel: 145.00,
        resistanceLevel: 155.00,
        analysis: 'Market shows strong bullish momentum',
        suggestedStrategy: StrategyType.LONG_CALL
      };

      expect(analysis.sentiment).toBe(MarketSentiment.BULLISH);
      expect(analysis.suggestedStrategy).toBe(StrategyType.LONG_CALL);
    });

    it('should create valid ValidationResult for successful validation', () => {
      const result: ValidationResult = {
        isValid: true,
        symbol: 'AAPL',
        name: 'Apple Inc.'
      };

      expect(result.isValid).toBe(true);
      expect(result.symbol).toBe('AAPL');
    });

    it('should create valid ValidationResult for failed validation', () => {
      const result: ValidationResult = {
        isValid: false,
        error: 'Symbol not found',
        suggestions: ['AAPL', 'APLT']
      };

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.suggestions).toHaveLength(2);
    });
  });

  describe('Type Relationships', () => {
    it('should map MarketSentiment to StrategyType correctly', () => {
      // Bullish sentiment should suggest Long Call
      const bullishAnalysis: MarketAnalysis = {
        sentiment: MarketSentiment.BULLISH,
        volatility: 0.25,
        trend: TrendDirection.UPTREND,
        analysis: 'Bullish market',
        suggestedStrategy: StrategyType.LONG_CALL
      };

      expect(bullishAnalysis.sentiment).toBe(MarketSentiment.BULLISH);
      expect(bullishAnalysis.suggestedStrategy).toBe(StrategyType.LONG_CALL);

      // Bearish sentiment should suggest Long Put
      const bearishAnalysis: MarketAnalysis = {
        sentiment: MarketSentiment.BEARISH,
        volatility: 0.30,
        trend: TrendDirection.DOWNTREND,
        analysis: 'Bearish market',
        suggestedStrategy: StrategyType.LONG_PUT
      };

      expect(bearishAnalysis.sentiment).toBe(MarketSentiment.BEARISH);
      expect(bearishAnalysis.suggestedStrategy).toBe(StrategyType.LONG_PUT);
    });
  });
});
