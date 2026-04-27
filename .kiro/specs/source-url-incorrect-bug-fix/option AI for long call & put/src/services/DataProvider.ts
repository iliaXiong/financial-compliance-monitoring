// Data Provider - Unified interface for external market data APIs

import { UnderlyingAsset, PriceData, TimePeriod, OptionContract, OptionType } from '../types/index.js';
import { DataError } from '../types/error.js';

export interface DataProvider {
  searchUnderlying(query: string): Promise<UnderlyingAsset[]>;
  getCurrentPrice(symbol: string): Promise<PriceData>;
  getHistoricalPrices(symbol: string, period: TimePeriod): Promise<PriceData[]>;
  getOptionChain(symbol: string, optionType?: OptionType): Promise<OptionContract[]>;
  supportsOptions(symbol: string): Promise<boolean>;
}

// Retry configuration
export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  backoffMultiplier: 2
};

// Helper function for retry logic
async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  operationName: string = 'operation'
): Promise<T> {
  let lastError: Error | null = null;
  let delay = config.retryDelay;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < config.maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= config.backoffMultiplier;
      }
    }
  }

  // All retries failed
  const dataError: DataError = {
    type: 'DATA_ERROR',
    source: operationName,
    message: `操作失败: ${lastError?.message || '未知错误'}`,
    retryable: true,
    fallbackAvailable: false
  };
  
  throw dataError;
}

// Mock DataProvider implementation for testing
export class MockDataProvider implements DataProvider {
  private mockUnderlyings: Map<string, UnderlyingAsset> = new Map();
  private mockPrices: Map<string, PriceData> = new Map();
  private mockHistoricalData: Map<string, PriceData[]> = new Map();
  private mockOptionChains: Map<string, OptionContract[]> = new Map();
  private shouldFail: boolean = false;
  private failureCount: number = 0;
  private maxFailures: number = 0;

  constructor() {
    this.initializeMockData();
  }

  // Configure failure simulation for testing retry logic
  simulateFailure(maxFailures: number = 1): void {
    this.shouldFail = true;
    this.maxFailures = maxFailures;
    this.failureCount = 0;
  }

  resetFailureSimulation(): void {
    this.shouldFail = false;
    this.failureCount = 0;
    this.maxFailures = 0;
  }

  private checkFailure(): void {
    if (this.shouldFail && this.failureCount < this.maxFailures) {
      this.failureCount++;
      throw new Error('Simulated API failure');
    }
  }

  private initializeMockData(): void {
    // Mock underlying assets
    const aapl: UnderlyingAsset = {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      nameCn: '苹果公司',
      currentPrice: 175.50,
      priceTimestamp: new Date(),
      change: 2.50,
      changePercent: 1.44,
      supportsOptions: true
    };

    const tsla: UnderlyingAsset = {
      symbol: 'TSLA',
      name: 'Tesla Inc.',
      nameCn: '特斯拉',
      currentPrice: 242.80,
      priceTimestamp: new Date(),
      change: -5.20,
      changePercent: -2.10,
      supportsOptions: true
    };

    const msft: UnderlyingAsset = {
      symbol: 'MSFT',
      name: 'Microsoft Corporation',
      nameCn: '微软',
      currentPrice: 378.90,
      priceTimestamp: new Date(),
      change: 3.40,
      changePercent: 0.90,
      supportsOptions: true
    };

    this.mockUnderlyings.set('AAPL', aapl);
    this.mockUnderlyings.set('TSLA', tsla);
    this.mockUnderlyings.set('MSFT', msft);
    this.mockUnderlyings.set('苹果', aapl);
    this.mockUnderlyings.set('特斯拉', tsla);
    this.mockUnderlyings.set('微软', msft);

    // Mock current prices
    this.mockPrices.set('AAPL', {
      symbol: 'AAPL',
      price: 175.50,
      timestamp: new Date(),
      change: 2.50,
      changePercent: 1.44
    });

    this.mockPrices.set('TSLA', {
      symbol: 'TSLA',
      price: 242.80,
      timestamp: new Date(),
      change: -5.20,
      changePercent: -2.10
    });

    this.mockPrices.set('MSFT', {
      symbol: 'MSFT',
      price: 378.90,
      timestamp: new Date(),
      change: 3.40,
      changePercent: 0.90
    });

    // Mock historical prices (simplified - just a few data points)
    this.mockHistoricalData.set('AAPL', this.generateHistoricalPrices('AAPL', 175.50, 30));
    this.mockHistoricalData.set('TSLA', this.generateHistoricalPrices('TSLA', 242.80, 30));
    this.mockHistoricalData.set('MSFT', this.generateHistoricalPrices('MSFT', 378.90, 30));

    // Mock option chains
    this.mockOptionChains.set('AAPL_CALL', this.generateMockOptionChain('AAPL', 175.50, OptionType.CALL));
    this.mockOptionChains.set('AAPL_PUT', this.generateMockOptionChain('AAPL', 175.50, OptionType.PUT));
    this.mockOptionChains.set('TSLA_CALL', this.generateMockOptionChain('TSLA', 242.80, OptionType.CALL));
    this.mockOptionChains.set('TSLA_PUT', this.generateMockOptionChain('TSLA', 242.80, OptionType.PUT));
  }

  private generateHistoricalPrices(symbol: string, currentPrice: number, days: number): PriceData[] {
    const prices: PriceData[] = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      // Simulate price variation
      const variation = (Math.random() - 0.5) * 10;
      const price = currentPrice + variation - (i * 0.1);
      const change = (Math.random() - 0.5) * 5;
      
      prices.push({
        symbol,
        price: Math.max(price, currentPrice * 0.8),
        timestamp: date,
        change,
        changePercent: (change / price) * 100
      });
    }
    
    return prices;
  }

  private generateMockOptionChain(symbol: string, spotPrice: number, optionType: OptionType): OptionContract[] {
    const contracts: OptionContract[] = [];
    const strikes = [
      spotPrice * 0.90,
      spotPrice * 0.95,
      spotPrice,
      spotPrice * 1.05,
      spotPrice * 1.10
    ];
    
    const expirations = [30, 60, 90]; // days to expiry
    
    for (const daysToExpiry of expirations) {
      for (const strike of strikes) {
        const expiration = new Date();
        expiration.setDate(expiration.getDate() + daysToExpiry);
        
        const isCall = optionType === OptionType.CALL;
        const moneyness = isCall ? spotPrice - strike : strike - spotPrice;
        const isITM = moneyness > 0;
        
        // Simplified Greeks calculation
        const delta = isCall 
          ? (isITM ? 0.6 + Math.random() * 0.3 : 0.2 + Math.random() * 0.3)
          : (isITM ? -0.6 - Math.random() * 0.3 : -0.2 - Math.random() * 0.3);
        
        const premium = Math.abs(moneyness) + (daysToExpiry / 10) + Math.random() * 5;
        
        contracts.push({
          contractSymbol: `${symbol}${expiration.toISOString().slice(2, 10).replace(/-/g, '')}${isCall ? 'C' : 'P'}${Math.round(strike * 1000).toString().padStart(8, '0')}`,
          underlyingSymbol: symbol,
          type: optionType,
          strike: Math.round(strike * 100) / 100,
          expiration,
          daysToExpiry,
          premium: Math.max(0.5, Math.round(premium * 100) / 100),
          bid: Math.max(0.45, Math.round((premium - 0.05) * 100) / 100),
          ask: Math.round((premium + 0.05) * 100) / 100,
          delta: Math.round(delta * 100) / 100,
          gamma: Math.round((0.01 + Math.random() * 0.02) * 1000) / 1000,
          theta: Math.round((-0.05 - Math.random() * 0.1) * 100) / 100,
          vega: Math.round((0.1 + Math.random() * 0.2) * 100) / 100,
          impliedVolatility: Math.round((0.2 + Math.random() * 0.3) * 100) / 100,
          volume: Math.floor(Math.random() * 10000),
          openInterest: Math.floor(Math.random() * 50000),
          lastUpdate: new Date()
        });
      }
    }
    
    return contracts;
  }

  async searchUnderlying(query: string): Promise<UnderlyingAsset[]> {
    return withRetry(async () => {
      this.checkFailure();
      
      const normalizedQuery = query.trim().toUpperCase();
      const results: UnderlyingAsset[] = [];
      
      // Search by symbol or name
      for (const [key, asset] of this.mockUnderlyings.entries()) {
        if (
          asset.symbol.toUpperCase().includes(normalizedQuery) ||
          asset.name.toUpperCase().includes(normalizedQuery) ||
          asset.nameCn?.includes(query.trim())
        ) {
          // Avoid duplicates
          if (!results.find(r => r.symbol === asset.symbol)) {
            results.push(asset);
          }
        }
      }
      
      return results;
    }, DEFAULT_RETRY_CONFIG, 'searchUnderlying');
  }

  async getCurrentPrice(symbol: string): Promise<PriceData> {
    return withRetry(async () => {
      this.checkFailure();
      
      const price = this.mockPrices.get(symbol.toUpperCase());
      if (!price) {
        const error: DataError = {
          type: 'DATA_ERROR',
          source: 'getCurrentPrice',
          message: `未找到标的 ${symbol} 的价格数据`,
          retryable: false,
          fallbackAvailable: false
        };
        throw error;
      }
      
      // Update timestamp to current time
      return {
        ...price,
        timestamp: new Date()
      };
    }, DEFAULT_RETRY_CONFIG, 'getCurrentPrice');
  }

  async getHistoricalPrices(symbol: string, period: TimePeriod): Promise<PriceData[]> {
    return withRetry(async () => {
      this.checkFailure();
      
      const historicalData = this.mockHistoricalData.get(symbol.toUpperCase());
      if (!historicalData) {
        const error: DataError = {
          type: 'DATA_ERROR',
          source: 'getHistoricalPrices',
          message: `未找到标的 ${symbol} 的历史数据`,
          retryable: false,
          fallbackAvailable: false
        };
        throw error;
      }
      
      // Filter based on period
      const periodDays: Record<TimePeriod, number> = {
        [TimePeriod.ONE_DAY]: 1,
        [TimePeriod.ONE_WEEK]: 7,
        [TimePeriod.ONE_MONTH]: 30,
        [TimePeriod.THREE_MONTHS]: 90,
        [TimePeriod.ONE_YEAR]: 365
      };
      
      const days = periodDays[period] || 30;
      return historicalData.slice(-days);
    }, DEFAULT_RETRY_CONFIG, 'getHistoricalPrices');
  }

  async getOptionChain(symbol: string, optionType?: OptionType): Promise<OptionContract[]> {
    return withRetry(async () => {
      this.checkFailure();
      
      const normalizedSymbol = symbol.toUpperCase();
      
      // Check if underlying supports options
      const supportsOpts = await this.supportsOptions(normalizedSymbol);
      if (!supportsOpts) {
        const error: DataError = {
          type: 'DATA_ERROR',
          source: 'getOptionChain',
          message: `标的 ${symbol} 不支持期权交易`,
          retryable: false,
          fallbackAvailable: false
        };
        throw error;
      }
      
      let contracts: OptionContract[] = [];
      
      if (!optionType) {
        // Return both CALL and PUT
        const calls = this.mockOptionChains.get(`${normalizedSymbol}_CALL`) || [];
        const puts = this.mockOptionChains.get(`${normalizedSymbol}_PUT`) || [];
        contracts = [...calls, ...puts];
      } else {
        const typeKey = optionType === OptionType.CALL ? 'CALL' : 'PUT';
        contracts = this.mockOptionChains.get(`${normalizedSymbol}_${typeKey}`) || [];
      }
      
      // Update timestamps to current time
      return contracts.map(contract => ({
        ...contract,
        lastUpdate: new Date()
      }));
    }, DEFAULT_RETRY_CONFIG, 'getOptionChain');
  }

  async supportsOptions(symbol: string): Promise<boolean> {
    return withRetry(async () => {
      this.checkFailure();
      
      const underlying = this.mockUnderlyings.get(symbol.toUpperCase());
      return underlying?.supportsOptions ?? false;
    }, DEFAULT_RETRY_CONFIG, 'supportsOptions');
  }

  // Helper methods for testing
  addMockUnderlying(asset: UnderlyingAsset): void {
    this.mockUnderlyings.set(asset.symbol, asset);
    if (asset.nameCn) {
      this.mockUnderlyings.set(asset.nameCn, asset);
    }
  }

  addMockPrice(symbol: string, price: PriceData): void {
    this.mockPrices.set(symbol, price);
  }

  addMockHistoricalData(symbol: string, data: PriceData[]): void {
    this.mockHistoricalData.set(symbol, data);
  }

  addMockOptionChain(symbol: string, optionType: OptionType, contracts: OptionContract[]): void {
    const typeKey = optionType === OptionType.CALL ? 'CALL' : 'PUT';
    this.mockOptionChains.set(`${symbol}_${typeKey}`, contracts);
  }
}
