// Underlying Analyzer - Validates and analyzes underlying assets

import { 
  ValidationResult, 
  UnderlyingAsset, 
  MarketAnalysis,
  PriceData,
  TimePeriod,
  TechnicalIndicators,
  TrendDirection,
  MarketSentiment,
  StrategyType
} from '../types/index.js';
import { DataProvider } from '../services/DataProvider.js';
import { LLMService } from '../services/LLMService.js';
import { 
  createValidationError, 
  createDataError,
  withRetryAndFallback,
  normalizeError
} from '../utils/errors.js';

export interface UnderlyingAnalyzer {
  validateUnderlying(input: string): Promise<ValidationResult>;
  getUnderlyingInfo(symbol: string): Promise<UnderlyingAsset>;
  analyzeMarketSentiment(symbol: string): Promise<MarketAnalysis>;
}

/**
 * Implementation of UnderlyingAnalyzer
 * Validates and analyzes underlying assets with multi-format support
 */
export class DefaultUnderlyingAnalyzer implements UnderlyingAnalyzer {
  constructor(
    private dataProvider: DataProvider,
    private llmService?: LLMService
  ) {}

  /**
   * Validates underlying with multi-format support (code, Chinese name, English name)
   * Implements Requirements: 1.2, 1.3, 1.5
   */
  async validateUnderlying(input: string): Promise<ValidationResult> {
    try {
      // Input sanitization
      const sanitizedInput = this.sanitizeInput(input);
      
      // Validate input is not empty
      if (!sanitizedInput) {
        return {
          isValid: false,
          error: '请输入有效的标的代码或名称',
          suggestions: []
        };
      }

      // Validate input length
      if (sanitizedInput.length > 100) {
        return {
          isValid: false,
          error: '输入的标的名称过长，请输入有效的标的代码或名称',
          suggestions: []
        };
      }

      // Search for underlying assets
      const searchResults = await this.dataProvider.searchUnderlying(sanitizedInput);

      // No results found
      if (searchResults.length === 0) {
        return {
          isValid: false,
          error: `未找到标的 '${sanitizedInput}'，请检查输入是否正确`,
          suggestions: this.generateSuggestions(sanitizedInput)
        };
      }

      // Find exact match or best match
      const match = this.findBestMatch(sanitizedInput, searchResults);

      // Check if the underlying supports options
      if (!match.supportsOptions) {
        return {
          isValid: false,
          symbol: match.symbol,
          name: match.name,
          error: `标的 '${match.name}' (${match.symbol}) 不支持期权交易`,
          suggestions: []
        };
      }

      // Valid underlying found
      return {
        isValid: true,
        symbol: match.symbol,
        name: match.name
      };

    } catch (error) {
      // Handle data errors
      normalizeError(error, 'validateUnderlying');
      return {
        isValid: false,
        error: '验证标的时发生错误，请稍后重试',
        suggestions: []
      };
    }
  }

  /**
   * Gets underlying basic information
   * Implements Requirements: 1.4
   */
  async getUnderlyingInfo(symbol: string): Promise<UnderlyingAsset> {
    try {
      // Sanitize symbol
      const sanitizedSymbol = this.sanitizeInput(symbol);
      
      if (!sanitizedSymbol) {
        throw createValidationError('symbol', '标的代码不能为空');
      }

      // Search for the underlying
      const searchResults = await this.dataProvider.searchUnderlying(sanitizedSymbol);
      
      if (searchResults.length === 0) {
        throw createDataError(
          'getUnderlyingInfo',
          `未找到标的 ${sanitizedSymbol}`,
          false,
          false
        );
      }

      // Get the first match (should be exact match by symbol)
      const underlying = searchResults[0];

      // Get current price data
      const priceData = await this.dataProvider.getCurrentPrice(underlying.symbol);

      // Return complete underlying info with updated price
      return {
        ...underlying,
        currentPrice: priceData.price,
        priceTimestamp: priceData.timestamp,
        change: priceData.change,
        changePercent: priceData.changePercent
      };

    } catch (error) {
      throw normalizeError(error, 'getUnderlyingInfo');
    }
  }

  /**
   * Analyzes market sentiment with LLM integration and rule-based fallback
   * Implements Requirements: 2.1, 2.2, 2.3, 2.4, 2.6
   */
  async analyzeMarketSentiment(symbol: string): Promise<MarketAnalysis> {
    try {
      // Sanitize symbol
      const sanitizedSymbol = this.sanitizeInput(symbol);
      
      if (!sanitizedSymbol) {
        throw createValidationError('symbol', '标的代码不能为空');
      }

      // Get underlying info
      const underlying = await this.getUnderlyingInfo(sanitizedSymbol);

      // Get historical price data
      const historicalPrices = await this.dataProvider.getHistoricalPrices(
        underlying.symbol,
        TimePeriod.ONE_MONTH
      );

      // Calculate technical indicators
      const technicalIndicators = this.calculateTechnicalIndicators(
        underlying,
        historicalPrices
      );

      // Try LLM analysis first, fallback to rule-based
      const analysis = await withRetryAndFallback(
        async () => {
          if (!this.llmService) {
            throw new Error('LLM service not available');
          }
          return await this.llmService.analyzeSentiment(
            underlying,
            historicalPrices,
            technicalIndicators
          );
        },
        'LLM sentiment analysis',
        { maxRetries: 2, retryDelay: 500, backoffMultiplier: 2 },
        {
          fallbackFn: () => this.ruleBasedSentimentAnalysis(
            underlying,
            historicalPrices,
            technicalIndicators
          ),
          logError: true
        }
      );

      // Map sentiment to strategy
      const suggestedStrategy = this.mapSentimentToStrategy(analysis.sentiment);

      // Return complete market analysis
      return {
        sentiment: analysis.sentiment,
        volatility: technicalIndicators.volatility,
        trend: technicalIndicators.trend,
        supportLevel: technicalIndicators.supportLevel,
        resistanceLevel: technicalIndicators.resistanceLevel,
        analysis: analysis.reasoning,
        suggestedStrategy
      };

    } catch (error) {
      throw normalizeError(error, 'analyzeMarketSentiment');
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Sanitizes user input by trimming whitespace and removing special characters
   */
  private sanitizeInput(input: string): string {
    if (!input) return '';
    
    // Trim whitespace
    let sanitized = input.trim();
    
    // Remove potentially dangerous characters but keep Chinese characters, letters, numbers, and spaces
    sanitized = sanitized.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s.-]/g, '');
    
    return sanitized;
  }

  /**
   * Finds the best match from search results
   */
  private findBestMatch(input: string, results: UnderlyingAsset[]): UnderlyingAsset {
    const normalizedInput = input.toUpperCase();
    
    // Try exact symbol match first
    const exactSymbolMatch = results.find(
      r => r.symbol.toUpperCase() === normalizedInput
    );
    if (exactSymbolMatch) return exactSymbolMatch;
    
    // Try exact name match
    const exactNameMatch = results.find(
      r => r.name.toUpperCase() === normalizedInput || r.nameCn === input
    );
    if (exactNameMatch) return exactNameMatch;
    
    // Return first result as best match
    return results[0];
  }

  /**
   * Generates suggestions for invalid input
   */
  private generateSuggestions(input: string): string[] {
    // Common typos and suggestions
    const commonSuggestions: Record<string, string[]> = {
      'APPL': ['AAPL'],
      'TSLA': ['TSLA'],
      'MSFT': ['MSFT'],
      'GOOGL': ['GOOGL', 'GOOG'],
      'AMZN': ['AMZN'],
      '苹果': ['AAPL'],
      '特斯拉': ['TSLA'],
      '微软': ['MSFT']
    };

    const normalizedInput = input.toUpperCase();
    return commonSuggestions[normalizedInput] || [];
  }

  /**
   * Calculates technical indicators from price data
   */
  private calculateTechnicalIndicators(
    underlying: UnderlyingAsset,
    historicalPrices: PriceData[]
  ): TechnicalIndicators {
    if (historicalPrices.length === 0) {
      return {
        volatility: 0.25, // Default volatility
        trend: TrendDirection.SIDEWAYS,
        supportLevel: underlying.currentPrice * 0.95,
        resistanceLevel: underlying.currentPrice * 1.05
      };
    }

    // Calculate volatility (standard deviation of returns)
    const volatility = this.calculateVolatility(historicalPrices);

    // Determine trend direction
    const trend = this.determineTrend(historicalPrices);

    // Calculate support and resistance levels
    const prices = historicalPrices.map(p => p.price);
    const supportLevel = Math.min(...prices);
    const resistanceLevel = Math.max(...prices);

    // Calculate moving averages
    const ma20 = this.calculateMovingAverage(prices, 20);
    const ma50 = this.calculateMovingAverage(prices, 50);
    const ma200 = prices.length >= 200 ? this.calculateMovingAverage(prices, 200) : undefined;

    // Calculate RSI
    const rsi = this.calculateRSI(historicalPrices, 14);

    return {
      volatility,
      trend,
      supportLevel,
      resistanceLevel,
      rsi,
      movingAverage: {
        ma20,
        ma50,
        ma200: ma200 || ma50
      }
    };
  }

  /**
   * Calculates historical volatility
   */
  private calculateVolatility(prices: PriceData[]): number {
    if (prices.length < 2) return 0.25;

    // Calculate daily returns
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      const dailyReturn = (prices[i].price - prices[i - 1].price) / prices[i - 1].price;
      returns.push(dailyReturn);
    }

    // Calculate standard deviation
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    // Annualize volatility (assuming 252 trading days)
    return stdDev * Math.sqrt(252);
  }

  /**
   * Determines price trend direction
   */
  private determineTrend(prices: PriceData[]): TrendDirection {
    if (prices.length < 5) return TrendDirection.SIDEWAYS;

    const recentPrices = prices.slice(-10).map(p => p.price);
    const firstHalf = recentPrices.slice(0, 5);
    const secondHalf = recentPrices.slice(5);

    const firstAvg = firstHalf.reduce((sum, p) => sum + p, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, p) => sum + p, 0) / secondHalf.length;

    const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100;

    if (changePercent > 2) return TrendDirection.UPTREND;
    if (changePercent < -2) return TrendDirection.DOWNTREND;
    return TrendDirection.SIDEWAYS;
  }

  /**
   * Calculates moving average
   */
  private calculateMovingAverage(prices: number[], period: number): number {
    if (prices.length < period) {
      period = prices.length;
    }
    
    const recentPrices = prices.slice(-period);
    return recentPrices.reduce((sum, p) => sum + p, 0) / recentPrices.length;
  }

  /**
   * Calculates RSI (Relative Strength Index)
   */
  private calculateRSI(prices: PriceData[], period: number = 14): number {
    if (prices.length < period + 1) return 50; // Neutral RSI

    const changes: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      changes.push(prices[i].price - prices[i - 1].price);
    }

    const recentChanges = changes.slice(-period);
    const gains = recentChanges.filter(c => c > 0);
    const losses = recentChanges.filter(c => c < 0).map(c => Math.abs(c));

    const avgGain = gains.length > 0 ? gains.reduce((sum, g) => sum + g, 0) / period : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((sum, l) => sum + l, 0) / period : 0;

    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    return Math.round(rsi * 100) / 100;
  }

  /**
   * Rule-based sentiment analysis (fallback when LLM is unavailable)
   */
  private ruleBasedSentimentAnalysis(
    underlying: UnderlyingAsset,
    _historicalPrices: PriceData[],
    technicalIndicators: TechnicalIndicators
  ): { sentiment: MarketSentiment; reasoning: string; confidence: number; suggestedStrategy: string } {
    let bullishScore = 0;
    let bearishScore = 0;
    const reasons: string[] = [];

    // Analyze trend
    if (technicalIndicators.trend === TrendDirection.UPTREND) {
      bullishScore += 3;
      reasons.push('价格呈上升趋势');
    } else if (technicalIndicators.trend === TrendDirection.DOWNTREND) {
      bearishScore += 3;
      reasons.push('价格呈下降趋势');
    } else {
      reasons.push('价格横盘整理');
    }

    // Analyze recent price change
    if (underlying.changePercent > 2) {
      bullishScore += 2;
      reasons.push(`今日涨幅 ${underlying.changePercent.toFixed(2)}%`);
    } else if (underlying.changePercent < -2) {
      bearishScore += 2;
      reasons.push(`今日跌幅 ${Math.abs(underlying.changePercent).toFixed(2)}%`);
    }

    // Analyze RSI
    if (technicalIndicators.rsi) {
      if (technicalIndicators.rsi > 70) {
        bearishScore += 1;
        reasons.push(`RSI ${technicalIndicators.rsi.toFixed(2)} 超买区域`);
      } else if (technicalIndicators.rsi < 30) {
        bullishScore += 1;
        reasons.push(`RSI ${technicalIndicators.rsi.toFixed(2)} 超卖区域`);
      }
    }

    // Analyze moving averages
    if (technicalIndicators.movingAverage) {
      const { ma20, ma50 } = technicalIndicators.movingAverage;
      if (underlying.currentPrice > ma20 && ma20 > ma50) {
        bullishScore += 2;
        reasons.push('价格位于均线上方，多头排列');
      } else if (underlying.currentPrice < ma20 && ma20 < ma50) {
        bearishScore += 2;
        reasons.push('价格位于均线下方，空头排列');
      }
    }

    // Determine sentiment
    let sentiment: MarketSentiment;
    let confidence: number;

    if (bullishScore > bearishScore + 2) {
      sentiment = MarketSentiment.BULLISH;
      confidence = Math.min(0.8, 0.5 + (bullishScore - bearishScore) * 0.05);
    } else if (bearishScore > bullishScore + 2) {
      sentiment = MarketSentiment.BEARISH;
      confidence = Math.min(0.8, 0.5 + (bearishScore - bullishScore) * 0.05);
    } else {
      sentiment = MarketSentiment.NEUTRAL;
      confidence = 0.5;
    }

    const reasoning = `基于技术分析：${reasons.join('；')}。综合判断市场情绪为${sentiment}。`;
    const suggestedStrategy = sentiment === MarketSentiment.BULLISH 
      ? StrategyType.LONG_CALL 
      : StrategyType.LONG_PUT;

    return {
      sentiment,
      reasoning,
      confidence,
      suggestedStrategy
    };
  }

  /**
   * Maps market sentiment to suggested strategy
   * Implements Requirement: 2.6
   */
  private mapSentimentToStrategy(sentiment: MarketSentiment): StrategyType {
    switch (sentiment) {
      case MarketSentiment.BULLISH:
        return StrategyType.LONG_CALL;
      case MarketSentiment.BEARISH:
        return StrategyType.LONG_PUT;
      case MarketSentiment.NEUTRAL:
        // Default to LONG_CALL for neutral sentiment
        return StrategyType.LONG_CALL;
      default:
        return StrategyType.LONG_CALL;
    }
  }
}
