// Test data factory for generating valid test data across all test files

import {
  UnderlyingAsset,
  PriceData,
  MarketAnalysis,
  MarketSentiment,
  TrendDirection,
  StrategyType,
  OptionContract,
  OptionType
} from '../../src/types/index.js';

/**
 * Creates a valid UnderlyingAsset with realistic default values
 * @param overrides Optional partial object to customize specific fields
 * @returns Complete UnderlyingAsset object
 */
export function createValidUnderlying(
  overrides?: Partial<UnderlyingAsset>
): UnderlyingAsset {
  const defaults: UnderlyingAsset = {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    nameCn: '苹果公司',
    currentPrice: 175.50,
    priceTimestamp: new Date(),
    change: 2.50,
    changePercent: 1.45,
    supportsOptions: true
  };

  return { ...defaults, ...overrides };
}

/**
 * Creates a valid OptionContract with realistic default values
 * @param overrides Optional partial object to customize specific fields
 * @returns Complete OptionContract object
 */
export function createValidContract(
  overrides?: Partial<OptionContract>
): OptionContract {
  const expiration = new Date();
  expiration.setDate(expiration.getDate() + 30); // 30 days from now

  const defaults: OptionContract = {
    contractSymbol: 'AAPL240119C00175000',
    underlyingSymbol: 'AAPL',
    type: OptionType.CALL,
    strike: 175.0,
    expiration,
    daysToExpiry: 30,
    premium: 8.50,
    bid: 8.40,
    ask: 8.60,
    delta: 0.55,
    gamma: 0.025,
    theta: -0.05,
    vega: 0.15,
    impliedVolatility: 0.28,
    volume: 1500,
    openInterest: 5000,
    lastUpdate: new Date()
  };

  return { ...defaults, ...overrides };
}

/**
 * Creates a valid PriceData with realistic default values
 * @param overrides Optional partial object to customize specific fields
 * @returns Complete PriceData object
 */
export function createValidPriceData(
  overrides?: Partial<PriceData>
): PriceData {
  const defaults: PriceData = {
    symbol: 'AAPL',
    price: 175.50,
    timestamp: new Date(),
    change: 2.50,
    changePercent: 1.45
  };

  return { ...defaults, ...overrides };
}

/**
 * Creates a valid MarketAnalysis with realistic default values
 * @param overrides Optional partial object to customize specific fields
 * @returns Complete MarketAnalysis object
 */
export function createValidMarketAnalysis(
  overrides?: Partial<MarketAnalysis>
): MarketAnalysis {
  const defaults: MarketAnalysis = {
    sentiment: MarketSentiment.BULLISH,
    volatility: 0.25,
    trend: TrendDirection.UPTREND,
    supportLevel: 170.0,
    resistanceLevel: 180.0,
    analysis: '市场呈现看涨趋势，技术指标显示上升动能强劲。建议关注突破阻力位的机会。',
    suggestedStrategy: StrategyType.LONG_CALL
  };

  return { ...defaults, ...overrides };
}
