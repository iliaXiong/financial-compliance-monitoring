// Unit tests for DialogEngine

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DefaultDialogEngine } from '../../../src/dialog/DialogEngine.js';
import { StateManagerImpl } from '../../../src/dialog/StateManager.js';
import { DialogState, MarketSentiment, StrategyType, OptionType, RiskLevel, Moneyness } from '../../../src/types/index.js';
import type { UnderlyingAnalyzer } from '../../../src/analyzers/UnderlyingAnalyzer.js';
import type { OptionAnalyzer } from '../../../src/analyzers/OptionAnalyzer.js';
import type { TradeService } from '../../../src/services/TradeService.js';
import type { LLMService } from '../../../src/services/LLMService.js';
import { UserIntent } from '../../../src/services/LLMService.js';

describe('DialogEngine', () => {
  let dialogEngine: DefaultDialogEngine;
  let stateManager: StateManagerImpl;
  let mockUnderlyingAnalyzer: UnderlyingAnalyzer;
  let mockOptionAnalyzer: OptionAnalyzer;
  let mockTradeService: TradeService;
  let mockLLMService: LLMService;

  beforeEach(() => {
    // Create state manager
    stateManager = new StateManagerImpl();

    // Create mock analyzers and services
    mockUnderlyingAnalyzer = {
      validateUnderlying: vi.fn(),
      getUnderlyingInfo: vi.fn(),
      analyzeMarketSentiment: vi.fn()
    };

    mockOptionAnalyzer = {
      getOptionChain: vi.fn(),
      analyzeContracts: vi.fn(),
      rankContracts: vi.fn()
    };

    mockTradeService = {
      generateTradeLink: vi.fn(),
      addToWatchlist: vi.fn(),
      getWatchlist: vi.fn(),
      removeFromWatchlist: vi.fn()
    };

    mockLLMService = {
      analyzeSentiment: vi.fn(),
      analyzeOptionContract: vi.fn(),
      generateResponse: vi.fn()
    };

    // Create dialog engine with mocks
    dialogEngine = new DefaultDialogEngine(
      stateManager,
      mockUnderlyingAnalyzer,
      mockOptionAnalyzer,
      mockTradeService,
      mockLLMService
    );
  });

  describe('startSession', () => {
    it('should create a new session with AWAITING_UNDERLYING state', () => {
      const sessionId = dialogEngine.startSession();

      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');

      const state = dialogEngine.getSessionState(sessionId);
      expect(state).not.toBeNull();
      expect(state!.currentState).toBe(DialogState.AWAITING_UNDERLYING);
      expect(state!.history.length).toBeGreaterThan(0);
    });

    it('should create unique session IDs for multiple sessions', () => {
      const sessionId1 = dialogEngine.startSession();
      const sessionId2 = dialogEngine.startSession();

      expect(sessionId1).not.toBe(sessionId2);
    });
  });

  describe('getSessionState', () => {
    it('should return session state for valid session ID', () => {
      const sessionId = dialogEngine.startSession();
      const state = dialogEngine.getSessionState(sessionId);

      expect(state).not.toBeNull();
      expect(state!.sessionId).toBe(sessionId);
    });

    it('should return null for invalid session ID', () => {
      const state = dialogEngine.getSessionState('invalid-session-id');
      expect(state).toBeNull();
    });
  });

  describe('resetSession', () => {
    it('should clear all business data and reset to AWAITING_UNDERLYING', async () => {
      const sessionId = dialogEngine.startSession();

      // Simulate some progress
      const state = dialogEngine.getSessionState(sessionId)!;
      state.underlying = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        currentPrice: 150,
        priceTimestamp: new Date(),
        change: 2.5,
        changePercent: 1.69,
        supportsOptions: true
      };
      state.sentiment = MarketSentiment.BULLISH;
      state.strategy = StrategyType.LONG_CALL;
      stateManager.updateState(sessionId, state);

      // Reset session
      dialogEngine.resetSession(sessionId);

      // Verify reset
      const resetState = dialogEngine.getSessionState(sessionId);
      expect(resetState!.currentState).toBe(DialogState.AWAITING_UNDERLYING);
      expect(resetState!.underlying).toBeUndefined();
      expect(resetState!.sentiment).toBeUndefined();
      expect(resetState!.strategy).toBeUndefined();
      expect(resetState!.analyzedContracts).toBeUndefined();
      expect(resetState!.selectedContracts).toBeUndefined();
    });

    it('should handle reset for non-existent session gracefully', () => {
      expect(() => {
        dialogEngine.resetSession('non-existent-session');
      }).not.toThrow();
    });
  });

  describe('processInput - AWAITING_UNDERLYING state', () => {
    it('should validate underlying and transition to CONFIRMING_UNDERLYING on valid input', async () => {
      const sessionId = dialogEngine.startSession();

      // Mock validation success
      vi.mocked(mockUnderlyingAnalyzer.validateUnderlying).mockResolvedValue({
        isValid: true,
        symbol: 'AAPL',
        name: 'Apple Inc.'
      });

      vi.mocked(mockUnderlyingAnalyzer.getUnderlyingInfo).mockResolvedValue({
        symbol: 'AAPL',
        name: 'Apple Inc.',
        currentPrice: 150.00,
        priceTimestamp: new Date(),
        change: 2.50,
        changePercent: 1.69,
        supportsOptions: true
      });

      const response = await dialogEngine.processInput(sessionId, 'AAPL');

      expect(response.state).toBe(DialogState.CONFIRMING_UNDERLYING);
      expect(response.message).toContain('Apple Inc.');
      expect(response.message).toContain('150.00');
      expect(response.options).toContain('确认');
    });

    it('should stay in AWAITING_UNDERLYING on invalid input', async () => {
      const sessionId = dialogEngine.startSession();

      // Mock validation failure
      vi.mocked(mockUnderlyingAnalyzer.validateUnderlying).mockResolvedValue({
        isValid: false,
        error: '未找到标的 INVALID',
        suggestions: ['AAPL']
      });

      const response = await dialogEngine.processInput(sessionId, 'INVALID');

      expect(response.state).toBe(DialogState.AWAITING_UNDERLYING);
      expect(response.message).toContain('未找到标的');
      expect(response.message).toContain('AAPL');
    });

    it('should handle underlying that does not support options', async () => {
      const sessionId = dialogEngine.startSession();

      vi.mocked(mockUnderlyingAnalyzer.validateUnderlying).mockResolvedValue({
        isValid: false,
        symbol: 'TEST',
        name: 'Test Asset',
        error: '不支持期权交易'
      });

      const response = await dialogEngine.processInput(sessionId, 'TEST');

      expect(response.state).toBe(DialogState.AWAITING_UNDERLYING);
      expect(response.message).toContain('不支持期权交易');
    });
  });

  describe('processInput - CONFIRMING_UNDERLYING state', () => {
    let sessionId: string;

    beforeEach(async () => {
      sessionId = dialogEngine.startSession();

      // Setup: Get to CONFIRMING_UNDERLYING state
      vi.mocked(mockUnderlyingAnalyzer.validateUnderlying).mockResolvedValue({
        isValid: true,
        symbol: 'AAPL',
        name: 'Apple Inc.'
      });

      vi.mocked(mockUnderlyingAnalyzer.getUnderlyingInfo).mockResolvedValue({
        symbol: 'AAPL',
        name: 'Apple Inc.',
        currentPrice: 150.00,
        priceTimestamp: new Date(),
        change: 2.50,
        changePercent: 1.69,
        supportsOptions: true
      });

      await dialogEngine.processInput(sessionId, 'AAPL');
    });

    it('should transition to ANALYZING_UNDERLYING on confirmation', async () => {
      // Mock market analysis
      vi.mocked(mockUnderlyingAnalyzer.analyzeMarketSentiment).mockResolvedValue({
        sentiment: MarketSentiment.BULLISH,
        volatility: 0.25,
        trend: 'UPTREND' as any,
        supportLevel: 145,
        resistanceLevel: 155,
        analysis: '市场呈上升趋势',
        suggestedStrategy: StrategyType.LONG_CALL
      });

      const response = await dialogEngine.processInput(sessionId, '确认');

      expect(response.state).toBe(DialogState.SUGGESTING_STRATEGY);
      expect(response.message).toContain('市场分析完成');
      expect(response.message).toContain('看涨');
    });

    it('should go back to AWAITING_UNDERLYING on rejection', async () => {
      const response = await dialogEngine.processInput(sessionId, '重新选择');

      expect(response.state).toBe(DialogState.AWAITING_UNDERLYING);
      expect(response.message).toContain('重新输入');
    });

    it('should ask for clarification on unclear input', async () => {
      // Mock market analysis to prevent it from being triggered
      vi.mocked(mockUnderlyingAnalyzer.analyzeMarketSentiment).mockResolvedValue({
        sentiment: MarketSentiment.BULLISH,
        volatility: 0.25,
        trend: 'UPTREND' as any,
        supportLevel: 145,
        resistanceLevel: 155,
        analysis: '市场呈上升趋势',
        suggestedStrategy: StrategyType.LONG_CALL
      });

      const response = await dialogEngine.processInput(sessionId, 'maybe');

      expect(response.state).toBe(DialogState.CONFIRMING_UNDERLYING);
      expect(response.message).toContain('请确认');
    });
  });

  describe('processInput - Full workflow', () => {
    it('should complete full workflow from underlying to trade link', async () => {
      const sessionId = dialogEngine.startSession();

      // Step 1: Input underlying
      vi.mocked(mockUnderlyingAnalyzer.validateUnderlying).mockResolvedValue({
        isValid: true,
        symbol: 'AAPL',
        name: 'Apple Inc.'
      });

      vi.mocked(mockUnderlyingAnalyzer.getUnderlyingInfo).mockResolvedValue({
        symbol: 'AAPL',
        name: 'Apple Inc.',
        currentPrice: 150.00,
        priceTimestamp: new Date(),
        change: 2.50,
        changePercent: 1.69,
        supportsOptions: true
      });

      const response1 = await dialogEngine.processInput(sessionId, 'AAPL');
      expect(response1.state).toBe(DialogState.CONFIRMING_UNDERLYING);

      // Step 2: Confirm underlying
      vi.mocked(mockUnderlyingAnalyzer.analyzeMarketSentiment).mockResolvedValue({
        sentiment: MarketSentiment.BULLISH,
        volatility: 0.25,
        trend: 'UPTREND' as any,
        supportLevel: 145,
        resistanceLevel: 155,
        analysis: '市场呈上升趋势',
        suggestedStrategy: StrategyType.LONG_CALL
      });

      const response2 = await dialogEngine.processInput(sessionId, '确认');
      expect(response2.state).toBe(DialogState.SUGGESTING_STRATEGY);

      // Step 3: Continue to analyze options
      const mockContract = {
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
        impliedVolatility: 0.25,
        volume: 1000,
        openInterest: 5000,
        lastUpdate: new Date()
      };

      const mockAnalyzedContract = {
        ...mockContract,
        score: 85,
        riskLevel: RiskLevel.MEDIUM,
        analysis: '该合约为平值期权，流动性良好',
        keyMetrics: {
          moneyness: Moneyness.ATM,
          liquidityScore: 75,
          costEfficiency: 80
        }
      };

      vi.mocked(mockOptionAnalyzer.getOptionChain).mockResolvedValue([mockContract]);
      vi.mocked(mockOptionAnalyzer.analyzeContracts).mockResolvedValue([mockAnalyzedContract]);
      vi.mocked(mockOptionAnalyzer.rankContracts).mockReturnValue([mockAnalyzedContract]);

      const response3 = await dialogEngine.processInput(sessionId, '继续分析');
      expect(response3.state).toBe(DialogState.AWAITING_SELECTION);
      expect(response3.message).toContain('AAPL240119C00150000');

      // Step 4: Select contract
      vi.mocked(mockTradeService.generateTradeLink).mockReturnValue('https://trade.example.com/options?symbol=AAPL240119C00150000');
      vi.mocked(mockTradeService.addToWatchlist).mockResolvedValue({
        success: true,
        addedCount: 1,
        message: '成功添加 1 个合约到自选列表'
      });

      const response4 = await dialogEngine.processInput(sessionId, '1');
      expect(response4.state).toBe(DialogState.COMPLETED);
      expect(response4.message).toContain('交易链接');
      expect(response4.message).toContain('https://trade.example.com');
    });
  });

  describe('processInput - Special intents', () => {
    it('should handle restart intent from any state', async () => {
      const sessionId = dialogEngine.startSession();

      vi.mocked(mockLLMService.generateResponse).mockResolvedValue('已重置会话，让我们重新开始');

      const response = await dialogEngine.processInput(sessionId, '重新开始');

      expect(response.state).toBe(DialogState.AWAITING_UNDERLYING);
      expect(response.message).toContain('重新开始');
    });

    it('should handle help intent', async () => {
      const sessionId = dialogEngine.startSession();

      vi.mocked(mockLLMService.generateResponse).mockResolvedValue('我可以帮您分析期权交易机会');

      const response = await dialogEngine.processInput(sessionId, '帮助');

      expect(response.message).toBeDefined();
      expect(response.options).toContain('继续');
    });
  });

  describe('processInput - Error handling', () => {
    it('should handle invalid session ID', async () => {
      const response = await dialogEngine.processInput('invalid-session', 'AAPL');

      expect(response.state).toBe(DialogState.AWAITING_UNDERLYING);
      expect(response.message).toContain('会话不存在或已过期');
    });

    it('should handle market analysis failure gracefully', async () => {
      const sessionId = dialogEngine.startSession();

      // Setup: Get to CONFIRMING_UNDERLYING state
      vi.mocked(mockUnderlyingAnalyzer.validateUnderlying).mockResolvedValue({
        isValid: true,
        symbol: 'AAPL',
        name: 'Apple Inc.'
      });

      vi.mocked(mockUnderlyingAnalyzer.getUnderlyingInfo).mockResolvedValue({
        symbol: 'AAPL',
        name: 'Apple Inc.',
        currentPrice: 150.00,
        priceTimestamp: new Date(),
        change: 2.50,
        changePercent: 1.69,
        supportsOptions: true
      });

      await dialogEngine.processInput(sessionId, 'AAPL');

      // Mock analysis failure
      vi.mocked(mockUnderlyingAnalyzer.analyzeMarketSentiment).mockRejectedValue(
        new Error('API unavailable')
      );

      const response = await dialogEngine.processInput(sessionId, '确认');

      expect(response.message).toContain('失败');
      expect(response.state).toBe(DialogState.CONFIRMING_UNDERLYING);
    });

    it('should handle option chain fetch failure', async () => {
      const sessionId = dialogEngine.startSession();

      // Setup: Get to SUGGESTING_STRATEGY state
      vi.mocked(mockUnderlyingAnalyzer.validateUnderlying).mockResolvedValue({
        isValid: true,
        symbol: 'AAPL',
        name: 'Apple Inc.'
      });

      vi.mocked(mockUnderlyingAnalyzer.getUnderlyingInfo).mockResolvedValue({
        symbol: 'AAPL',
        name: 'Apple Inc.',
        currentPrice: 150.00,
        priceTimestamp: new Date(),
        change: 2.50,
        changePercent: 1.69,
        supportsOptions: true
      });

      await dialogEngine.processInput(sessionId, 'AAPL');

      vi.mocked(mockUnderlyingAnalyzer.analyzeMarketSentiment).mockResolvedValue({
        sentiment: MarketSentiment.BULLISH,
        volatility: 0.25,
        trend: 'UPTREND' as any,
        supportLevel: 145,
        resistanceLevel: 155,
        analysis: '市场呈上升趋势',
        suggestedStrategy: StrategyType.LONG_CALL
      });

      await dialogEngine.processInput(sessionId, '确认');

      // Mock option chain failure
      vi.mocked(mockOptionAnalyzer.getOptionChain).mockRejectedValue(
        new Error('Data source unavailable')
      );

      const response = await dialogEngine.processInput(sessionId, '继续分析');

      expect(response.message).toContain('失败');
      expect(response.state).toBe(DialogState.SUGGESTING_STRATEGY);
    });
  });

  describe('processInput - Contract selection', () => {
    let sessionId: string;

    beforeEach(async () => {
      sessionId = dialogEngine.startSession();

      // Setup: Get to AWAITING_SELECTION state
      vi.mocked(mockUnderlyingAnalyzer.validateUnderlying).mockResolvedValue({
        isValid: true,
        symbol: 'AAPL',
        name: 'Apple Inc.'
      });

      vi.mocked(mockUnderlyingAnalyzer.getUnderlyingInfo).mockResolvedValue({
        symbol: 'AAPL',
        name: 'Apple Inc.',
        currentPrice: 150.00,
        priceTimestamp: new Date(),
        change: 2.50,
        changePercent: 1.69,
        supportsOptions: true
      });

      await dialogEngine.processInput(sessionId, 'AAPL');

      vi.mocked(mockUnderlyingAnalyzer.analyzeMarketSentiment).mockResolvedValue({
        sentiment: MarketSentiment.BULLISH,
        volatility: 0.25,
        trend: 'UPTREND' as any,
        supportLevel: 145,
        resistanceLevel: 155,
        analysis: '市场呈上升趋势',
        suggestedStrategy: StrategyType.LONG_CALL
      });

      await dialogEngine.processInput(sessionId, '确认');

      const mockContracts = [
        {
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
          impliedVolatility: 0.25,
          volume: 1000,
          openInterest: 5000,
          lastUpdate: new Date(),
          score: 85,
          riskLevel: RiskLevel.MEDIUM,
          analysis: '该合约为平值期权',
          keyMetrics: {
            moneyness: Moneyness.ATM,
            liquidityScore: 75,
            costEfficiency: 80
          }
        },
        {
          contractSymbol: 'AAPL240119C00155000',
          underlyingSymbol: 'AAPL',
          type: OptionType.CALL,
          strike: 155,
          expiration: new Date('2024-01-19'),
          daysToExpiry: 30,
          premium: 3.50,
          bid: 3.45,
          ask: 3.55,
          delta: 0.42,
          impliedVolatility: 0.25,
          volume: 800,
          openInterest: 4000,
          lastUpdate: new Date(),
          score: 80,
          riskLevel: RiskLevel.MEDIUM,
          analysis: '该合约为虚值期权',
          keyMetrics: {
            moneyness: Moneyness.OTM,
            liquidityScore: 70,
            costEfficiency: 85
          }
        }
      ];

      vi.mocked(mockOptionAnalyzer.getOptionChain).mockResolvedValue(mockContracts);
      vi.mocked(mockOptionAnalyzer.analyzeContracts).mockResolvedValue(mockContracts);
      vi.mocked(mockOptionAnalyzer.rankContracts).mockReturnValue(mockContracts);

      await dialogEngine.processInput(sessionId, '继续分析');
    });

    it('should handle single contract selection', async () => {
      vi.mocked(mockTradeService.generateTradeLink).mockReturnValue('https://trade.example.com/options?symbol=AAPL240119C00150000');
      vi.mocked(mockTradeService.addToWatchlist).mockResolvedValue({
        success: true,
        addedCount: 1,
        message: '成功添加 1 个合约到自选列表'
      });

      const response = await dialogEngine.processInput(sessionId, '1');

      expect(response.state).toBe(DialogState.COMPLETED);
      expect(response.message).toContain('AAPL240119C00150000');
    });

    it('should handle multiple contract selection', async () => {
      vi.mocked(mockTradeService.generateTradeLink).mockReturnValue('https://trade.example.com/options');
      vi.mocked(mockTradeService.addToWatchlist).mockResolvedValue({
        success: true,
        addedCount: 2,
        message: '成功添加 2 个合约到自选列表'
      });

      const response = await dialogEngine.processInput(sessionId, '1,2');

      expect(response.state).toBe(DialogState.COMPLETED);
      expect(response.data.tradeLinks).toHaveLength(2);
    });

    it('should handle invalid selection format', async () => {
      const response = await dialogEngine.processInput(sessionId, 'invalid');

      expect(response.state).toBe(DialogState.AWAITING_SELECTION);
      expect(response.message).toContain('有效的合约序号');
    });

    it('should handle out of range selection', async () => {
      const response = await dialogEngine.processInput(sessionId, '99');

      expect(response.state).toBe(DialogState.AWAITING_SELECTION);
      expect(response.message).toContain('1 到');
    });
  });

  describe('Context maintenance', () => {
    it('should maintain conversation history throughout the flow', async () => {
      const sessionId = dialogEngine.startSession();

      vi.mocked(mockUnderlyingAnalyzer.validateUnderlying).mockResolvedValue({
        isValid: true,
        symbol: 'AAPL',
        name: 'Apple Inc.'
      });

      vi.mocked(mockUnderlyingAnalyzer.getUnderlyingInfo).mockResolvedValue({
        symbol: 'AAPL',
        name: 'Apple Inc.',
        currentPrice: 150.00,
        priceTimestamp: new Date(),
        change: 2.50,
        changePercent: 1.69,
        supportsOptions: true
      });

      await dialogEngine.processInput(sessionId, 'AAPL');
      await dialogEngine.processInput(sessionId, '确认');

      const state = dialogEngine.getSessionState(sessionId);
      expect(state!.history.length).toBeGreaterThan(2);
      expect(state!.history.some(h => h.content === 'AAPL')).toBe(true);
    });

    it('should preserve underlying info across state transitions', async () => {
      const sessionId = dialogEngine.startSession();

      vi.mocked(mockUnderlyingAnalyzer.validateUnderlying).mockResolvedValue({
        isValid: true,
        symbol: 'AAPL',
        name: 'Apple Inc.'
      });

      vi.mocked(mockUnderlyingAnalyzer.getUnderlyingInfo).mockResolvedValue({
        symbol: 'AAPL',
        name: 'Apple Inc.',
        currentPrice: 150.00,
        priceTimestamp: new Date(),
        change: 2.50,
        changePercent: 1.69,
        supportsOptions: true
      });

      await dialogEngine.processInput(sessionId, 'AAPL');

      vi.mocked(mockUnderlyingAnalyzer.analyzeMarketSentiment).mockResolvedValue({
        sentiment: MarketSentiment.BULLISH,
        volatility: 0.25,
        trend: 'UPTREND' as any,
        supportLevel: 145,
        resistanceLevel: 155,
        analysis: '市场呈上升趋势',
        suggestedStrategy: StrategyType.LONG_CALL
      });

      await dialogEngine.processInput(sessionId, '确认');

      const state = dialogEngine.getSessionState(sessionId);
      expect(state!.underlying).toBeDefined();
      expect(state!.underlying!.symbol).toBe('AAPL');
      expect(state!.sentiment).toBe(MarketSentiment.BULLISH);
      expect(state!.strategy).toBe(StrategyType.LONG_CALL);
    });
  });
});
