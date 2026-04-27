// Greeks Calculator - Option Greeks computation using Black-Scholes model

import { Greeks, GreeksParams, OptionType } from '../types/index.js';

export interface GreeksCalculator {
  calculateGreeks(
    optionType: OptionType,
    spotPrice: number,
    strike: number,
    timeToExpiry: number,
    volatility: number,
    riskFreeRate: number
  ): Greeks;
  
  calculateDelta(params: GreeksParams): number;
  calculateGamma(params: GreeksParams): number;
  calculateTheta(params: GreeksParams): number;
  calculateVega(params: GreeksParams): number;
}

/**
 * Implementation of Black-Scholes Greeks Calculator
 */
export class BlackScholesGreeksCalculator implements GreeksCalculator {
  
  /**
   * Calculate all Greeks for an option
   */
  calculateGreeks(
    optionType: OptionType,
    spotPrice: number,
    strike: number,
    timeToExpiry: number,
    volatility: number,
    riskFreeRate: number
  ): Greeks {
    const params: GreeksParams = {
      optionType,
      spotPrice,
      strike,
      timeToExpiry,
      volatility,
      riskFreeRate
    };

    return {
      delta: this.calculateDelta(params),
      gamma: this.calculateGamma(params),
      theta: this.calculateTheta(params),
      vega: this.calculateVega(params),
      rho: this.calculateRho(params)
    };
  }

  /**
   * Calculate Delta - rate of change of option price with respect to underlying price
   */
  calculateDelta(params: GreeksParams): number {
    const { optionType, spotPrice, strike, timeToExpiry, volatility, riskFreeRate } = params;
    
    if (timeToExpiry <= 0) {
      // At expiration
      if (optionType === OptionType.CALL) {
        return spotPrice > strike ? 1 : 0;
      } else {
        return spotPrice < strike ? -1 : 0;
      }
    }

    const d1 = this.calculateD1(spotPrice, strike, timeToExpiry, volatility, riskFreeRate);
    
    if (optionType === OptionType.CALL) {
      return this.normalCDF(d1);
    } else {
      return this.normalCDF(d1) - 1;
    }
  }

  /**
   * Calculate Gamma - rate of change of delta with respect to underlying price
   */
  calculateGamma(params: GreeksParams): number {
    const { spotPrice, strike, timeToExpiry, volatility, riskFreeRate } = params;
    
    if (timeToExpiry <= 0) {
      return 0;
    }

    const d1 = this.calculateD1(spotPrice, strike, timeToExpiry, volatility, riskFreeRate);
    const numerator = this.normalPDF(d1);
    const denominator = spotPrice * volatility * Math.sqrt(timeToExpiry);
    
    return numerator / denominator;
  }

  /**
   * Calculate Theta - rate of change of option price with respect to time
   */
  calculateTheta(params: GreeksParams): number {
    const { optionType, spotPrice, strike, timeToExpiry, volatility, riskFreeRate } = params;
    
    if (timeToExpiry <= 0) {
      return 0;
    }

    const d1 = this.calculateD1(spotPrice, strike, timeToExpiry, volatility, riskFreeRate);
    const d2 = this.calculateD2(d1, volatility, timeToExpiry);
    
    const term1 = -(spotPrice * this.normalPDF(d1) * volatility) / (2 * Math.sqrt(timeToExpiry));
    
    if (optionType === OptionType.CALL) {
      const term2 = riskFreeRate * strike * Math.exp(-riskFreeRate * timeToExpiry) * this.normalCDF(d2);
      return (term1 - term2) / 365; // Convert to daily theta
    } else {
      const term2 = riskFreeRate * strike * Math.exp(-riskFreeRate * timeToExpiry) * this.normalCDF(-d2);
      return (term1 + term2) / 365; // Convert to daily theta
    }
  }

  /**
   * Calculate Vega - rate of change of option price with respect to volatility
   */
  calculateVega(params: GreeksParams): number {
    const { spotPrice, strike, timeToExpiry, volatility, riskFreeRate } = params;
    
    if (timeToExpiry <= 0) {
      return 0;
    }

    const d1 = this.calculateD1(spotPrice, strike, timeToExpiry, volatility, riskFreeRate);
    const vega = spotPrice * this.normalPDF(d1) * Math.sqrt(timeToExpiry);
    
    return vega / 100; // Convert to percentage point change
  }

  /**
   * Calculate Rho - rate of change of option price with respect to interest rate
   */
  private calculateRho(params: GreeksParams): number {
    const { optionType, spotPrice, strike, timeToExpiry, volatility, riskFreeRate } = params;
    
    if (timeToExpiry <= 0) {
      return 0;
    }

    const d1 = this.calculateD1(spotPrice, strike, timeToExpiry, volatility, riskFreeRate);
    const d2 = this.calculateD2(d1, volatility, timeToExpiry);
    
    if (optionType === OptionType.CALL) {
      const rho = strike * timeToExpiry * Math.exp(-riskFreeRate * timeToExpiry) * this.normalCDF(d2);
      return rho / 100; // Convert to percentage point change
    } else {
      const rho = -strike * timeToExpiry * Math.exp(-riskFreeRate * timeToExpiry) * this.normalCDF(-d2);
      return rho / 100; // Convert to percentage point change
    }
  }

  /**
   * Calculate d1 parameter for Black-Scholes formula
   */
  private calculateD1(
    spotPrice: number,
    strike: number,
    timeToExpiry: number,
    volatility: number,
    riskFreeRate: number
  ): number {
    const numerator = Math.log(spotPrice / strike) + (riskFreeRate + (volatility ** 2) / 2) * timeToExpiry;
    const denominator = volatility * Math.sqrt(timeToExpiry);
    return numerator / denominator;
  }

  /**
   * Calculate d2 parameter for Black-Scholes formula
   */
  private calculateD2(d1: number, volatility: number, timeToExpiry: number): number {
    return d1 - volatility * Math.sqrt(timeToExpiry);
  }

  /**
   * Standard normal cumulative distribution function (CDF)
   */
  private normalCDF(x: number): number {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const probability = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    
    return x > 0 ? 1 - probability : probability;
  }

  /**
   * Standard normal probability density function (PDF)
   */
  private normalPDF(x: number): number {
    return Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI);
  }
}
