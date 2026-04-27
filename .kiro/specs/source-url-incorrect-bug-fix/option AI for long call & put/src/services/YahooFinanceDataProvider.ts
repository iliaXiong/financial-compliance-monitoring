// Yahoo Finance Data Provider - Real market data implementation

import { UnderlyingAsset, PriceData, TimePeriod, OptionContract, OptionType } from '../types/index.js';
import { DataError } from '../types/error.js';
import { DataProvider, DEFAULT_RETRY_CONFIG, RetryConfig } from './DataProvider.js';

/**
 * Yahoo Finance Data Provider
 * 使用 Yahoo Finance API 获取真实市场数据
 * 
 * 注意：Yahoo Finance 的非官方 API 可能不稳定
 * 生产环境建议使用官方付费 API
 */
export class YahooFinanceDataProvider implements DataProvider {
  private baseUrl = 'https://query1.finance.yahoo.com/v8/finance';
  
  constructor() {}

  /**
   * 搜索标的资产
   */
  async searchUnderlying(query: string): Promise<UnderlyingAsset[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const quotes = data.quotes || [];
      
      // 转换为 UnderlyingAsset 格式
      const results: UnderlyingAsset[] = [];
      
      for (const quote of quotes) {
        // 只返回股票类型
        if (quote.quoteType !== 'EQUITY') continue;
        
        // 获取详细报价信息
        try {
          const detailQuote = await this.getQuoteDetail(quote.symbol);
          results.push(detailQuote);
        } catch (error) {
          console.warn(`Failed to get details for ${quote.symbol}:`, error);
        }
      }
      
      return results;
      
    } catch (error) {
      const dataError: DataError = {
        type: 'DATA_ERROR',
        source: 'searchUnderlying',
        message: `搜索标的失败: ${error instanceof Error ? error.message : '未知错误'}`,
        retryable: true,
        fallbackAvailable: false
      };
      throw dataError;
    }
  }

  /**
   * 获取当前价格
   */
  async getCurrentPrice(symbol: string): Promise<PriceData> {
    try {
      const response = await fetch(
        `${this.baseUrl}/quote?symbols=${encodeURIComponent(symbol)}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const quote = data.quoteResponse?.quotes?.[0];
      
      if (!quote) {
        throw new Error(`未找到标的 ${symbol}`);
      }
      
      return {
        symbol: quote.symbol,
        price: quote.regularMarketPrice || 0,
        timestamp: new Date(quote.regularMarketTime * 1000),
        change: quote.regularMarketChange || 0,
        changePercent: quote.regularMarketChangePercent || 0
      };
      
    } catch (error) {
      const dataError: DataError = {
        type: 'DATA_ERROR',
        source: 'getCurrentPrice',
        message: `获取价格失败: ${error instanceof Error ? error.message : '未知错误'}`,
        retryable: true,
        fallbackAvailable: false
      };
      throw dataError;
    }
  }

  /**
   * 获取历史价格
   */
  async getHistoricalPrices(symbol: string, period: TimePeriod): Promise<PriceData[]> {
    try {
      // 计算时间范围
      const now = Math.floor(Date.now() / 1000);
      const periodMap: Record<TimePeriod, number> = {
        [TimePeriod.ONE_DAY]: 86400,
        [TimePeriod.ONE_WEEK]: 604800,
        [TimePeriod.ONE_MONTH]: 2592000,
        [TimePeriod.THREE_MONTHS]: 7776000,
        [TimePeriod.ONE_YEAR]: 31536000
      };
      
      const range = periodMap[period] || 2592000;
      const period1 = now - range;
      const period2 = now;
      
      const response = await fetch(
        `${this.baseUrl}/chart/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=1d`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const result = data.chart?.result?.[0];
      
      if (!result) {
        throw new Error(`未找到历史数据`);
      }
      
      const timestamps = result.timestamp || [];
      const quotes = result.indicators?.quote?.[0] || {};
      const closes = quotes.close || [];
      
      // 转换为 PriceData 格式
      const priceData: PriceData[] = [];
      
      for (let i = 0; i < timestamps.length; i++) {
        if (closes[i] !== null && closes[i] !== undefined) {
          const price = closes[i];
          const prevPrice = i > 0 ? closes[i - 1] : price;
          const change = price - prevPrice;
          const changePercent = prevPrice !== 0 ? (change / prevPrice) * 100 : 0;
          
          priceData.push({
            symbol,
            price,
            timestamp: new Date(timestamps[i] * 1000),
            change,
            changePercent
          });
        }
      }
      
      return priceData;
      
    } catch (error) {
      const dataError: DataError = {
        type: 'DATA_ERROR',
        source: 'getHistoricalPrices',
        message: `获取历史数据失败: ${error instanceof Error ? error.message : '未知错误'}`,
        retryable: true,
        fallbackAvailable: false
      };
      throw dataError;
    }
  }

  /**
   * 获取期权链
   * 注意：Yahoo Finance 的期权数据 API 较复杂，这里提供基础实现
   */
  async getOptionChain(symbol: string, optionType?: OptionType): Promise<OptionContract[]> {
    try {
      const response = await fetch(
        `https://query2.finance.yahoo.com/v7/finance/options/${encodeURIComponent(symbol)}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const optionChain = data.optionChain?.result?.[0];
      
      if (!optionChain) {
        throw new Error(`未找到期权数据`);
      }
      
      const contracts: OptionContract[] = [];
      const options = optionChain.options?.[0];
      
      if (!options) {
        return contracts;
      }
      
      // 处理 CALL 期权
      if (!optionType || optionType === OptionType.CALL) {
        const calls = options.calls || [];
        for (const call of calls) {
          contracts.push(this.convertToOptionContract(call, OptionType.CALL));
        }
      }
      
      // 处理 PUT 期权
      if (!optionType || optionType === OptionType.PUT) {
        const puts = options.puts || [];
        for (const put of puts) {
          contracts.push(this.convertToOptionContract(put, OptionType.PUT));
        }
      }
      
      return contracts;
      
    } catch (error) {
      const dataError: DataError = {
        type: 'DATA_ERROR',
        source: 'getOptionChain',
        message: `获取期权链失败: ${error instanceof Error ? error.message : '未知错误'}`,
        retryable: true,
        fallbackAvailable: false
      };
      throw dataError;
    }
  }

  /**
   * 检查是否支持期权
   */
  async supportsOptions(symbol: string): Promise<boolean> {
    try {
      const response = await fetch(
        `https://query2.finance.yahoo.com/v7/finance/options/${encodeURIComponent(symbol)}`
      );
      
      if (!response.ok) {
        return false;
      }
      
      const data = await response.json();
      return !!data.optionChain?.result?.[0];
      
    } catch (error) {
      return false;
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * 获取详细报价信息
   */
  private async getQuoteDetail(symbol: string): Promise<UnderlyingAsset> {
    const response = await fetch(
      `${this.baseUrl}/quote?symbols=${encodeURIComponent(symbol)}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    const quote = data.quoteResponse?.quotes?.[0];
    
    if (!quote) {
      throw new Error(`未找到标的 ${symbol}`);
    }
    
    return {
      symbol: quote.symbol,
      name: quote.longName || quote.shortName || quote.symbol,
      nameCn: undefined, // Yahoo Finance 不提供中文名称
      currentPrice: quote.regularMarketPrice || 0,
      priceTimestamp: new Date(quote.regularMarketTime * 1000),
      change: quote.regularMarketChange || 0,
      changePercent: quote.regularMarketChangePercent || 0,
      supportsOptions: await this.supportsOptions(quote.symbol)
    };
  }

  /**
   * 转换 Yahoo Finance 期权数据为标准格式
   */
  private convertToOptionContract(yahooOption: any, type: OptionType): OptionContract {
    const expiration = new Date(yahooOption.expiration * 1000);
    const now = new Date();
    const daysToExpiry = Math.ceil((expiration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      contractSymbol: yahooOption.contractSymbol,
      underlyingSymbol: yahooOption.underlyingSymbol || '',
      type,
      strike: yahooOption.strike,
      expiration,
      daysToExpiry,
      premium: yahooOption.lastPrice || 0,
      bid: yahooOption.bid || 0,
      ask: yahooOption.ask || 0,
      delta: 0, // Yahoo Finance 不直接提供 Greeks，需要计算
      gamma: 0,
      theta: 0,
      vega: 0,
      impliedVolatility: yahooOption.impliedVolatility || 0,
      volume: yahooOption.volume || 0,
      openInterest: yahooOption.openInterest || 0,
      lastUpdate: new Date(yahooOption.lastTradeDate * 1000)
    };
  }
}
