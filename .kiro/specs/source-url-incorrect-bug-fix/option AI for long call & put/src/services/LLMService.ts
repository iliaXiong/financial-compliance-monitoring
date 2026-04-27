// LLM Service - Market sentiment analysis and natural language generation

import { 
  UnderlyingAsset, 
  PriceData, 
  TechnicalIndicators, 
  MarketSentiment,
  OptionContract,
  SessionState,
  StrategyType,
  TrendDirection,
  RiskLevel,
  OptionType,
  Moneyness
} from '../types/index.js';
import { createSystemError } from '../utils/errors.js';

export interface SentimentAnalysis {
  sentiment: MarketSentiment;
  confidence: number;
  reasoning: string;
  suggestedStrategy: StrategyType;
}

export interface ContractAnalysis {
  score: number;
  reasoning: string;
  riskLevel: RiskLevel;
  keyPoints: string[];
}

export enum UserIntent {
  SELECT_UNDERLYING = "SELECT_UNDERLYING",
  CONFIRM = "CONFIRM",
  ANALYZE = "ANALYZE",
  SELECT_CONTRACT = "SELECT_CONTRACT",
  RESTART = "RESTART",
  HELP = "HELP"
}

export interface LLMService {
  analyzeSentiment(
    underlying: UnderlyingAsset,
    priceHistory: PriceData[],
    technicalIndicators: TechnicalIndicators
  ): Promise<SentimentAnalysis>;
  
  analyzeOptionContract(
    contract: OptionContract,
    underlying: UnderlyingAsset,
    sentiment: MarketSentiment
  ): Promise<ContractAnalysis>;
  
  generateResponse(
    context: SessionState,
    intent: UserIntent
  ): Promise<string>;
}

/**
 * Mock LLM Service implementation using rule-based logic
 * This simulates LLM responses for market analysis and natural language generation
 * Can be replaced with actual LLM integration later
 */
export class MockLLMService implements LLMService {
  private isAvailable: boolean = true;

  /**
   * Simulates LLM service unavailability for testing error handling
   */
  setAvailability(available: boolean): void {
    this.isAvailable = available;
  }

  /**
   * Analyzes market sentiment based on price data and technical indicators
   * Uses rule-based logic to simulate LLM analysis
   */
  async analyzeSentiment(
    underlying: UnderlyingAsset,
    priceHistory: PriceData[],
    technicalIndicators: TechnicalIndicators
  ): Promise<SentimentAnalysis> {
    // Check service availability
    if (!this.isAvailable) {
      throw createSystemError(
        'LLM_SERVICE_UNAVAILABLE',
        'LLM服务暂时不可用，使用基于规则的分析',
        'LLM service is unavailable'
      );
    }

    // Rule-based sentiment analysis
    const sentiment = this.determineSentiment(underlying, priceHistory, technicalIndicators);
    const confidence = this.calculateConfidence(technicalIndicators);
    const reasoning = this.generateSentimentReasoning(underlying, priceHistory, technicalIndicators, sentiment);
    const suggestedStrategy = sentiment === MarketSentiment.BULLISH 
      ? StrategyType.LONG_CALL 
      : sentiment === MarketSentiment.BEARISH 
        ? StrategyType.LONG_PUT 
        : StrategyType.LONG_CALL; // Default to LONG_CALL for neutral

    return {
      sentiment,
      confidence,
      reasoning,
      suggestedStrategy
    };
  }

  /**
   * Analyzes an option contract and provides scoring and recommendations
   */
  async analyzeOptionContract(
    contract: OptionContract,
    underlying: UnderlyingAsset,
    sentiment: MarketSentiment
  ): Promise<ContractAnalysis> {
    // Check service availability
    if (!this.isAvailable) {
      throw createSystemError(
        'LLM_SERVICE_UNAVAILABLE',
        'LLM服务暂时不可用，使用基于规则的分析',
        'LLM service is unavailable'
      );
    }

    // Calculate contract score
    const score = this.calculateContractScore(contract, underlying, sentiment);
    const riskLevel = this.determineRiskLevel(contract, underlying);
    const reasoning = this.generateContractReasoning(contract, underlying, sentiment, score);
    const keyPoints = this.generateKeyPoints(contract, underlying, sentiment);

    return {
      score,
      reasoning,
      riskLevel,
      keyPoints
    };
  }

  /**
   * Generates natural language responses based on dialog context and user intent
   */
  async generateResponse(
    context: SessionState,
    intent: UserIntent
  ): Promise<string> {
    // Check service availability - for dialog, we always provide a response
    if (!this.isAvailable) {
      return this.generateFallbackResponse(context, intent);
    }

    switch (intent) {
      case UserIntent.SELECT_UNDERLYING:
        return "请输入您想要分析的标的代码或名称（例如：AAPL、苹果、特斯拉）";
      
      case UserIntent.CONFIRM:
        if (context.underlying) {
          return `已确认标的：${context.underlying.name}（${context.underlying.symbol}），当前价格 $${context.underlying.currentPrice.toFixed(2)}。正在分析市场情绪...`;
        }
        return "请先选择标的";
      
      case UserIntent.ANALYZE:
        if (context.sentiment && context.strategy) {
          const sentimentText = context.sentiment === MarketSentiment.BULLISH ? "看涨" : 
                                context.sentiment === MarketSentiment.BEARISH ? "看跌" : "中性";
          return `市场分析完成。当前市场情绪：${sentimentText}。建议策略：${context.strategy}。正在筛选期权合约...`;
        }
        return "正在分析市场情绪...";
      
      case UserIntent.SELECT_CONTRACT:
        return "请选择您感兴趣的期权合约（输入序号或合约代码）";
      
      case UserIntent.RESTART:
        return "已重置会话，让我们重新开始。请输入您想要分析的标的";
      
      case UserIntent.HELP:
        return "我可以帮您分析期权交易机会。流程如下：\n1. 选择标的\n2. 分析市场情绪\n3. 推荐期权合约\n4. 生成交易链接";
      
      default:
        return "我不太理解您的意思，请重新输入";
    }
  }

  // ============================================================================
  // Private Helper Methods - Sentiment Analysis
  // ============================================================================

  private determineSentiment(
    underlying: UnderlyingAsset,
    priceHistory: PriceData[],
    technicalIndicators: TechnicalIndicators
  ): MarketSentiment {
    // Rule 1: Check trend direction
    if (technicalIndicators.trend === TrendDirection.UPTREND) {
      return MarketSentiment.BULLISH;
    }
    if (technicalIndicators.trend === TrendDirection.DOWNTREND) {
      return MarketSentiment.BEARISH;
    }

    // Rule 2: Check recent price change
    if (underlying.changePercent > 2) {
      return MarketSentiment.BULLISH;
    }
    if (underlying.changePercent < -2) {
      return MarketSentiment.BEARISH;
    }

    // Rule 3: Check RSI if available
    if (technicalIndicators.rsi) {
      if (technicalIndicators.rsi > 70) {
        return MarketSentiment.BEARISH; // Overbought
      }
      if (technicalIndicators.rsi < 30) {
        return MarketSentiment.BULLISH; // Oversold
      }
    }

    // Rule 4: Check price relative to moving averages
    if (technicalIndicators.movingAverage) {
      const { ma20, ma50 } = technicalIndicators.movingAverage;
      if (underlying.currentPrice > ma20 && ma20 > ma50) {
        return MarketSentiment.BULLISH;
      }
      if (underlying.currentPrice < ma20 && ma20 < ma50) {
        return MarketSentiment.BEARISH;
      }
    }

    // Default to neutral
    return MarketSentiment.NEUTRAL;
  }

  private calculateConfidence(technicalIndicators: TechnicalIndicators): number {
    let confidence = 0.5; // Base confidence

    // Higher volatility = lower confidence
    if (technicalIndicators.volatility < 0.2) {
      confidence += 0.2;
    } else if (technicalIndicators.volatility > 0.5) {
      confidence -= 0.2;
    }

    // Clear trend = higher confidence
    if (technicalIndicators.trend !== TrendDirection.SIDEWAYS) {
      confidence += 0.15;
    }

    // RSI extremes = higher confidence
    if (technicalIndicators.rsi) {
      if (technicalIndicators.rsi > 70 || technicalIndicators.rsi < 30) {
        confidence += 0.15;
      }
    }

    return Math.max(0, Math.min(1, confidence));
  }

  private generateSentimentReasoning(
    underlying: UnderlyingAsset,
    priceHistory: PriceData[],
    technicalIndicators: TechnicalIndicators,
    sentiment: MarketSentiment
  ): string {
    const parts: string[] = [];

    // Price change analysis
    const changeDirection = underlying.changePercent > 0 ? "上涨" : "下跌";
    parts.push(`${underlying.symbol}当前价格为$${underlying.currentPrice.toFixed(2)}，较前一交易日${changeDirection}${Math.abs(underlying.changePercent).toFixed(2)}%`);

    // Trend analysis
    const trendText = technicalIndicators.trend === TrendDirection.UPTREND ? "上升趋势" :
                      technicalIndicators.trend === TrendDirection.DOWNTREND ? "下降趋势" : "横盘整理";
    parts.push(`技术面显示${trendText}`);

    // Volatility analysis
    const volText = technicalIndicators.volatility > 0.4 ? "较高" : 
                    technicalIndicators.volatility > 0.2 ? "适中" : "较低";
    parts.push(`波动率${volText}（${(technicalIndicators.volatility * 100).toFixed(1)}%）`);

    // Support/Resistance levels
    if (technicalIndicators.supportLevel && technicalIndicators.resistanceLevel) {
      parts.push(`支撑位在$${technicalIndicators.supportLevel.toFixed(2)}，阻力位在$${technicalIndicators.resistanceLevel.toFixed(2)}`);
    }

    // Sentiment conclusion
    const sentimentText = sentiment === MarketSentiment.BULLISH ? "看涨" :
                         sentiment === MarketSentiment.BEARISH ? "看跌" : "中性";
    parts.push(`综合判断市场情绪${sentimentText}`);

    return parts.join("。") + "。";
  }

  // ============================================================================
  // Private Helper Methods - Contract Analysis
  // ============================================================================

  private calculateContractScore(
    contract: OptionContract,
    underlying: UnderlyingAsset,
    sentiment: MarketSentiment
  ): number {
    let score = 50; // Base score

    // Factor 1: Moneyness alignment with sentiment (30 points)
    const moneyness = this.calculateMoneyness(contract, underlying);
    if (sentiment === MarketSentiment.BULLISH && contract.type === OptionType.CALL) {
      if (moneyness === Moneyness.ATM) score += 30;
      else if (moneyness === Moneyness.OTM) score += 20;
      else score += 10;
    } else if (sentiment === MarketSentiment.BEARISH && contract.type === OptionType.PUT) {
      if (moneyness === Moneyness.ATM) score += 30;
      else if (moneyness === Moneyness.OTM) score += 20;
      else score += 10;
    }

    // Factor 2: Liquidity (20 points)
    const liquidityScore = this.calculateLiquidityScore(contract);
    score += liquidityScore * 20;

    // Factor 3: Time to expiry (15 points)
    if (contract.daysToExpiry >= 30 && contract.daysToExpiry <= 60) {
      score += 15; // Sweet spot
    } else if (contract.daysToExpiry >= 15 && contract.daysToExpiry < 30) {
      score += 10;
    } else if (contract.daysToExpiry > 60) {
      score += 5;
    }

    // Factor 4: Delta (15 points)
    const absDelta = Math.abs(contract.delta);
    if (absDelta >= 0.4 && absDelta <= 0.6) {
      score += 15; // Good delta range
    } else if (absDelta >= 0.3 && absDelta < 0.7) {
      score += 10;
    } else {
      score += 5;
    }

    // Factor 5: Implied Volatility (10 points)
    if (contract.impliedVolatility >= 0.2 && contract.impliedVolatility <= 0.5) {
      score += 10; // Reasonable IV
    } else if (contract.impliedVolatility < 0.2) {
      score += 5; // Low IV
    }

    // Factor 6: Cost efficiency (10 points)
    const costEfficiency = this.calculateCostEfficiency(contract, underlying);
    score += costEfficiency * 10;

    return Math.max(0, Math.min(100, score));
  }

  private determineRiskLevel(
    contract: OptionContract,
    underlying: UnderlyingAsset
  ): RiskLevel {
    const moneyness = this.calculateMoneyness(contract, underlying);
    const liquidityScore = this.calculateLiquidityScore(contract);

    // High risk conditions
    if (contract.daysToExpiry < 7) return RiskLevel.HIGH;
    if (liquidityScore < 0.3) return RiskLevel.HIGH;
    if (moneyness === Moneyness.OTM && contract.daysToExpiry < 15) return RiskLevel.HIGH;

    // Low risk conditions
    if (moneyness === Moneyness.ITM && liquidityScore > 0.7 && contract.daysToExpiry > 30) {
      return RiskLevel.LOW;
    }

    // Default to medium
    return RiskLevel.MEDIUM;
  }

  private generateContractReasoning(
    contract: OptionContract,
    underlying: UnderlyingAsset,
    sentiment: MarketSentiment,
    score: number
  ): string {
    const parts: string[] = [];

    // Moneyness
    const moneyness = this.calculateMoneyness(contract, underlying);
    const moneynessText = moneyness === Moneyness.ITM ? "实值" :
                         moneyness === Moneyness.ATM ? "平值" : "虚值";
    parts.push(`该合约为${moneynessText}期权，行权价$${contract.strike.toFixed(2)}`);

    // Time value
    parts.push(`距离到期还有${contract.daysToExpiry}天`);

    // Premium
    parts.push(`权利金为$${contract.premium.toFixed(2)}`);

    // Greeks
    parts.push(`Delta值为${contract.delta.toFixed(3)}，表示标的价格每变动$1，期权价格约变动$${Math.abs(contract.delta).toFixed(2)}`);

    // Liquidity
    const liquidityScore = this.calculateLiquidityScore(contract);
    const liquidityText = liquidityScore > 0.7 ? "流动性良好" :
                         liquidityScore > 0.4 ? "流动性一般" : "流动性较差";
    parts.push(`${liquidityText}（成交量${contract.volume}，持仓量${contract.openInterest}）`);

    // Score interpretation
    if (score >= 80) {
      parts.push("综合评分较高，推荐考虑");
    } else if (score >= 60) {
      parts.push("综合评分中等，可以考虑");
    } else {
      parts.push("综合评分较低，建议谨慎");
    }

    return parts.join("。") + "。";
  }

  private generateKeyPoints(
    contract: OptionContract,
    underlying: UnderlyingAsset,
    sentiment: MarketSentiment
  ): string[] {
    const points: string[] = [];

    // Moneyness point
    const moneyness = this.calculateMoneyness(contract, underlying);
    if (moneyness === Moneyness.ATM) {
      points.push("平值期权，Delta约0.5，价格敏感度适中");
    } else if (moneyness === Moneyness.ITM) {
      points.push("实值期权，内在价值较高，但权利金较贵");
    } else {
      points.push("虚值期权，杠杆较高但风险较大");
    }

    // Time decay point
    if (contract.daysToExpiry < 15) {
      points.push("临近到期，时间价值衰减加速");
    } else if (contract.daysToExpiry > 60) {
      points.push("到期时间较长，时间价值充足");
    }

    // Liquidity point
    const liquidityScore = this.calculateLiquidityScore(contract);
    if (liquidityScore < 0.4) {
      points.push("流动性不足，可能存在较大买卖价差");
    }

    // IV point
    if (contract.impliedVolatility > 0.5) {
      points.push("隐含波动率较高，期权价格可能偏贵");
    } else if (contract.impliedVolatility < 0.2) {
      points.push("隐含波动率较低，期权价格相对便宜");
    }

    return points;
  }

  // ============================================================================
  // Private Helper Methods - Calculations
  // ============================================================================

  private calculateMoneyness(contract: OptionContract, underlying: UnderlyingAsset): Moneyness {
    const spotPrice = underlying.currentPrice;
    const strike = contract.strike;
    const threshold = spotPrice * 0.02; // 2% threshold

    if (contract.type === OptionType.CALL) {
      if (spotPrice > strike + threshold) return Moneyness.ITM;
      if (spotPrice < strike - threshold) return Moneyness.OTM;
      return Moneyness.ATM;
    } else {
      if (spotPrice < strike - threshold) return Moneyness.ITM;
      if (spotPrice > strike + threshold) return Moneyness.OTM;
      return Moneyness.ATM;
    }
  }

  private calculateLiquidityScore(contract: OptionContract): number {
    // Normalize volume and open interest
    const volumeScore = Math.min(contract.volume / 1000, 1);
    const oiScore = Math.min(contract.openInterest / 5000, 1);
    
    // Weighted average (volume is more important for immediate execution)
    return volumeScore * 0.6 + oiScore * 0.4;
  }

  private calculateCostEfficiency(contract: OptionContract, underlying: UnderlyingAsset): number {
    // Lower premium relative to spot price = higher efficiency
    const premiumRatio = contract.premium / underlying.currentPrice;
    
    // Normalize: 0-5% premium is good, >10% is expensive
    if (premiumRatio < 0.05) return 1;
    if (premiumRatio > 0.1) return 0;
    return 1 - (premiumRatio - 0.05) / 0.05;
  }

  private generateFallbackResponse(context: SessionState, intent: UserIntent): string {
    return "系统正在处理您的请求，请稍候...";
  }
}
