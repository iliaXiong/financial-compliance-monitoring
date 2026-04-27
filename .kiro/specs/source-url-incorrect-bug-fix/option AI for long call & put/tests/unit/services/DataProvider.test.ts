import { describe, it, expect, beforeEach } from 'vitest';
import { MockDataProvider } from '../../../src/services/DataProvider.js';
import { OptionType, TimePeriod } from '../../../src/types/index.js';

describe('DataProvider - MockDataProvider', () => {
  let provider: MockDataProvider;

  beforeEach(() => {
    provider = new MockDataProvider();
    provider.resetFailureSimulation();
  });

  describe('searchUnderlying', () => {
    it('should find underlying by stock symbol', async () => {
      const results = await provider.searchUnderlying('AAPL');
      
      expect(results).toHaveLength(1);
      expect(results[0].symbol).toBe('AAPL');
      expect(results[0].name).toContain('Apple');
    });

    it('should find underlying by Chinese name', async () => {
      const results = await provider.searchUnderlying('苹果');
      
      expect(results).toHaveLength(1);
      expect(results[0].symbol).toBe('AAPL');
    });

    it('should find underlying by partial match', async () => {
      const results = await provider.searchUnderlying('app');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].symbol).toBe('AAPL');
    });

    it('should return empty array for non-existent underlying', async () => {
      const results = await provider.searchUnderlying('NONEXISTENT');
      
      expect(results).toEqual([]);
    });

    it('should handle empty input', async () => {
      const results = await provider.searchUnderlying('');
      
      expect(Array.isArray(results)).toBe(true);
    });

    it('should be case-insensitive', async () => {
      const results1 = await provider.searchUnderlying('aapl');
      const results2 = await provider.searchUnderlying('AAPL');
      
      expect(results1).toEqual(results2);
    });

    it('should not return duplicate results', async () => {
      const results = await provider.searchUnderlying('apple');
      
      const symbols = results.map(r => r.symbol);
      const uniqueSymbols = [...new Set(symbols)];
      expect(symbols).toEqual(uniqueSymbols);
    });
  });

  describe('getCurrentPrice', () => {
    it('should return current price for valid symbol', async () => {
      const price = await provider.getCurrentPrice('AAPL');
      
      expect(price.symbol).toBe('AAPL');
      expect(price.price).toBeGreaterThan(0);
      expect(price.timestamp).toBeInstanceOf(Date);
      expect(typeof price.change).toBe('number');
      expect(typeof price.changePercent).toBe('number');
    });

    it('should update timestamp to current time', async () => {
      const before = new Date();
      const price = await provider.getCurrentPrice('AAPL');
      const after = new Date();
      
      expect(price.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(price.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should throw DataError for non-existent symbol', async () => {
      await expect(provider.getCurrentPrice('INVALID')).rejects.toMatchObject({
        type: 'DATA_ERROR',
        source: 'getCurrentPrice'
      });
    });

    it('should be case-insensitive', async () => {
      const price1 = await provider.getCurrentPrice('aapl');
      const price2 = await provider.getCurrentPrice('AAPL');
      
      expect(price1.symbol).toBe(price2.symbol);
      expect(price1.price).toBe(price2.price);
    });
  });

  describe('getHistoricalPrices', () => {
    it('should return historical prices for valid symbol', async () => {
      const prices = await provider.getHistoricalPrices('AAPL', TimePeriod.ONE_MONTH);
      
      expect(Array.isArray(prices)).toBe(true);
      expect(prices.length).toBeGreaterThan(0);
      expect(prices.length).toBeLessThanOrEqual(30);
    });

    it('should return prices with all required fields', async () => {
      const prices = await provider.getHistoricalPrices('AAPL', TimePeriod.ONE_WEEK);
      
      prices.forEach(price => {
        expect(price.symbol).toBe('AAPL');
        expect(typeof price.price).toBe('number');
        expect(price.timestamp).toBeInstanceOf(Date);
        expect(typeof price.change).toBe('number');
        expect(typeof price.changePercent).toBe('number');
      });
    });

    it('should return prices in chronological order', async () => {
      const prices = await provider.getHistoricalPrices('AAPL', TimePeriod.ONE_MONTH);
      
      for (let i = 1; i < prices.length; i++) {
        expect(prices[i].timestamp.getTime()).toBeGreaterThanOrEqual(
          prices[i - 1].timestamp.getTime()
        );
      }
    });

    it('should filter by time period correctly', async () => {
      const oneWeek = await provider.getHistoricalPrices('AAPL', TimePeriod.ONE_WEEK);
      const oneMonth = await provider.getHistoricalPrices('AAPL', TimePeriod.ONE_MONTH);
      
      expect(oneWeek.length).toBeLessThanOrEqual(7);
      expect(oneMonth.length).toBeLessThanOrEqual(30);
      expect(oneMonth.length).toBeGreaterThanOrEqual(oneWeek.length);
    });

    it('should throw DataError for non-existent symbol', async () => {
      await expect(
        provider.getHistoricalPrices('INVALID', TimePeriod.ONE_MONTH)
      ).rejects.toMatchObject({
        type: 'DATA_ERROR',
        source: 'getHistoricalPrices'
      });
    });
  });

  describe('getOptionChain', () => {
    it('should return option chain for valid symbol', async () => {
      const contracts = await provider.getOptionChain('AAPL');
      
      expect(Array.isArray(contracts)).toBe(true);
      expect(contracts.length).toBeGreaterThan(0);
    });

    it('should return both CALL and PUT when no type specified', async () => {
      const contracts = await provider.getOptionChain('AAPL');
      
      const calls = contracts.filter(c => c.type === OptionType.CALL);
      const puts = contracts.filter(c => c.type === OptionType.PUT);
      
      expect(calls.length).toBeGreaterThan(0);
      expect(puts.length).toBeGreaterThan(0);
    });

    it('should return only CALL options when specified', async () => {
      const contracts = await provider.getOptionChain('AAPL', OptionType.CALL);
      
      expect(contracts.every(c => c.type === OptionType.CALL)).toBe(true);
    });

    it('should return only PUT options when specified', async () => {
      const contracts = await provider.getOptionChain('AAPL', OptionType.PUT);
      
      expect(contracts.every(c => c.type === OptionType.PUT)).toBe(true);
    });

    it('should return contracts with all required fields', async () => {
      const contracts = await provider.getOptionChain('AAPL', OptionType.CALL);
      
      contracts.forEach(contract => {
        expect(contract.contractSymbol).toBeDefined();
        expect(contract.underlyingSymbol).toBe('AAPL');
        expect(contract.type).toBe(OptionType.CALL);
        expect(typeof contract.strike).toBe('number');
        expect(contract.expiration).toBeInstanceOf(Date);
        expect(typeof contract.daysToExpiry).toBe('number');
        expect(typeof contract.premium).toBe('number');
        expect(typeof contract.bid).toBe('number');
        expect(typeof contract.ask).toBe('number');
        expect(typeof contract.delta).toBe('number');
        expect(typeof contract.impliedVolatility).toBe('number');
        expect(typeof contract.volume).toBe('number');
        expect(typeof contract.openInterest).toBe('number');
        expect(contract.lastUpdate).toBeInstanceOf(Date);
      });
    });

    it('should update timestamps to current time', async () => {
      const before = new Date();
      const contracts = await provider.getOptionChain('AAPL', OptionType.CALL);
      const after = new Date();
      
      contracts.forEach(contract => {
        expect(contract.lastUpdate.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(contract.lastUpdate.getTime()).toBeLessThanOrEqual(after.getTime());
      });
    });

    it('should throw DataError for symbol that does not support options', async () => {
      // Add a mock underlying that doesn't support options
      provider.addMockUnderlying({
        symbol: 'NOOPT',
        name: 'No Options Inc.',
        currentPrice: 100,
        priceTimestamp: new Date(),
        change: 0,
        changePercent: 0,
        supportsOptions: false
      });

      await expect(
        provider.getOptionChain('NOOPT', OptionType.CALL)
      ).rejects.toMatchObject({
        type: 'DATA_ERROR',
        source: 'getOptionChain'
      });
    });

    it('should include multiple expiration dates', async () => {
      const contracts = await provider.getOptionChain('AAPL', OptionType.CALL);
      
      const expirations = new Set(contracts.map(c => c.expiration.toISOString()));
      expect(expirations.size).toBeGreaterThan(1);
    });

    it('should include multiple strike prices', async () => {
      const contracts = await provider.getOptionChain('AAPL', OptionType.CALL);
      
      const strikes = new Set(contracts.map(c => c.strike));
      expect(strikes.size).toBeGreaterThan(1);
    });
  });

  describe('supportsOptions', () => {
    it('should return true for symbols that support options', async () => {
      const supports = await provider.supportsOptions('AAPL');
      
      expect(supports).toBe(true);
    });

    it('should return false for non-existent symbols', async () => {
      const supports = await provider.supportsOptions('INVALID');
      
      expect(supports).toBe(false);
    });

    it('should be case-insensitive', async () => {
      const supports1 = await provider.supportsOptions('aapl');
      const supports2 = await provider.supportsOptions('AAPL');
      
      expect(supports1).toBe(supports2);
    });
  });

  describe('Retry Logic', () => {
    it('should retry on failure and eventually succeed', async () => {
      provider.simulateFailure(2); // Fail twice, then succeed
      
      const price = await provider.getCurrentPrice('AAPL');
      
      expect(price.symbol).toBe('AAPL');
    });

    it('should throw DataError after max retries exceeded', async () => {
      provider.simulateFailure(10); // Fail more than max retries
      
      await expect(provider.getCurrentPrice('AAPL')).rejects.toMatchObject({
        type: 'DATA_ERROR',
        retryable: true
      });
    });

    it('should apply exponential backoff between retries', async () => {
      provider.simulateFailure(2);
      
      const start = Date.now();
      await provider.getCurrentPrice('AAPL');
      const duration = Date.now() - start;
      
      // Should take at least 1000ms (first retry) + 2000ms (second retry) = 3000ms
      // Allow some margin for execution time
      expect(duration).toBeGreaterThan(2500);
    });
  });

  describe('Error Handling', () => {
    it('should return structured DataError on failure', async () => {
      try {
        await provider.getCurrentPrice('INVALID');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.type).toBe('DATA_ERROR');
        expect(error.source).toBeDefined();
        expect(error.message).toBeDefined();
        expect(typeof error.retryable).toBe('boolean');
        expect(typeof error.fallbackAvailable).toBe('boolean');
      }
    });

    it('should include descriptive error messages', async () => {
      try {
        await provider.getCurrentPrice('INVALID');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('INVALID');
      }
    });
  });

  describe('Helper Methods', () => {
    it('should allow adding custom mock underlying', async () => {
      const customAsset = {
        symbol: 'CUSTOM',
        name: 'Custom Corp',
        currentPrice: 100,
        priceTimestamp: new Date(),
        change: 1,
        changePercent: 1,
        supportsOptions: true
      };

      provider.addMockUnderlying(customAsset);
      
      const results = await provider.searchUnderlying('CUSTOM');
      expect(results).toHaveLength(1);
      expect(results[0].symbol).toBe('CUSTOM');
    });

    it('should allow adding custom mock price', async () => {
      const customPrice = {
        symbol: 'AAPL',
        price: 999.99,
        timestamp: new Date(),
        change: 10,
        changePercent: 1
      };

      provider.addMockPrice('AAPL', customPrice);
      
      const price = await provider.getCurrentPrice('AAPL');
      expect(price.price).toBe(999.99);
    });
  });
});
