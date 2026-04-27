// Option-related types and interfaces

export enum OptionType {
  CALL = "看涨期权",
  PUT = "看跌期权"
}

export enum RiskLevel {
  LOW = "低风险",
  MEDIUM = "中等风险",
  HIGH = "高风险"
}

export enum Moneyness {
  ITM = "实值",
  ATM = "平值",
  OTM = "虚值"
}

export interface OptionContract {
  contractSymbol: string;
  underlyingSymbol: string;
  type: OptionType;
  strike: number;
  expiration: Date;
  daysToExpiry: number;
  premium: number;
  bid: number;
  ask: number;
  delta: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  impliedVolatility: number;
  volume: number;
  openInterest: number;
  lastUpdate: Date;
}

export interface AnalyzedContract extends OptionContract {
  score: number;
  riskLevel: RiskLevel;
  analysis: string;
  keyMetrics: {
    moneyness: Moneyness;
    liquidityScore: number;
    costEfficiency: number;
  };
}

export interface Greeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho?: number;
}

export interface GreeksParams {
  optionType: OptionType;
  spotPrice: number;
  strike: number;
  timeToExpiry: number;
  volatility: number;
  riskFreeRate: number;
}

export interface WatchlistResult {
  success: boolean;
  addedCount: number;
  failedContracts?: string[];
  message: string;
}
