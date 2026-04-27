// Option Analyzer - Filters and ranks option contracts

import { 
  OptionContract, 
  AnalyzedContract, 
  StrategyType, 
  UnderlyingAsset, 
  MarketSentiment,
  OptionType,
  Moneyness,
  RiskLevel
} from '../types/index.js';
import { DataProvider } from '../services/DataProvider.js';
import { GreeksCalculator } from '../calculators/GreeksCalculator.js';

export interface OptionAnalyzer {
  getOptionChain(symbol: string, strategy: StrategyType): Promise<OptionContract[]>;
  analyzeContracts(
    contracts: OptionContract[],
    underlying: UnderlyingAsset,
    sentiment: MarketSentiment
  ): Promise<AnalyzedContract[]>;
  rankContracts(contracts: AnalyzedContract[]): AnalyzedContract[];
}

/**
 * Implementation of OptionAnalyzer
 * Filters and ranks option contracts based on strategy type
 */
export class DefaultOptionAnalyzer implements OptionAnalyzer {
  private readonly RISK_FREE_RATE = 0.045; // 4.5% annual risk-free rate

  constructor(
    private dataProvider: DataProvider,
    private greeksCalculator: GreeksCalculator
  ) {}

  /**
   * Get option chain filtered by strategy type
   * Long Call → CALL options only
   * Long Put → PUT options only
   */
  async getOptionChain(symbol: string, strategy: StrategyType): Promise<OptionContract[]> {
    // Determine option type based on strategy
    const optionType = strategy === StrategyType.LONG_CALL 
      ? OptionType.CALL 
      : OptionType.PUT;

    // Get filtered option chain from data provider
    const contracts = await this.dataProvider.getOptionChain(symbol, optionType);

    return contracts;
  }

  /**
   * Analyze contracts by calculating Greeks, moneyness, liquidity score, and cost efficiency
   */
  async analyzeContracts(
    contracts: OptionContract[],
    underlying: UnderlyingAsset,
    sentiment: MarketSentiment
  ): Promise<AnalyzedContract[]> {
    const analyzedContracts: AnalyzedContract[] = [];

    for (const contract of contracts) {
      // Calculate Greeks if not already present or need recalculation
      const greeks = this.calculateOrUpdateGreeks(contract, underlying.currentPrice);

      // Calculate moneyness
      const moneyness = this.calculateMoneyness(
        contract.type,
        underlying.currentPrice,
        contract.strike
      );

      // Calculate liquidity score (0-100)
      const liquidityScore = this.calculateLiquidityScore(
        contract.volume,
        contract.openInterest
      );

      // Calculate cost efficiency (0-100)
      const costEfficiency = this.calculateCostEfficiency(
        contract.premium,
        Math.abs(contract.delta),
        contract.daysToExpiry
      );

      // Calculate overall score
      const score = this.calculateScore(
        moneyness,
        liquidityScore,
        costEfficiency,
        Math.abs(contract.delta),
        contract.impliedVolatility,
        sentiment
      );

      // Determine risk level
      const riskLevel = this.determineRiskLevel(
        moneyness,
        liquidityScore,
        contract.daysToExpiry,
        contract.impliedVolatility
      );

      // Generate analysis text
      const analysis = this.generateAnalysis(
        contract,
        moneyness,
        liquidityScore,
        costEfficiency,
        sentiment
      );

      analyzedContracts.push({
        ...contract,
        delta: greeks.delta,
        gamma: greeks.gamma,
        theta: greeks.theta,
        vega: greeks.vega,
        score,
        riskLevel,
        analysis,
        keyMetrics: {
          moneyness,
          liquidityScore,
          costEfficiency
        }
      });
    }

    return analyzedContracts;
  }

  /**
   * Rank contracts by score in descending order
   */
  rankContracts(contracts: AnalyzedContract[]): AnalyzedContract[] {
    return [...contracts].sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate or update Greeks for a contract
   */
  private calculateOrUpdateGreeks(contract: OptionContract, spotPrice: number) {
    const timeToExpiry = contract.daysToExpiry / 365;

    return this.greeksCalculator.calculateGreeks(
      contract.type,
      spotPrice,
      contract.strike,
      timeToExpiry,
      contract.impliedVolatility,
      this.RISK_FREE_RATE
    );
  }

  /**
   * Calculate moneyness (ITM, ATM, OTM)
   */
  private calculateMoneyness(
    optionType: OptionType,
    spotPrice: number,
    strike: number
  ): Moneyness {
    const threshold = spotPrice * 0.02; // 2% threshold for ATM

    if (optionType === OptionType.CALL) {
      if (spotPrice > strike + threshold) {
        return Moneyness.ITM; // In The Money
      } else if (spotPrice < strike - threshold) {
        return Moneyness.OTM; // Out of The Money
      } else {
        return Moneyness.ATM; // At The Money
      }
    } else {
      // PUT option
      if (spotPrice < strike - threshold) {
        return Moneyness.ITM;
      } else if (spotPrice > strike + threshold) {
        return Moneyness.OTM;
      } else {
        return Moneyness.ATM;
      }
    }
  }

  /**
   * Calculate liquidity score based on volume and open interest
   * Returns score from 0-100
   */
  private calculateLiquidityScore(volume: number, openInterest: number): number {
    // Thresholds for good liquidity
    const VOLUME_THRESHOLD = 1000;
    const OI_THRESHOLD = 5000;

    // Calculate volume score (0-50)
    const volumeScore = Math.min(50, (volume / VOLUME_THRESHOLD) * 50);

    // Calculate open interest score (0-50)
    const oiScore = Math.min(50, (openInterest / OI_THRESHOLD) * 50);

    return Math.round(volumeScore + oiScore);
  }

  /**
   * Calculate cost efficiency
   * Returns score from 0-100
   */
  private calculateCostEfficiency(
    premium: number,
    absDelta: number,
    daysToExpiry: number
  ): number {
    // Avoid division by zero
    if (absDelta === 0 || premium === 0) {
      return 0;
    }

    // Delta per dollar spent (higher is better)
    const deltaPerDollar = absDelta / premium;

    // Time value consideration (longer time = more value, but diminishing returns)
    const timeValue = Math.min(1, daysToExpiry / 90); // Normalize to 90 days

    // Combined efficiency score
    const efficiency = deltaPerDollar * (0.7 + timeValue * 0.3);

    // Normalize to 0-100 scale (assuming max efficiency around 0.5)
    return Math.min(100, Math.round(efficiency * 200));
  }

  /**
   * Calculate overall recommendation score
   * Returns score from 0-100
   */
  private calculateScore(
    moneyness: Moneyness,
    liquidityScore: number,
    costEfficiency: number,
    absDelta: number,
    impliedVolatility: number,
    sentiment: MarketSentiment
  ): number {
    let score = 0;

    // Moneyness score (0-30 points)
    // ATM and slightly OTM are generally preferred for long options
    if (moneyness === Moneyness.ATM) {
      score += 30;
    } else if (moneyness === Moneyness.OTM) {
      score += 25;
    } else {
      score += 20; // ITM
    }

    // Liquidity score (0-25 points)
    score += liquidityScore * 0.25;

    // Cost efficiency (0-25 points)
    score += costEfficiency * 0.25;

    // Delta score (0-10 points)
    // Prefer moderate delta (0.3-0.7 range)
    const deltaScore = absDelta >= 0.3 && absDelta <= 0.7 
      ? 10 
      : absDelta > 0.7 
        ? 8 
        : 5;
    score += deltaScore;

    // Volatility score (0-10 points)
    // Moderate volatility is preferred (0.2-0.5 range)
    const volScore = impliedVolatility >= 0.2 && impliedVolatility <= 0.5 
      ? 10 
      : impliedVolatility > 0.5 
        ? 7 
        : 5;
    score += volScore;

    return Math.min(100, Math.round(score));
  }

  /**
   * Determine risk level based on multiple factors
   */
  private determineRiskLevel(
    moneyness: Moneyness,
    liquidityScore: number,
    daysToExpiry: number,
    impliedVolatility: number
  ): RiskLevel {
    let riskPoints = 0;

    // Liquidity risk
    if (liquidityScore < 30) {
      riskPoints += 2;
    } else if (liquidityScore < 60) {
      riskPoints += 1;
    }

    // Time decay risk - expiring today or very soon is high risk
    if (daysToExpiry <= 0) {
      riskPoints += 3; // Critical risk for expired/expiring today
    } else if (daysToExpiry < 7) {
      riskPoints += 2;
    } else if (daysToExpiry < 30) {
      riskPoints += 1;
    }

    // Volatility risk - very high IV is dangerous
    if (impliedVolatility > 1.0) {
      riskPoints += 3; // Extreme volatility
    } else if (impliedVolatility > 0.6) {
      riskPoints += 2;
    } else if (impliedVolatility > 0.4) {
      riskPoints += 1;
    }

    // Moneyness risk (OTM is riskier)
    if (moneyness === Moneyness.OTM) {
      riskPoints += 1;
    }

    // Determine final risk level
    if (riskPoints >= 4) {
      return RiskLevel.HIGH;
    } else if (riskPoints >= 2) {
      return RiskLevel.MEDIUM;
    } else {
      return RiskLevel.LOW;
    }
  }

  /**
   * Generate analysis text for a contract
   */
  private generateAnalysis(
    contract: OptionContract,
    moneyness: Moneyness,
    liquidityScore: number,
    costEfficiency: number,
    sentiment: MarketSentiment
  ): string {
    const parts: string[] = [];

    // Moneyness description
    parts.push(`该合约为${moneyness}期权`);

    // Liquidity assessment
    if (liquidityScore >= 70) {
      parts.push('流动性良好');
    } else if (liquidityScore >= 40) {
      parts.push('流动性中等');
    } else {
      parts.push('流动性较低，需注意交易成本');
    }

    // Cost efficiency
    if (costEfficiency >= 70) {
      parts.push('成本效率高');
    } else if (costEfficiency >= 40) {
      parts.push('成本效率适中');
    } else {
      parts.push('成本效率较低');
    }

    // Time to expiry
    if (contract.daysToExpiry < 7) {
      parts.push('临近到期，时间价值衰减快');
    } else if (contract.daysToExpiry < 30) {
      parts.push('短期合约，需关注时间价值');
    } else if (contract.daysToExpiry > 90) {
      parts.push('长期合约，时间价值充足');
    }

    // Delta interpretation
    const absDelta = Math.abs(contract.delta);
    if (absDelta >= 0.7) {
      parts.push('Delta较高，价格敏感度强');
    } else if (absDelta >= 0.4) {
      parts.push('Delta适中，平衡风险收益');
    } else {
      parts.push('Delta较低，需较大价格变动才能盈利');
    }

    return parts.join('，') + '。';
  }
}
