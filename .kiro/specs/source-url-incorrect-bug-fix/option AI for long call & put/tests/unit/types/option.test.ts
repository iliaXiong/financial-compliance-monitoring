import { describe, it, expect } from 'vitest';
import {
  OptionType,
  RiskLevel,
  Moneyness,
  OptionContract,
  AnalyzedContract,
  Greeks,
  GreeksParams,
  WatchlistResult
} from '../../../src/types/option';

describe('Option Types', () => {
  describe('OptionType enum', () => {
    it('should have CALL and PUT values', () => {
      expect(OptionType.CALL).toBe('看涨期权');
      expect(OptionType.PUT).toBe('看跌期权');
    });

    it('should have exactly 2 values', () => {
      const values = Object.values(OptionType);
      expect(values).toHaveLength(2);
    });
  });

  describe('RiskLevel enum', () => {
    it('should have LOW, MEDIUM, and HIGH values', () => {
      expect(RiskLevel.LOW).toBe('低风险');
      expect(RiskLevel.MEDIUM).toBe('中等风险');
      expect(RiskLevel.HIGH).toBe('高风险');
    });

    it('should have exactly 3 values', () => {
      const values = Object.values(RiskLevel);
      expect(values).toHaveLength(3);
    });
  });

  describe('Moneyness enum', () => {
    it('should have ITM, ATM, and OTM values', () => {
      expect(Moneyness.ITM).toBe('实值');
      expect(Moneyness.ATM).toBe('平值');
      expect(Moneyness.OTM).toBe('虚值');
    });

    it('should have exactly 3 values', () => {
      const values = Object.values(Moneyness);
      expect(values).toHaveLength(3);
    });
  });

  describe('OptionContract interface', () => {
    it('should accept valid option contract object', () => {
      const contract: OptionContract = {
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
        gamma: 0.03,
        theta: -0.05,
        vega: 0.15,
        impliedVolatility: 0.25,
        volume: 1000,
        openInterest: 5000,
        lastUpdate: new Date()
      };

      expect(contract.contractSymbol).toBe('AAPL240119C00150000');
      expect(contract.type).toBe(OptionType.CALL);
      expect(contract.strike).toBe(150);
    });

    it('should allow optional Greeks fields', () => {
      const contract: OptionContract = {
        contractSymbol: 'AAPL240119C00150000',
        underlyingSymbol: 'AAPL',
        type: OptionType.PUT,
        strike: 150,
        expiration: new Date('2024-01-19'),
        daysToExpiry: 30,
        premium: 5.50,
        bid: 5.45,
        ask: 5.55,
        delta: -0.48,
        impliedVolatility: 0.25,
        volume: 1000,
        openInterest: 5000,
        lastUpdate: new Date()
      };

      expect(contract.gamma).toBeUndefined();
      expect(contract.theta).toBeUndefined();
      expect(contract.vega).toBeUndefined();
    });
  });

  describe('AnalyzedContract interface', () => {
    it('should extend OptionContract with analysis fields', () => {
      const analyzedContract: AnalyzedContract = {
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
        analysis: '该合约具有良好的流动性和适中的风险',
        keyMetrics: {
          moneyness: Moneyness.ATM,
          liquidityScore: 0.8,
          costEfficiency: 0.75
        }
      };

      expect(analyzedContract.score).toBe(85);
      expect(analyzedContract.riskLevel).toBe(RiskLevel.MEDIUM);
      expect(analyzedContract.keyMetrics.moneyness).toBe(Moneyness.ATM);
    });
  });

  describe('Greeks interface', () => {
    it('should accept valid Greeks object', () => {
      const greeks: Greeks = {
        delta: 0.52,
        gamma: 0.03,
        theta: -0.05,
        vega: 0.15,
        rho: 0.02
      };

      expect(greeks.delta).toBe(0.52);
      expect(greeks.gamma).toBe(0.03);
      expect(greeks.theta).toBe(-0.05);
      expect(greeks.vega).toBe(0.15);
    });

    it('should allow optional rho field', () => {
      const greeks: Greeks = {
        delta: 0.52,
        gamma: 0.03,
        theta: -0.05,
        vega: 0.15
      };

      expect(greeks.rho).toBeUndefined();
    });
  });

  describe('GreeksParams interface', () => {
    it('should accept valid Greeks calculation parameters', () => {
      const params: GreeksParams = {
        optionType: OptionType.CALL,
        spotPrice: 150,
        strike: 155,
        timeToExpiry: 0.0833, // 30 days
        volatility: 0.25,
        riskFreeRate: 0.05
      };

      expect(params.optionType).toBe(OptionType.CALL);
      expect(params.spotPrice).toBe(150);
      expect(params.strike).toBe(155);
    });
  });

  describe('WatchlistResult interface', () => {
    it('should accept successful watchlist result', () => {
      const result: WatchlistResult = {
        success: true,
        addedCount: 3,
        message: '成功添加3个合约到自选列表'
      };

      expect(result.success).toBe(true);
      expect(result.addedCount).toBe(3);
      expect(result.failedContracts).toBeUndefined();
    });

    it('should accept failed watchlist result with error details', () => {
      const result: WatchlistResult = {
        success: false,
        addedCount: 1,
        failedContracts: ['AAPL240119C00150000', 'AAPL240119C00155000'],
        message: '部分合约添加失败'
      };

      expect(result.success).toBe(false);
      expect(result.failedContracts).toHaveLength(2);
    });
  });
});
