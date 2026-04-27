# Test Mocks

This directory provides convenient access to mock implementations for testing.

## Available Mocks

### MockDataProvider

A fully functional mock implementation of the `DataProvider` interface with pre-configured test data for AAPL, TSLA, and MSFT.

**Features:**
- Pre-loaded mock data for common stocks
- Configurable failure simulation for testing retry logic
- Methods to inject custom test data
- Support for all DataProvider operations

**Usage:**

```typescript
import { createMockDataProvider, configureMockFailure } from '../mocks';

describe('My Test Suite', () => {
  it('should handle data provider operations', async () => {
    const dataProvider = createMockDataProvider();
    
    // Search for underlying
    const results = await dataProvider.searchUnderlying('AAPL');
    expect(results).toHaveLength(1);
    expect(results[0].symbol).toBe('AAPL');
  });
  
  it('should handle API failures with retry', async () => {
    const dataProvider = createMockDataProvider();
    
    // Configure to fail twice, then succeed
    configureMockFailure(dataProvider, 2);
    
    // This will retry and eventually succeed
    const price = await dataProvider.getCurrentPrice('AAPL');
    expect(price).toBeDefined();
  });
  
  it('should inject custom test data', async () => {
    const dataProvider = createMockDataProvider();
    
    // Add custom underlying
    dataProvider.addMockUnderlying({
      symbol: 'TEST',
      name: 'Test Company',
      nameCn: '测试公司',
      currentPrice: 100.00,
      priceTimestamp: new Date(),
      change: 1.50,
      changePercent: 1.52,
      supportsOptions: true
    });
    
    const results = await dataProvider.searchUnderlying('TEST');
    expect(results[0].symbol).toBe('TEST');
  });
});
```

**Available Methods for Test Data Injection:**

- `addMockUnderlying(asset: UnderlyingAsset)` - Add a custom underlying asset
- `addMockPrice(symbol: string, price: PriceData)` - Add custom price data
- `addMockHistoricalData(symbol: string, data: PriceData[])` - Add historical price data
- `addMockOptionChain(symbol: string, optionType: OptionType, contracts: OptionContract[])` - Add option chain data

**Failure Simulation:**

- `simulateFailure(maxFailures: number)` - Configure operations to fail N times before succeeding
- `resetFailureSimulation()` - Reset to normal operation

### MockLLMService

A rule-based mock implementation of the `LLMService` interface that simulates LLM responses for market analysis.

**Features:**
- Rule-based sentiment analysis
- Contract scoring and analysis
- Natural language response generation
- Configurable availability for error testing

**Usage:**

```typescript
import { createMockLLMService } from '../mocks';
import { MarketSentiment, TrendDirection } from '../../src/types';

describe('LLM Service Tests', () => {
  it('should analyze market sentiment', async () => {
    const llmService = createMockLLMService();
    
    const analysis = await llmService.analyzeSentiment(
      mockUnderlying,
      mockPriceHistory,
      {
        volatility: 0.25,
        trend: TrendDirection.UPTREND,
        supportLevel: 170,
        resistanceLevel: 180
      }
    );
    
    expect(analysis.sentiment).toBe(MarketSentiment.BULLISH);
    expect(analysis.confidence).toBeGreaterThan(0);
    expect(analysis.reasoning).toBeDefined();
  });
  
  it('should handle service unavailability', async () => {
    const llmService = createMockLLMService(false); // Create unavailable service
    
    await expect(
      llmService.analyzeSentiment(mockUnderlying, mockPriceHistory, mockIndicators)
    ).rejects.toThrow('LLM service is unavailable');
  });
  
  it('should analyze option contracts', async () => {
    const llmService = createMockLLMService();
    
    const analysis = await llmService.analyzeOptionContract(
      mockContract,
      mockUnderlying,
      MarketSentiment.BULLISH
    );
    
    expect(analysis.score).toBeGreaterThanOrEqual(0);
    expect(analysis.score).toBeLessThanOrEqual(100);
    expect(analysis.riskLevel).toBeDefined();
    expect(analysis.keyPoints).toBeInstanceOf(Array);
  });
});
```

**Availability Control:**

- `setAvailability(available: boolean)` - Control whether the service is available

## Factory Functions

The module provides convenient factory functions:

- `createMockDataProvider()` - Create a new MockDataProvider with default data
- `createMockLLMService(available?: boolean)` - Create a new MockLLMService
- `configureMockFailure(provider, maxFailures)` - Configure failure simulation
- `resetMockFailure(provider)` - Reset failure simulation

## Import Patterns

```typescript
// Import specific mocks
import { MockDataProvider, MockLLMService } from '../mocks';

// Import factory functions
import { createMockDataProvider, createMockLLMService } from '../mocks';

// Import types
import { DataProvider, LLMService, SentimentAnalysis } from '../mocks';
```

## Testing Best Practices

1. **Use factory functions** - Prefer `createMockDataProvider()` over `new MockDataProvider()` for consistency
2. **Reset state between tests** - Use `beforeEach` to create fresh instances
3. **Inject custom data** - Use the `addMock*` methods to create specific test scenarios
4. **Test error paths** - Use failure simulation to test retry logic and error handling
5. **Verify mock behavior** - Ensure mocks behave consistently with real implementations

## Example Test Structure

```typescript
import { createMockDataProvider, createMockLLMService } from '../mocks';

describe('Component Tests', () => {
  let dataProvider: MockDataProvider;
  let llmService: MockLLMService;
  
  beforeEach(() => {
    // Create fresh instances for each test
    dataProvider = createMockDataProvider();
    llmService = createMockLLMService();
  });
  
  afterEach(() => {
    // Reset any failure simulations
    dataProvider.resetFailureSimulation();
  });
  
  it('should work with default data', async () => {
    // Test with pre-configured data
  });
  
  it('should work with custom data', async () => {
    // Inject custom test data
    dataProvider.addMockUnderlying(customAsset);
    // Test with custom data
  });
  
  it('should handle errors', async () => {
    // Configure failure
    dataProvider.simulateFailure(3);
    // Test error handling
  });
});
```
