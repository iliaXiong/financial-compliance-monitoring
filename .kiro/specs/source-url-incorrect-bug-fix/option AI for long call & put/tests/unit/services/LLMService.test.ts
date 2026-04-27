import { describe, it, expect, beforeEach } from 'vitest';
import { MockLLMService, UserIntent } from '../../../src/services/LLMService.js';
import {
  MarketSentiment,
  TrendDirection,
  StrategyType,
  OptionType,
  RiskLevel,
  DialogState
} from '../../../src/types/index.js';
import type {
  UnderlyingAsset,
  PriceData,
  TechnicalIndicators,
  OptionContract,
  SessionState
} from '../../../src/types/index.js';

describe('LLMService', () => {
  let service: MockLLMService;

  beforeEach(() => {
    service = new MockLLMService();
  });

  // ============================================================================
  // Test Data Factories
  // ============================================================================

  const createMockUnderlying = (overrides?: Partial<UnderlyingAsset>): UnderlyingAsset => ({
    symbol: 'AAPL',
    name: 'Apple Inc.',
    nameCn: '苹果公司',
    currentPrice: 150.00,
    priceTimestamp: new Date(),
    change: 2.50,
    changePercent: 1.69,
    supportsOptions: true,
    ...overrides
  });

  const createMockPriceHistory = (days: number = 30): PriceData[] => {
    const history: PriceData[] = [];
    const basePrice = 150;
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      history.push({
        symbol: 'AAPL',
        price: basePrice + (Math.random() - 0.5) * 10,
        timestamp: date,
        change: (Math.random() - 0.5) * 5,
        changePercent: (Math.random() - 0.5) * 3
      });
    }
    return history;
  };

  const createMockTechnicalIndicators = (overrides?: Partial<TechnicalIndicators>): TechnicalIndicators => ({
    volatility: 0.25,
    trend: TrendDirection.UPTREND,
    supportLevel: 145,
    resistanceLevel: 155,
    rsi: 55,
    movingAverage: {
      ma20: 148,
      ma50: 145,
      ma200: 140
    },
    ...overrides
  });

  const createMockContract = (overrides?: Partial<OptionContract>): OptionContract => ({
    contractSymbol: 'AAPL240119C00150000',
    underlyingSymbol: 'AAPL',
    type: OptionType.CALL,
    strike: 150,
    expiration: new Date('2024-01-19'),
    daysToExpiry: 30,
    premium: 5.50,
    bid: 5.45,
    ask: 5.55,
    delta: 0.52,
    gamma: 0.05,
    theta: -0.03,
    vega: 0.15,
    impliedVolatility: 0.25,
    volume: 1000,
    openInterest: 5000,
    lastUpdate: new Date(),
    ...overrides
  });

  const createMockSessionState = (overrides?: Partial<SessionState>): SessionState => ({
    sessionId: 'test-session-123',
    currentState: DialogState.AWAITING_UNDERLYING,
    history: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  });

  // ============================================================================
  // analyzeSentiment Tests
  // ============================================================================

  describe('analyzeSentiment', () => {
    it('should return bullish sentiment for uptrend', async () => {
      const underlying = createMockUnderlying({ changePercent: 3.5 });
      const priceHistory = createMockPriceHistory();
      const indicators = createMockTechnicalIndicators({ trend: TrendDirection.UPTREND });

      const result = await service.analyzeSentiment(underlying, priceHistory, indicators);

      expect(result.sentiment).toBe(MarketSentiment.BULLISH);
      expect(result.suggestedStrategy).toBe(StrategyType.LONG_CALL);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.reasoning).toContain('上涨');
    });

    it('should return bearish sentiment for downtrend', async () => {
      const underlying = createMockUnderlying({ changePercent: -3.5 });
      const priceHistory = createMockPriceHistory();
      const indicators = createMockTechnicalIndicators({ trend: TrendDirection.DOWNTREND });

      const result = await service.analyzeSentiment(underlying, priceHistory, indicators);

      expect(result.sentiment).toBe(MarketSentiment.BEARISH);
      expect(result.suggestedStrategy).toBe(StrategyType.LONG_PUT);
      expect(result.reasoning).toContain('下跌');
    });

    it('should return neutral sentiment for sideways trend with small price change', async () => {
      const underlying = createMockUnderlying({ changePercent: 0.5, currentPrice: 145 });
      const priceHistory = createMockPriceHistory();
      const indicators = createMockTechnicalIndicators({ 
        trend: TrendDirection.SIDEWAYS,
        rsi: 50,
        movingAverage: {
          ma20: 148,
          ma50: 148, // Same as MA20 to avoid trend signal
          ma200: 140
        }
      });

      const result = await service.analyzeSentiment(underlying, priceHistory, indicators);

      expect(result.sentiment).toBe(MarketSentiment.NEUTRAL);
      expect(result.reasoning).toContain('中性');
    });

    it('should consider RSI in sentiment analysis', async () => {
      const underlying = createMockUnderlying({ changePercent: 0.5 });
      const priceHistory = createMockPriceHistory();
      const indicators = createMockTechnicalIndicators({ 
        trend: TrendDirection.SIDEWAYS,
        rsi: 25 // Oversold
      });

      const result = await service.analyzeSentiment(underlying, priceHistory, indicators);

      expect(result.sentiment).toBe(MarketSentiment.BULLISH);
    });

    it('should include technical indicators in reasoning', async () => {
      const underlying = createMockUnderlying();
      const priceHistory = createMockPriceHistory();
      const indicators = createMockTechnicalIndicators({
        volatility: 0.35,
        supportLevel: 145,
        resistanceLevel: 155
      });

      const result = await service.analyzeSentiment(underlying, priceHistory, indicators);

      expect(result.reasoning).toContain('波动率');
      expect(result.reasoning).toContain('支撑位');
      expect(result.reasoning).toContain('阻力位');
    });

    it('should calculate higher confidence for low volatility', async () => {
      const underlying = createMockUnderlying();
      const priceHistory = createMockPriceHistory();
      const lowVolIndicators = createMockTechnicalIndicators({ 
        volatility: 0.15,
        trend: TrendDirection.UPTREND
      });
      const highVolIndicators = createMockTechnicalIndicators({ 
        volatility: 0.6,
        trend: TrendDirection.UPTREND
      });

      const lowVolResult = await service.analyzeSentiment(underlying, priceHistory, lowVolIndicators);
      const highVolResult = await service.analyzeSentiment(underlying, priceHistory, highVolIndicators);

      expect(lowVolResult.confidence).toBeGreaterThan(highVolResult.confidence);
    });

    it('should throw error when service is unavailable', async () => {
      service.setAvailability(false);
      
      const underlying = createMockUnderlying();
      const priceHistory = createMockPriceHistory();
      const indicators = createMockTechnicalIndicators();

      await expect(
        service.analyzeSentiment(underlying, priceHistory, indicators)
      ).rejects.toThrow();
    });
  });

  // ============================================================================
  // analyzeOptionContract Tests
  // ============================================================================

  describe('analyzeOptionContract', () => {
    it('should score ATM call option highly for bullish sentiment', async () => {
      const underlying = createMockUnderlying({ currentPrice: 150 });
      const contract = createMockContract({ 
        strike: 150, 
        type: OptionType.CALL,
        delta: 0.5
      });

      const result = await service.analyzeOptionContract(
        contract,
        underlying,
        MarketSentiment.BULLISH
      );

      expect(result.score).toBeGreaterThan(70);
      expect(result.reasoning).toContain('平值');
    });

    it('should score ATM put option highly for bearish sentiment', async () => {
      const underlying = createMockUnderlying({ currentPrice: 150 });
      const contract = createMockContract({ 
        strike: 150, 
        type: OptionType.PUT,
        delta: -0.5
      });

      const result = await service.analyzeOptionContract(
        contract,
        underlying,
        MarketSentiment.BEARISH
      );

      expect(result.score).toBeGreaterThan(70);
    });

    it('should assign high risk to contracts expiring soon', async () => {
      const underlying = createMockUnderlying();
      const contract = createMockContract({ daysToExpiry: 5 });

      const result = await service.analyzeOptionContract(
        contract,
        underlying,
        MarketSentiment.BULLISH
      );

      expect(result.riskLevel).toBe(RiskLevel.HIGH);
      expect(result.keyPoints.some(point => point.includes('临近到期'))).toBe(true);
    });

    it('should assign high risk to low liquidity contracts', async () => {
      const underlying = createMockUnderlying();
      const contract = createMockContract({ 
        volume: 10,
        openInterest: 50
      });

      const result = await service.analyzeOptionContract(
        contract,
        underlying,
        MarketSentiment.BULLISH
      );

      expect(result.riskLevel).toBe(RiskLevel.HIGH);
      expect(result.reasoning).toContain('流动性较差');
    });

    it('should assign low risk to ITM contracts with good liquidity', async () => {
      const underlying = createMockUnderlying({ currentPrice: 160 });
      const contract = createMockContract({ 
        strike: 150,
        type: OptionType.CALL,
        daysToExpiry: 45,
        volume: 2000,
        openInterest: 10000
      });

      const result = await service.analyzeOptionContract(
        contract,
        underlying,
        MarketSentiment.BULLISH
      );

      expect(result.riskLevel).toBe(RiskLevel.LOW);
    });

    it('should include key points about moneyness', async () => {
      const underlying = createMockUnderlying({ currentPrice: 150 });
      const contract = createMockContract({ strike: 155 }); // OTM

      const result = await service.analyzeOptionContract(
        contract,
        underlying,
        MarketSentiment.BULLISH
      );

      expect(result.keyPoints.some(point => point.includes('虚值'))).toBe(true);
    });

    it('should include key points about implied volatility', async () => {
      const underlying = createMockUnderlying();
      const highIVContract = createMockContract({ impliedVolatility: 0.6 });

      const result = await service.analyzeOptionContract(
        highIVContract,
        underlying,
        MarketSentiment.BULLISH
      );

      expect(result.keyPoints.some(point => point.includes('隐含波动率'))).toBe(true);
    });

    it('should provide reasoning with Greeks explanation', async () => {
      const underlying = createMockUnderlying();
      const contract = createMockContract({ delta: 0.65 });

      const result = await service.analyzeOptionContract(
        contract,
        underlying,
        MarketSentiment.BULLISH
      );

      expect(result.reasoning).toContain('Delta');
      expect(result.reasoning).toContain('0.65');
    });

    it('should throw error when service is unavailable', async () => {
      service.setAvailability(false);
      
      const underlying = createMockUnderlying();
      const contract = createMockContract();

      await expect(
        service.analyzeOptionContract(contract, underlying, MarketSentiment.BULLISH)
      ).rejects.toThrow();
    });
  });

  // ============================================================================
  // generateResponse Tests
  // ============================================================================

  describe('generateResponse', () => {
    it('should generate appropriate response for SELECT_UNDERLYING intent', async () => {
      const context = createMockSessionState();

      const response = await service.generateResponse(context, UserIntent.SELECT_UNDERLYING);

      expect(response).toContain('标的');
      expect(response).toContain('输入');
    });

    it('should generate confirmation response with underlying details', async () => {
      const underlying = createMockUnderlying();
      const context = createMockSessionState({ 
        underlying,
        currentState: DialogState.CONFIRMING_UNDERLYING
      });

      const response = await service.generateResponse(context, UserIntent.CONFIRM);

      expect(response).toContain(underlying.name);
      expect(response).toContain(underlying.symbol);
      expect(response).toContain('150.00');
    });

    it('should generate analysis response with sentiment and strategy', async () => {
      const context = createMockSessionState({ 
        sentiment: MarketSentiment.BULLISH,
        strategy: StrategyType.LONG_CALL,
        currentState: DialogState.ANALYZING_UNDERLYING
      });

      const response = await service.generateResponse(context, UserIntent.ANALYZE);

      expect(response).toContain('看涨');
      expect(response).toContain('Long Call');
    });

    it('should generate contract selection prompt', async () => {
      const context = createMockSessionState({ 
        currentState: DialogState.AWAITING_SELECTION
      });

      const response = await service.generateResponse(context, UserIntent.SELECT_CONTRACT);

      expect(response).toContain('选择');
      expect(response).toContain('期权合约');
    });

    it('should generate restart confirmation', async () => {
      const context = createMockSessionState();

      const response = await service.generateResponse(context, UserIntent.RESTART);

      expect(response).toContain('重置');
      expect(response).toContain('重新开始');
    });

    it('should generate help message with workflow steps', async () => {
      const context = createMockSessionState();

      const response = await service.generateResponse(context, UserIntent.HELP);

      expect(response).toContain('标的');
      expect(response).toContain('分析');
      expect(response).toContain('期权');
    });

    it('should provide fallback response when service unavailable', async () => {
      service.setAvailability(false);
      const context = createMockSessionState();

      const response = await service.generateResponse(context, UserIntent.SELECT_UNDERLYING);

      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
    });
  });

  // ============================================================================
  // Edge Cases and Error Handling
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle contracts with zero volume', async () => {
      const underlying = createMockUnderlying();
      const contract = createMockContract({ volume: 0, openInterest: 0 });

      const result = await service.analyzeOptionContract(
        contract,
        underlying,
        MarketSentiment.BULLISH
      );

      expect(result.riskLevel).toBe(RiskLevel.HIGH);
    });

    it('should handle contracts expiring today', async () => {
      const underlying = createMockUnderlying();
      const contract = createMockContract({ daysToExpiry: 0 });

      const result = await service.analyzeOptionContract(
        contract,
        underlying,
        MarketSentiment.BULLISH
      );

      expect(result.riskLevel).toBe(RiskLevel.HIGH);
    });

    it('should handle technical indicators without optional fields', async () => {
      const underlying = createMockUnderlying();
      const priceHistory = createMockPriceHistory();
      const indicators: TechnicalIndicators = {
        volatility: 0.25,
        trend: TrendDirection.UPTREND
      };

      const result = await service.analyzeSentiment(underlying, priceHistory, indicators);

      expect(result).toBeDefined();
      expect(result.sentiment).toBeDefined();
    });

    it('should handle very high implied volatility', async () => {
      const underlying = createMockUnderlying();
      const contract = createMockContract({ impliedVolatility: 1.5 });

      const result = await service.analyzeOptionContract(
        contract,
        underlying,
        MarketSentiment.BULLISH
      );

      expect(result.keyPoints.some(point => point.includes('波动率'))).toBe(true);
    });

    it('should handle deep ITM contracts', async () => {
      const underlying = createMockUnderlying({ currentPrice: 170 });
      const contract = createMockContract({ 
        strike: 150,
        type: OptionType.CALL,
        delta: 0.95
      });

      const result = await service.analyzeOptionContract(
        contract,
        underlying,
        MarketSentiment.BULLISH
      );

      expect(result.reasoning).toContain('实值');
    });

    it('should handle deep OTM contracts', async () => {
      const underlying = createMockUnderlying({ currentPrice: 150 });
      const contract = createMockContract({ 
        strike: 180,
        type: OptionType.CALL,
        delta: 0.05
      });

      const result = await service.analyzeOptionContract(
        contract,
        underlying,
        MarketSentiment.BULLISH
      );

      expect(result.reasoning).toContain('虚值');
    });
  });

  // ============================================================================
  // Service Availability Tests
  // ============================================================================

  describe('Service Availability', () => {
    it('should allow toggling service availability', () => {
      service.setAvailability(false);
      service.setAvailability(true);
      // No error should be thrown
    });

    it('should use rule-based fallback when LLM unavailable', async () => {
      service.setAvailability(false);
      
      const underlying = createMockUnderlying();
      const priceHistory = createMockPriceHistory();
      const indicators = createMockTechnicalIndicators();

      // Should throw for sentiment analysis
      await expect(
        service.analyzeSentiment(underlying, priceHistory, indicators)
      ).rejects.toThrow('LLM服务暂时不可用');
    });
  });
});
