// Trade Service - Generates trade links and manages watchlists

import { OptionContract, WatchlistResult } from '../types/index.js';

export interface TradeService {
  generateTradeLink(contract: OptionContract): string;
  addToWatchlist(userId: string, contracts: OptionContract[]): Promise<WatchlistResult>;
  getWatchlist(userId: string): Promise<OptionContract[]>;
  removeFromWatchlist(userId: string, contractSymbol: string): Promise<boolean>;
}

/**
 * Default implementation of TradeService
 * Manages trade link generation and watchlist operations with in-memory persistence
 */
export class DefaultTradeService implements TradeService {
  // In-memory storage for watchlists, keyed by userId
  private watchlists: Map<string, Map<string, OptionContract>> = new Map();

  /**
   * Generates a trade link for an option contract
   * Currently returns a mock URL - can be replaced with actual broker integration
   * 
   * @param contract - The option contract to generate a link for
   * @returns A trade link URL string
   */
  generateTradeLink(contract: OptionContract): string {
    // Generate mock trade link with contract details
    // Format: https://trade.example.com/options?symbol={contractSymbol}&underlying={underlyingSymbol}
    const baseUrl = 'https://trade.example.com/options';
    const params = new URLSearchParams({
      symbol: contract.contractSymbol,
      underlying: contract.underlyingSymbol,
      type: contract.type,
      strike: contract.strike.toString(),
      expiration: contract.expiration.toISOString().split('T')[0]
    });
    
    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Adds one or more contracts to a user's watchlist
   * Supports batch operations for multiple contracts
   * 
   * @param userId - The user identifier
   * @param contracts - Array of contracts to add
   * @returns WatchlistResult with success status and counts
   */
  async addToWatchlist(userId: string, contracts: OptionContract[]): Promise<WatchlistResult> {
    // Validate inputs
    if (!userId || userId.trim() === '') {
      return {
        success: false,
        addedCount: 0,
        failedContracts: contracts.map(c => c.contractSymbol),
        message: '用户ID不能为空'
      };
    }

    if (!contracts || contracts.length === 0) {
      return {
        success: false,
        addedCount: 0,
        message: '没有提供要添加的合约'
      };
    }

    // Get or create user's watchlist
    if (!this.watchlists.has(userId)) {
      this.watchlists.set(userId, new Map());
    }
    const userWatchlist = this.watchlists.get(userId)!;

    // Add contracts to watchlist
    let addedCount = 0;
    const failedContracts: string[] = [];

    for (const contract of contracts) {
      try {
        // Validate contract has required fields
        if (!contract.contractSymbol || contract.contractSymbol.trim() === '') {
          failedContracts.push(contract.contractSymbol || 'unknown');
          continue;
        }

        // Add to watchlist (overwrites if already exists)
        userWatchlist.set(contract.contractSymbol, contract);
        addedCount++;
      } catch (error) {
        failedContracts.push(contract.contractSymbol);
      }
    }

    // Build result
    const success = addedCount > 0;
    const message = success
      ? `成功添加 ${addedCount} 个合约到自选列表${failedContracts.length > 0 ? `，${failedContracts.length} 个失败` : ''}`
      : '添加失败';

    return {
      success,
      addedCount,
      failedContracts: failedContracts.length > 0 ? failedContracts : undefined,
      message
    };
  }

  /**
   * Retrieves all contracts in a user's watchlist
   * 
   * @param userId - The user identifier
   * @returns Array of contracts in the watchlist
   */
  async getWatchlist(userId: string): Promise<OptionContract[]> {
    // Validate userId
    if (!userId || userId.trim() === '') {
      return [];
    }

    // Get user's watchlist
    const userWatchlist = this.watchlists.get(userId);
    if (!userWatchlist) {
      return [];
    }

    // Return all contracts as array
    return Array.from(userWatchlist.values());
  }

  /**
   * Removes a contract from a user's watchlist
   * 
   * @param userId - The user identifier
   * @param contractSymbol - The contract symbol to remove
   * @returns true if removed successfully, false otherwise
   */
  async removeFromWatchlist(userId: string, contractSymbol: string): Promise<boolean> {
    // Validate inputs
    if (!userId || userId.trim() === '' || !contractSymbol || contractSymbol.trim() === '') {
      return false;
    }

    // Get user's watchlist
    const userWatchlist = this.watchlists.get(userId);
    if (!userWatchlist) {
      return false;
    }

    // Remove contract
    return userWatchlist.delete(contractSymbol);
  }
}
