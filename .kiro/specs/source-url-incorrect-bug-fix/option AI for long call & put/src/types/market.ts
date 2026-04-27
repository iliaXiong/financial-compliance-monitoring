// Market-related types and interfaces

export enum MarketSentiment {
  BULLISH = "看涨",
  BEARISH = "看跌",
  NEUTRAL = "中性"
}

export enum TrendDirection {
  UPTREND = "上升趋势",
  DOWNTREND = "下降趋势",
  SIDEWAYS = "横盘整理"
}

export enum StrategyType {
  LONG_CALL = "Long Call",
  LONG_PUT = "Long Put"
}

export interface UnderlyingAsset {
  symbol: string;
  name: string;
  nameCn?: string;
  currentPrice: number;
  priceTimestamp: Date;
  change: number;
  changePercent: number;
  supportsOptions: boolean;
}

export interface PriceData {
  symbol: string;
  price: number;
  timestamp: Date;
  change: number;
  changePercent: number;
}

export interface TechnicalIndicators {
  volatility: number;
  trend: TrendDirection;
  supportLevel?: number;
  resistanceLevel?: number;
  rsi?: number;
  movingAverage?: {
    ma20: number;
    ma50: number;
    ma200: number;
  };
}

export interface MarketAnalysis {
  sentiment: MarketSentiment;
  volatility: number;
  trend: TrendDirection;
  supportLevel?: number;
  resistanceLevel?: number;
  analysis: string;
  suggestedStrategy: StrategyType;
}

export interface ValidationResult {
  isValid: boolean;
  symbol?: string;
  name?: string;
  error?: string;
  suggestions?: string[];
}

export enum TimePeriod {
  ONE_DAY = "1d",
  ONE_WEEK = "1w",
  ONE_MONTH = "1m",
  THREE_MONTHS = "3m",
  ONE_YEAR = "1y"
}
