// Unit tests for OptionAnalyzer

import { describe, it, expect, beforeEach } from 'vitest';
import { DefaultOptionAnalyzer } from '../../../src/analyzers/OptionAnalyzer.js';
import { MockDataProvider } from '../../../src/services/DataProvider.js';
import { BlackScholesGreeksCalculator } from '../../../src/calculators/GreeksCalculator.js';
import {
  StrategyType,
  OptionType,
  MarketSentiment,
  Moneyness,
  RiskLevel,
  UnderlyingAsset,
  OptionContract
} from '../../../src/types/index.js';

describe('OptionAnalyzer', () => {
  let analyzer: DefaultOptionAnalyzer;
  let dataProvider: MockDataProvider;
  let greeksCalculator: BlackScholesGreeksCalculator;

  beforeEach(() => {
    dataProvider = new MockDataProvider();
    greeksCalculator = new BlackScholesGreeksCalculator();
    analyzer = new DefaultOptionAnalyzer(dataProvider, greeksCalculator);
  });

  describe('getOptionChain', () => {
    it('should return only CALL options for Long Call strategy', async () => {
      const contracts = await analyzer.getOptionChain('AAPL', StrategyType.LONG_CALL);

      expect(contracts.length).toBeGreaterThan(0);
      contracts.forEach(contract => {
        expect(contract.type).toBe(OptionType.CALL);
      });
    });

    it('should return only PUT options for Long Put strategy', async () => {
      const contracts = await analyzer.getOptionChain('AAPL', StrategyType.LONG_PUT);

      expect(contracts.length).toBeGreaterThan(0);
      contracts.forEach(contract => {
        expect(contract.type).toBe(OptionType.PUT);
      });
    });

    it('should return contracts for valid underlying symbol', async () => {
      const contracts = await analyzer.getOptionChain('TSLA', StrategyType.LONG_CALL);

      expect(contracts.length).toBeGreaterThan(0);
      contracts.forEach(contract => {
        expect(contract.underlyingSymbol).toBe('TSLA');
      });
    });

    it('should throw error for underlying that does not support options', async () => {
      await expect(
        analyzer.getOptionChain('INVALID', StrategyType.LONG_CALL)
      ).rejects.toThrow();
    });
  });

  describe('analyzeContracts', () => {
    let underlying: UnderlyingAsset;
    let contracts: OptionContract[];

    beforeEach(async () => {
      underlying = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        nameCn: '苹果公司',
        currentPrice: 175.50,
        priceTimestamp: new Date(),
        change: 2.50,
        changePercent: 1.44,
        supportsOptions: true
      };

      contracts = await dataProvider.getOptionChain('AAPL', OptionType.CALL);
    });

    it('should return analyzed contracts with all required fields', async () => {
      const analyzed = await analyzer.analyzeContracts(
        contracts.slice(0, 3),
        underlying,
        MarketSentiment.BULLISH
      );

      expect(analyzed.length).toBe(3);
      analyzed.forEach(contract => {
        // Check all OptionContract fields
        expect(contract.contractSymbol).toBeDefined();
        expect(contract.strike).toBeGreaterThan(0);
        expect(contract.expiration).toBeInstanceOf(Date);
        expect(contract.premium).toBeGreaterThan(0);
        expect(contract.impliedVolatility).toBeGreaterThan(0);
        expect(contract.delta).toBeDefined();

        // Check AnalyzedContract specific fields
        expect(contract.score).toBeGreaterThanOrEqual(0);
        expect(contract.score).toBeLessThanOrEqual(100);
        expect(contract.riskLevel).toBeDefined();
        expect(contract.analysis).toBeDefined();
        expect(contract.analysis.length).toBeGreaterThan(0);

        // Check keyMetrics
        expect(contract.keyMetrics).toBeDefined();
        expect(contract.keyMetrics.moneyness).toBeDefined();
        expect(contract.keyMetrics.liquidityScore).toBeGreaterThanOrEqual(0);
        expect(contract.keyMetrics.liquidityScore).toBeLessThanOrEqual(100);
        expect(contract.keyMetrics.costEfficiency).toBeGreaterThanOrEqual(0);
        expect(contract.keyMetrics.costEfficiency).toBeLessThanOrEqual(100);
      });
    });

    it('should calculate Greeks for each contract', async () => {
      const analyzed = await analyzer.analyzeContracts(
        contracts.slice(0, 3),
        underlying,
        MarketSentiment.BULLISH
      );

      analyzed.forEach(contract => {
        expect(contract.delta).toBeDefined();
        expect(contract.gamma).toBeDefined();
        expect(contract.theta).toBeDefined();
        expect(contract.vega).toBeDefined();
      });
    });

    it('should calculate moneyness correctly for CALL options', async () => {
      const testContracts: OptionContract[] = [
        {
          ...contracts[0],
          type: OptionType.CALL,
          strike: 160, // ITM (spot = 175.50)
          daysToExpiry: 30
        },
        {
          ...contracts[0],
          type: OptionType.CALL,
          strike: 175, // ATM
          daysToExpiry: 30
        },
        {
          ...contracts[0],
          type: OptionType.CALL,
          strike: 190, // OTM
          daysToExpiry: 30
        }
      ];

      const analyzed = await analyzer.analyzeContracts(
        testContracts,
        underlying,
        MarketSentiment.BULLISH
      );

      expect(analyzed[0].keyMetrics.moneyness).toBe(Moneyness.ITM);
      expect(analyzed[1].keyMetrics.moneyness).toBe(Moneyness.ATM);
      expect(analyzed[2].keyMetrics.moneyness).toBe(Moneyness.OTM);
    });

    it('should calculate moneyness correctly for PUT options', async () => {
      const testContracts: OptionContract[] = [
        {
          ...contracts[0],
          type: OptionType.PUT,
          strike: 190, // ITM (spot = 175.50)
          daysToExpiry: 30
        },
        {
          ...contracts[0],
          type: OptionType.PUT,
          strike: 175, // ATM
          daysToExpiry: 30
        },
        {
          ...contracts[0],
          type: OptionType.PUT,
          strike: 160, // OTM
          daysToExpiry: 30
        }
      ];

      const analyzed = await analyzer.analyzeContracts(
        testContracts,
        underlying,
        MarketSentiment.BEARISH
      );

      expect(analyzed[0].keyMetrics.moneyness).toBe(Moneyness.ITM);
      expect(analyzed[1].keyMetrics.moneyness).toBe(Moneyness.ATM);
      expect(analyzed[2].keyMetrics.moneyness).toBe(Moneyness.OTM);
    });

    it('should calculate higher liquidity score for high volume and open interest', async () => {
      const highLiquidityContract: OptionContract = {
        ...contracts[0],
        volume: 10000,
        openInterest: 50000,
        daysToExpiry: 30
      };

      const lowLiquidityContract: OptionContract = {
        ...contracts[0],
        volume: 10,
        openInterest: 50,
        daysToExpiry: 30
      };

      const analyzed = await analyzer.analyzeContracts(
        [highLiquidityContract, lowLiquidityContract],
        underlying,
        MarketSentiment.BULLISH
      );

      expect(analyzed[0].keyMetrics.liquidityScore).toBeGreaterThan(
        analyzed[1].keyMetrics.liquidityScore
      );
    });

    it('should assign HIGH risk level to low liquidity contracts', async () => {
      const lowLiquidityContract: OptionContract = {
        ...contracts[0],
        volume: 0,
        openInterest: 0,
        daysToExpiry: 5,
        impliedVolatility: 0.8
      };

      const analyzed = await analyzer.analyzeContracts(
        [lowLiquidityContract],
        underlying,
        MarketSentiment.BULLISH
      );

      expect(analyzed[0].riskLevel).toBe(RiskLevel.HIGH);
    });

    it('should assign LOW risk level to good liquidity and moderate time contracts', async () => {
      const goodContract: OptionContract = {
        ...contracts[0],
        volume: 5000,
        openInterest: 25000,
        daysToExpiry: 60,
        impliedVolatility: 0.25
      };

      const analyzed = await analyzer.analyzeContracts(
        [goodContract],
        underlying,
        MarketSentiment.BULLISH
      );

      expect(analyzed[0].riskLevel).toBe(RiskLevel.LOW);
    });

    it('should handle contracts with zero premium gracefully', async () => {
      const zeroPremiumContract: OptionContract = {
        ...contracts[0],
        premium: 0,
        delta: 0.5,
        daysToExpiry: 30
      };

      const analyzed = await analyzer.analyzeContracts(
        [zeroPremiumContract],
        underlying,
        MarketSentiment.BULLISH
      );

      expect(analyzed[0].keyMetrics.costEfficiency).toBe(0);
    });

    it('should handle contracts with zero delta gracefully', async () => {
      const zeroDeltaContract: OptionContract = {
        ...contracts[0],
        premium: 5.0,
        delta: 0,
        daysToExpiry: 30
      };

      const analyzed = await analyzer.analyzeContracts(
        [zeroDeltaContract],
        underlying,
        MarketSentiment.BULLISH
      );

      expect(analyzed[0].keyMetrics.costEfficiency).toBe(0);
    });

    it('should generate meaningful analysis text', async () => {
      const analyzed = await analyzer.analyzeContracts(
        contracts.slice(0, 1),
        underlying,
        MarketSentiment.BULLISH
      );

      const analysis = analyzed[0].analysis;
      expect(analysis).toContain('期权');
      expect(analysis.length).toBeGreaterThan(10);
    });
  });

  describe('rankContracts', () => {
    let underlying: UnderlyingAsset;
    let contracts: OptionContract[];

    beforeEach(async () => {
      underlying = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        currentPrice: 175.50,
        priceTimestamp: new Date(),
        change: 2.50,
        changePercent: 1.44,
        supportsOptions: true
      };

      contracts = await dataProvider.getOptionChain('AAPL', OptionType.CALL);
    });

    it('should return contracts sorted by score in descending order', async () => {
      const analyzed = await analyzer.analyzeContracts(
        contracts.slice(0, 10),
        underlying,
        MarketSentiment.BULLISH
      );

      const ranked = analyzer.rankContracts(analyzed);

      for (let i = 0; i < ranked.length - 1; i++) {
        expect(ranked[i].score).toBeGreaterThanOrEqual(ranked[i + 1].score);
      }
    });

    it('should not modify the original array', async () => {
      const analyzed = await analyzer.analyzeContracts(
        contracts.slice(0, 5),
        underlying,
        MarketSentiment.BULLISH
      );

      const originalScores = analyzed.map(c => c.score);
      const ranked = analyzer.rankContracts(analyzed);

      // Original array should remain unchanged
      expect(analyzed.map(c => c.score)).toEqual(originalScores);
      
      // Ranked array should be sorted
      const rankedScores = ranked.map(c => c.score);
      const sortedScores = [...rankedScores].sort((a, b) => b - a);
      expect(rankedScores).toEqual(sortedScores);
    });

    it('should handle empty array', () => {
      const ranked = analyzer.rankContracts([]);
      expect(ranked).toEqual([]);
    });

    it('should handle single contract', async () => {
      const analyzed = await analyzer.analyzeContracts(
        contracts.slice(0, 1),
        underlying,
        MarketSentiment.BULLISH
      );

      const ranked = analyzer.rankContracts(analyzed);
      expect(ranked.length).toBe(1);
      expect(ranked[0]).toEqual(analyzed[0]);
    });

    it('should maintain all contract properties after ranking', async () => {
      const analyzed = await analyzer.analyzeContracts(
        contracts.slice(0, 3),
        underlying,
        MarketSentiment.BULLISH
      );

      const ranked = analyzer.rankContracts(analyzed);

      ranked.forEach(contract => {
        expect(contract.contractSymbol).toBeDefined();
        expect(contract.score).toBeDefined();
        expect(contract.keyMetrics).toBeDefined();
        expect(contract.analysis).toBeDefined();
      });
    });
  });

  describe('Edge Cases', () => {
    let underlying: UnderlyingAsset;

    beforeEach(() => {
      underlying = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        currentPrice: 175.50,
        priceTimestamp: new Date(),
        change: 2.50,
        changePercent: 1.44,
        supportsOptions: true
      };
    });

    it('should handle contracts expiring today', async () => {
      const today = new Date();
      const contract: OptionContract = {
        contractSymbol: 'AAPL240101C00175000',
        underlyingSymbol: 'AAPL',
        type: OptionType.CALL,
        strike: 175,
        expiration: today,
        daysToExpiry: 0,
        premium: 2.5,
        bid: 2.45,
        ask: 2.55,
        delta: 0.5,
        impliedVolatility: 0.3,
        volume: 0, // Low liquidity
        openInterest: 0, // Low liquidity
        lastUpdate: new Date()
      };

      const analyzed = await analyzer.analyzeContracts(
        [contract],
        underlying,
        MarketSentiment.BULLISH
      );

      expect(analyzed[0].daysToExpiry).toBe(0);
      expect(analyzed[0].riskLevel).toBe(RiskLevel.HIGH);
    });

    it('should handle very high implied volatility', async () => {
      const contract: OptionContract = {
        contractSymbol: 'AAPL240101C00175000',
        underlyingSymbol: 'AAPL',
        type: OptionType.CALL,
        strike: 175,
        expiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        daysToExpiry: 30,
        premium: 10.0,
        bid: 9.95,
        ask: 10.05,
        delta: 0.5,
        impliedVolatility: 1.5, // Very high IV
        volume: 0, // Low liquidity
        openInterest: 0, // Low liquidity
        lastUpdate: new Date()
      };

      const analyzed = await analyzer.analyzeContracts(
        [contract],
        underlying,
        MarketSentiment.BULLISH
      );

      expect(analyzed[0].impliedVolatility).toBe(1.5);
      expect(analyzed[0].riskLevel).toBe(RiskLevel.HIGH);
    });

    it('should handle empty contracts array', async () => {
      const analyzed = await analyzer.analyzeContracts(
        [],
        underlying,
        MarketSentiment.BULLISH
      );

      expect(analyzed).toEqual([]);
    });

    it('should handle contracts with very long expiration', async () => {
      const farFuture = new Date();
      farFuture.setFullYear(farFuture.getFullYear() + 2);

      const contract: OptionContract = {
        contractSymbol: 'AAPL260101C00175000',
        underlyingSymbol: 'AAPL',
        type: OptionType.CALL,
        strike: 175,
        expiration: farFuture,
        daysToExpiry: 730,
        premium: 25.0,
        bid: 24.95,
        ask: 25.05,
        delta: 0.5,
        impliedVolatility: 0.3,
        volume: 100,
        openInterest: 500,
        lastUpdate: new Date()
      };

      const analyzed = await analyzer.analyzeContracts(
        [contract],
        underlying,
        MarketSentiment.BULLISH
      );

      expect(analyzed[0].daysToExpiry).toBe(730);
      expect(analyzed[0].analysis).toContain('长期合约');
    });
  });

  describe('Integration', () => {
    it('should complete full workflow: get chain -> analyze -> rank', async () => {
      const underlying: UnderlyingAsset = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        currentPrice: 175.50,
        priceTimestamp: new Date(),
        change: 2.50,
        changePercent: 1.44,
        supportsOptions: true
      };

      // Step 1: Get option chain
      const contracts = await analyzer.getOptionChain('AAPL', StrategyType.LONG_CALL);
      expect(contracts.length).toBeGreaterThan(0);

      // Step 2: Analyze contracts
      const analyzed = await analyzer.analyzeContracts(
        contracts.slice(0, 10),
        underlying,
        MarketSentiment.BULLISH
      );
      expect(analyzed.length).toBe(10);

      // Step 3: Rank contracts
      const ranked = analyzer.rankContracts(analyzed);
      expect(ranked.length).toBe(10);

      // Verify ranking
      for (let i = 0; i < ranked.length - 1; i++) {
        expect(ranked[i].score).toBeGreaterThanOrEqual(ranked[i + 1].score);
      }
    });
  });
});
