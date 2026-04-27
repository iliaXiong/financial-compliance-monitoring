import { describe, it, expect } from 'vitest';
import {
  DialogState,
  type SessionId,
  type DialogResponse,
  type DialogHistoryEntry,
  type SessionState,
  type DialogEngine,
  type StateManager
} from '../../../src/types/dialog.js';
import { MarketSentiment, StrategyType } from '../../../src/types/market.js';
import { OptionType } from '../../../src/types/option.js';

describe('Dialog Types', () => {
  describe('DialogState enum', () => {
    it('should have all required states', () => {
      expect(DialogState.AWAITING_UNDERLYING).toBe('AWAITING_UNDERLYING');
      expect(DialogState.CONFIRMING_UNDERLYING).toBe('CONFIRMING_UNDERLYING');
      expect(DialogState.ANALYZING_UNDERLYING).toBe('ANALYZING_UNDERLYING');
      expect(DialogState.SUGGESTING_STRATEGY).toBe('SUGGESTING_STRATEGY');
      expect(DialogState.ANALYZING_OPTIONS).toBe('ANALYZING_OPTIONS');
      expect(DialogState.PRESENTING_CONTRACTS).toBe('PRESENTING_CONTRACTS');
      expect(DialogState.AWAITING_SELECTION).toBe('AWAITING_SELECTION');
      expect(DialogState.GENERATING_TRADE_LINK).toBe('GENERATING_TRADE_LINK');
      expect(DialogState.COMPLETED).toBe('COMPLETED');
    });
  });

  describe('DialogResponse interface', () => {
    it('should create valid DialogResponse with required fields', () => {
      const response: DialogResponse = {
        message: '请输入您想要分析的标的代码或名称',
        state: DialogState.AWAITING_UNDERLYING
      };

      expect(response.message).toBeDefined();
      expect(response.state).toBe(DialogState.AWAITING_UNDERLYING);
    });

    it('should create DialogResponse with optional fields', () => {
      const response: DialogResponse = {
        message: '请选择策略',
        state: DialogState.SUGGESTING_STRATEGY,
        options: ['Long Call', 'Long Put'],
        data: { sentiment: MarketSentiment.BULLISH }
      };

      expect(response.options).toHaveLength(2);
      expect(response.data).toBeDefined();
    });
  });

  describe('DialogHistoryEntry interface', () => {
    it('should create valid history entry', () => {
      const entry: DialogHistoryEntry = {
        timestamp: new Date(),
        role: 'user',
        content: 'AAPL',
        state: DialogState.AWAITING_UNDERLYING
      };

      expect(entry.role).toBe('user');
      expect(entry.content).toBe('AAPL');
      expect(entry.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('SessionState interface', () => {
    it('should create minimal SessionState', () => {
      const state: SessionState = {
        sessionId: 'test-session-123',
        currentState: DialogState.AWAITING_UNDERLYING,
        history: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(state.sessionId).toBe('test-session-123');
      expect(state.currentState).toBe(DialogState.AWAITING_UNDERLYING);
      expect(state.history).toEqual([]);
    });

    it('should create complete SessionState with all optional fields', () => {
      const now = new Date();
      const state: SessionState = {
        sessionId: 'test-session-456',
        currentState: DialogState.PRESENTING_CONTRACTS,
        underlying: {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          nameCn: '苹果公司',
          currentPrice: 150.00,
          priceTimestamp: now,
          change: 2.50,
          changePercent: 1.69,
          supportsOptions: true
        },
        sentiment: MarketSentiment.BULLISH,
        strategy: StrategyType.LONG_CALL,
        analyzedContracts: [{
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
          lastUpdate: now,
          score: 85,
          riskLevel: 'LOW' as any,
          analysis: '推荐合约',
          keyMetrics: {
            moneyness: 'ATM' as any,
            liquidityScore: 0.8,
            costEfficiency: 0.75
          }
        }],
        selectedContracts: [],
        history: [
          {
            timestamp: now,
            role: 'user',
            content: 'AAPL',
            state: DialogState.AWAITING_UNDERLYING
          }
        ],
        createdAt: now,
        updatedAt: now
      };

      expect(state.underlying?.symbol).toBe('AAPL');
      expect(state.sentiment).toBe(MarketSentiment.BULLISH);
      expect(state.strategy).toBe(StrategyType.LONG_CALL);
      expect(state.analyzedContracts).toHaveLength(1);
      expect(state.history).toHaveLength(1);
    });
  });

  describe('Type compatibility', () => {
    it('should allow SessionId as string', () => {
      const sessionId: SessionId = 'session-123';
      expect(typeof sessionId).toBe('string');
    });

    it('should enforce DialogHistoryEntry role values', () => {
      const userEntry: DialogHistoryEntry = {
        timestamp: new Date(),
        role: 'user',
        content: 'test',
        state: DialogState.AWAITING_UNDERLYING
      };

      const systemEntry: DialogHistoryEntry = {
        timestamp: new Date(),
        role: 'system',
        content: 'response',
        state: DialogState.AWAITING_UNDERLYING
      };

      expect(userEntry.role).toBe('user');
      expect(systemEntry.role).toBe('system');
    });
  });
});
