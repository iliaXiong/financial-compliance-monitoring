import { describe, it, expect, beforeEach } from 'vitest';
import { DefaultTradeService } from '../../../src/services/TradeService.js';
import { OptionContract, OptionType } from '../../../src/types/index.js';

describe('TradeService', () => {
  let tradeService: DefaultTradeService;
  let mockContract: OptionContract;

  beforeEach(() => {
    tradeService = new DefaultTradeService();
    
    // Create a mock contract for testing
    mockContract = {
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
  });

  describe('generateTradeLink', () => {
    it('should generate a valid trade link for a contract', () => {
      const link = tradeService.generateTradeLink(mockContract);
      
      expect(link).toBeDefined();
      expect(link).toContain('https://trade.example.com/options');
      expect(link).toContain(mockContract.contractSymbol);
      expect(link).toContain(mockContract.underlyingSymbol);
    });

    it('should include contract details in the link', () => {
      const link = tradeService.generateTradeLink(mockContract);
      
      expect(link).toContain(`symbol=${mockContract.contractSymbol}`);
      expect(link).toContain(`underlying=${mockContract.underlyingSymbol}`);
      expect(link).toContain(`strike=${mockContract.strike}`);
      expect(link).toContain(`type=${encodeURIComponent(mockContract.type)}`);
    });

    it('should generate different links for different contracts', () => {
      const contract2: OptionContract = {
        ...mockContract,
        contractSymbol: 'TSLA240119P00200000',
        underlyingSymbol: 'TSLA',
        type: OptionType.PUT,
        strike: 200
      };

      const link1 = tradeService.generateTradeLink(mockContract);
      const link2 = tradeService.generateTradeLink(contract2);
      
      expect(link1).not.toBe(link2);
      expect(link1).toContain('AAPL');
      expect(link2).toContain('TSLA');
    });
  });

  describe('addToWatchlist', () => {
    it('should add a single contract to watchlist successfully', async () => {
      const result = await tradeService.addToWatchlist('user1', [mockContract]);
      
      expect(result.success).toBe(true);
      expect(result.addedCount).toBe(1);
      expect(result.message).toContain('成功添加');
    });

    it('should add multiple contracts to watchlist', async () => {
      const contract2: OptionContract = {
        ...mockContract,
        contractSymbol: 'AAPL240119C00155000',
        strike: 155
      };
      const contract3: OptionContract = {
        ...mockContract,
        contractSymbol: 'AAPL240119C00160000',
        strike: 160
      };

      const result = await tradeService.addToWatchlist('user1', [mockContract, contract2, contract3]);
      
      expect(result.success).toBe(true);
      expect(result.addedCount).toBe(3);
    });

    it('should return error for empty userId', async () => {
      const result = await tradeService.addToWatchlist('', [mockContract]);
      
      expect(result.success).toBe(false);
      expect(result.addedCount).toBe(0);
      expect(result.message).toContain('用户ID不能为空');
    });

    it('should return error for whitespace-only userId', async () => {
      const result = await tradeService.addToWatchlist('   ', [mockContract]);
      
      expect(result.success).toBe(false);
      expect(result.addedCount).toBe(0);
    });

    it('should return error for empty contracts array', async () => {
      const result = await tradeService.addToWatchlist('user1', []);
      
      expect(result.success).toBe(false);
      expect(result.addedCount).toBe(0);
      expect(result.message).toContain('没有提供要添加的合约');
    });

    it('should handle contracts with invalid contractSymbol', async () => {
      const invalidContract: OptionContract = {
        ...mockContract,
        contractSymbol: ''
      };

      const result = await tradeService.addToWatchlist('user1', [invalidContract]);
      
      expect(result.success).toBe(false);
      expect(result.addedCount).toBe(0);
      expect(result.failedContracts).toBeDefined();
    });

    it('should handle mixed valid and invalid contracts', async () => {
      const invalidContract: OptionContract = {
        ...mockContract,
        contractSymbol: ''
      };
      const validContract: OptionContract = {
        ...mockContract,
        contractSymbol: 'AAPL240119C00155000'
      };

      const result = await tradeService.addToWatchlist('user1', [invalidContract, validContract]);
      
      expect(result.success).toBe(true);
      expect(result.addedCount).toBe(1);
      expect(result.failedContracts).toHaveLength(1);
    });

    it('should overwrite existing contract with same symbol', async () => {
      const contract1 = { ...mockContract, premium: 5.50 };
      const contract2 = { ...mockContract, premium: 6.00 };

      await tradeService.addToWatchlist('user1', [contract1]);
      await tradeService.addToWatchlist('user1', [contract2]);

      const watchlist = await tradeService.getWatchlist('user1');
      
      expect(watchlist).toHaveLength(1);
      expect(watchlist[0].premium).toBe(6.00);
    });

    it('should maintain separate watchlists for different users', async () => {
      await tradeService.addToWatchlist('user1', [mockContract]);
      
      const contract2: OptionContract = {
        ...mockContract,
        contractSymbol: 'TSLA240119P00200000'
      };
      await tradeService.addToWatchlist('user2', [contract2]);

      const watchlist1 = await tradeService.getWatchlist('user1');
      const watchlist2 = await tradeService.getWatchlist('user2');
      
      expect(watchlist1).toHaveLength(1);
      expect(watchlist2).toHaveLength(1);
      expect(watchlist1[0].contractSymbol).toBe(mockContract.contractSymbol);
      expect(watchlist2[0].contractSymbol).toBe('TSLA240119P00200000');
    });
  });

  describe('getWatchlist', () => {
    it('should return empty array for non-existent user', async () => {
      const watchlist = await tradeService.getWatchlist('nonexistent');
      
      expect(watchlist).toEqual([]);
    });

    it('should return empty array for empty userId', async () => {
      const watchlist = await tradeService.getWatchlist('');
      
      expect(watchlist).toEqual([]);
    });

    it('should return all contracts in watchlist', async () => {
      const contract2: OptionContract = {
        ...mockContract,
        contractSymbol: 'AAPL240119C00155000'
      };

      await tradeService.addToWatchlist('user1', [mockContract, contract2]);
      const watchlist = await tradeService.getWatchlist('user1');
      
      expect(watchlist).toHaveLength(2);
      expect(watchlist.map(c => c.contractSymbol)).toContain(mockContract.contractSymbol);
      expect(watchlist.map(c => c.contractSymbol)).toContain('AAPL240119C00155000');
    });

    it('should return contracts with all properties intact', async () => {
      await tradeService.addToWatchlist('user1', [mockContract]);
      const watchlist = await tradeService.getWatchlist('user1');
      
      expect(watchlist[0]).toEqual(mockContract);
      expect(watchlist[0].strike).toBe(mockContract.strike);
      expect(watchlist[0].premium).toBe(mockContract.premium);
      expect(watchlist[0].delta).toBe(mockContract.delta);
    });
  });

  describe('removeFromWatchlist', () => {
    beforeEach(async () => {
      // Add a contract to watchlist before each test
      await tradeService.addToWatchlist('user1', [mockContract]);
    });

    it('should remove contract from watchlist successfully', async () => {
      const result = await tradeService.removeFromWatchlist('user1', mockContract.contractSymbol);
      
      expect(result).toBe(true);
      
      const watchlist = await tradeService.getWatchlist('user1');
      expect(watchlist).toHaveLength(0);
    });

    it('should return false for non-existent contract', async () => {
      const result = await tradeService.removeFromWatchlist('user1', 'NONEXISTENT');
      
      expect(result).toBe(false);
    });

    it('should return false for non-existent user', async () => {
      const result = await tradeService.removeFromWatchlist('nonexistent', mockContract.contractSymbol);
      
      expect(result).toBe(false);
    });

    it('should return false for empty userId', async () => {
      const result = await tradeService.removeFromWatchlist('', mockContract.contractSymbol);
      
      expect(result).toBe(false);
    });

    it('should return false for empty contractSymbol', async () => {
      const result = await tradeService.removeFromWatchlist('user1', '');
      
      expect(result).toBe(false);
    });

    it('should only remove specified contract', async () => {
      const contract2: OptionContract = {
        ...mockContract,
        contractSymbol: 'AAPL240119C00155000'
      };
      await tradeService.addToWatchlist('user1', [contract2]);

      await tradeService.removeFromWatchlist('user1', mockContract.contractSymbol);
      
      const watchlist = await tradeService.getWatchlist('user1');
      expect(watchlist).toHaveLength(1);
      expect(watchlist[0].contractSymbol).toBe('AAPL240119C00155000');
    });

    it('should not affect other users watchlists', async () => {
      await tradeService.addToWatchlist('user2', [mockContract]);
      
      await tradeService.removeFromWatchlist('user1', mockContract.contractSymbol);
      
      const watchlist2 = await tradeService.getWatchlist('user2');
      expect(watchlist2).toHaveLength(1);
    });
  });

  describe('Integration - Watchlist round-trip consistency', () => {
    it('should maintain contract data through add and get operations', async () => {
      // Add contract
      const addResult = await tradeService.addToWatchlist('user1', [mockContract]);
      expect(addResult.success).toBe(true);

      // Retrieve watchlist
      const watchlist = await tradeService.getWatchlist('user1');
      
      // Verify contract is present and unchanged
      expect(watchlist).toHaveLength(1);
      expect(watchlist[0]).toEqual(mockContract);
    });

    it('should handle complete workflow: add, get, remove, verify', async () => {
      // Add
      await tradeService.addToWatchlist('user1', [mockContract]);
      
      // Get
      let watchlist = await tradeService.getWatchlist('user1');
      expect(watchlist).toHaveLength(1);
      
      // Remove
      const removed = await tradeService.removeFromWatchlist('user1', mockContract.contractSymbol);
      expect(removed).toBe(true);
      
      // Verify empty
      watchlist = await tradeService.getWatchlist('user1');
      expect(watchlist).toHaveLength(0);
    });
  });
});
