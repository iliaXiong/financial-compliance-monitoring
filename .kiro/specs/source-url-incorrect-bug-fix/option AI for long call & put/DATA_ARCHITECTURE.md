# 数据架构说明 - Data Architecture

## 📊 概述

当前系统使用 **DataProvider 接口** 作为统一的数据访问层，支持灵活替换不同的数据源实现。

## 🏗️ 架构设计

### 1. DataProvider 接口

```typescript
export interface DataProvider {
  // 搜索标的资产
  searchUnderlying(query: string): Promise<UnderlyingAsset[]>;
  
  // 获取当前价格
  getCurrentPrice(symbol: string): Promise<PriceData>;
  
  // 获取历史价格
  getHistoricalPrices(symbol: string, period: TimePeriod): Promise<PriceData[]>;
  
  // 获取期权链
  getOptionChain(symbol: string, optionType?: OptionType): Promise<OptionContract[]>;
  
  // 检查是否支持期权
  supportsOptions(symbol: string): Promise<boolean>;
}
```

### 2. 当前实现：MockDataProvider

**位置**：`src/services/DataProvider.ts`

**特点**：
- ✅ 内存数据存储（Map 结构）
- ✅ 模拟真实 API 行为
- ✅ 支持失败模拟和重试测试
- ✅ 自动生成期权链数据
- ✅ 实时更新时间戳

**预置数据**：
```typescript
// 支持的标的
- AAPL / 苹果公司 (Apple Inc.)
  当前价格: $175.50
  涨跌: +$2.50 (+1.44%)
  
- TSLA / 特斯拉 (Tesla Inc.)
  当前价格: $242.80
  涨跌: -$5.20 (-2.10%)
  
- MSFT / 微软 (Microsoft Corporation)
  当前价格: $378.90
  涨跌: +$3.40 (+0.90%)
```

## 🔄 数据流程

### 标的价格获取流程

```
用户输入 "AAPL"
    ↓
UnderlyingAnalyzer.validateUnderlying()
    ↓
DataProvider.searchUnderlying("AAPL")
    ↓ [返回匹配的标的列表]
UnderlyingAnalyzer.getUnderlyingInfo("AAPL")
    ↓
DataProvider.getCurrentPrice("AAPL")
    ↓ [返回实时价格数据]
返回完整的 UnderlyingAsset 对象
```

### 详细步骤

#### 1. 搜索标的 (searchUnderlying)

```typescript
// 输入：用户查询（支持多种格式）
query: "AAPL" | "苹果" | "Apple"

// 处理流程：
1. 规范化查询字符串（大写、去空格）
2. 在 mockUnderlyings Map 中搜索
3. 匹配规则：
   - 精确匹配 symbol
   - 模糊匹配 name
   - 匹配 nameCn（中文名）
4. 去重并返回结果

// 输出：
[{
  symbol: 'AAPL',
  name: 'Apple Inc.',
  nameCn: '苹果公司',
  currentPrice: 175.50,
  priceTimestamp: Date,
  change: 2.50,
  changePercent: 1.44,
  supportsOptions: true
}]
```

#### 2. 获取当前价格 (getCurrentPrice)

```typescript
// 输入：标的代码
symbol: "AAPL"

// 处理流程：
1. 从 mockPrices Map 获取价格数据
2. 更新 timestamp 为当前时间
3. 应用重试逻辑（最多 3 次）

// 输出：
{
  symbol: 'AAPL',
  price: 175.50,
  timestamp: new Date(),
  change: 2.50,
  changePercent: 1.44
}
```

#### 3. 获取历史价格 (getHistoricalPrices)

```typescript
// 输入：标的代码 + 时间周期
symbol: "AAPL"
period: TimePeriod.ONE_MONTH

// 处理流程：
1. 从 mockHistoricalData Map 获取历史数据
2. 根据 period 过滤数据点
3. 生成模拟的价格波动

// 输出：PriceData[] (30天数据)
[
  { symbol: 'AAPL', price: 173.20, timestamp: Date(-30), ... },
  { symbol: 'AAPL', price: 174.10, timestamp: Date(-29), ... },
  ...
  { symbol: 'AAPL', price: 175.50, timestamp: Date(0), ... }
]
```

#### 4. 获取期权链 (getOptionChain)

```typescript
// 输入：标的代码 + 期权类型（可选）
symbol: "AAPL"
optionType: OptionType.CALL

// 处理流程：
1. 检查标的是否支持期权
2. 从 mockOptionChains Map 获取期权数据
3. 根据 optionType 过滤（CALL/PUT）
4. 更新所有合约的 lastUpdate 时间戳

// 输出：OptionContract[] (15个合约)
[
  {
    contractSymbol: 'AAPL240119C00175000',
    underlyingSymbol: 'AAPL',
    type: OptionType.CALL,
    strike: 175.00,
    expiration: Date('2024-01-19'),
    daysToExpiry: 30,
    premium: 5.50,
    bid: 5.45,
    ask: 5.55,
    delta: 0.52,
    gamma: 0.015,
    theta: -0.08,
    vega: 0.15,
    impliedVolatility: 0.25,
    volume: 1000,
    openInterest: 5000,
    lastUpdate: new Date()
  },
  ...
]
```

## 🔧 技术特性

### 1. 重试机制

```typescript
// 配置
DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,           // 最多重试 3 次
  retryDelay: 1000,        // 初始延迟 1 秒
  backoffMultiplier: 2     // 指数退避（1s, 2s, 4s）
}

// 使用 withRetry 包装所有数据操作
async getCurrentPrice(symbol: string): Promise<PriceData> {
  return withRetry(
    async () => {
      // 实际的数据获取逻辑
      const price = this.mockPrices.get(symbol);
      if (!price) throw new Error('Price not found');
      return price;
    },
    DEFAULT_RETRY_CONFIG,
    'getCurrentPrice'
  );
}
```

### 2. 错误处理

```typescript
// 统一的错误类型
interface DataError {
  type: 'DATA_ERROR';
  source: string;           // 'getCurrentPrice', 'getOptionChain', etc.
  message: string;          // 用户友好的中文错误信息
  retryable: boolean;       // 是否可重试
  fallbackAvailable: boolean; // 是否有降级方案
}

// 错误示例
{
  type: 'DATA_ERROR',
  source: 'getCurrentPrice',
  message: '未找到标的 INVALID 的价格数据',
  retryable: false,
  fallbackAvailable: false
}
```

### 3. 数据生成算法

#### 历史价格生成

```typescript
private generateHistoricalPrices(symbol: string, currentPrice: number, days: number) {
  // 1. 从当前日期往前推 days 天
  // 2. 每天生成一个价格点
  // 3. 价格 = currentPrice + 随机波动 - 时间衰减
  // 4. 确保价格不低于 currentPrice * 0.8
  
  // 模拟真实的价格波动模式
  const variation = (Math.random() - 0.5) * 10;
  const price = currentPrice + variation - (i * 0.1);
}
```

#### 期权链生成

```typescript
private generateMockOptionChain(symbol: string, spotPrice: number, optionType: OptionType) {
  // 1. 生成 5 个行权价（90%, 95%, 100%, 105%, 110% 现价）
  // 2. 生成 3 个到期日（30天、60天、90天）
  // 3. 总共 15 个合约（5 strikes × 3 expirations）
  
  // 4. 计算每个合约的 Greeks
  //    - Delta: 基于实值/虚值程度
  //    - Gamma: 0.01-0.03 随机
  //    - Theta: -0.05 到 -0.15
  //    - Vega: 0.1-0.3
  
  // 5. 计算权利金
  //    premium = |内在价值| + 时间价值 + 随机波动
  
  // 6. 生成流动性数据
  //    volume: 0-10000
  //    openInterest: 0-50000
}
```

## 🔌 如何替换为真实数据源

### 方案 1：实现新的 DataProvider

```typescript
// 创建 RealDataProvider.ts
export class YahooFinanceDataProvider implements DataProvider {
  private apiKey: string;
  private baseUrl: string = 'https://query1.finance.yahoo.com/v8/finance';
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async searchUnderlying(query: string): Promise<UnderlyingAsset[]> {
    // 调用 Yahoo Finance Search API
    const response = await fetch(
      `${this.baseUrl}/search?q=${query}&quotesCount=10`
    );
    const data = await response.json();
    
    // 转换为 UnderlyingAsset 格式
    return data.quotes.map(quote => ({
      symbol: quote.symbol,
      name: quote.longname || quote.shortname,
      currentPrice: quote.regularMarketPrice,
      change: quote.regularMarketChange,
      changePercent: quote.regularMarketChangePercent,
      supportsOptions: quote.hasOptions || false,
      priceTimestamp: new Date(quote.regularMarketTime * 1000)
    }));
  }
  
  async getCurrentPrice(symbol: string): Promise<PriceData> {
    // 调用 Yahoo Finance Quote API
    const response = await fetch(
      `${this.baseUrl}/quote?symbols=${symbol}`
    );
    const data = await response.json();
    const quote = data.quoteResponse.quotes[0];
    
    return {
      symbol: quote.symbol,
      price: quote.regularMarketPrice,
      timestamp: new Date(quote.regularMarketTime * 1000),
      change: quote.regularMarketChange,
      changePercent: quote.regularMarketChangePercent
    };
  }
  
  // 实现其他方法...
}
```

### 方案 2：使用其他数据源

**支持的数据源**：
- ✅ Yahoo Finance API
- ✅ Alpha Vantage API
- ✅ IEX Cloud API
- ✅ Polygon.io API
- ✅ TD Ameritrade API
- ✅ Interactive Brokers API

**集成步骤**：
1. 创建新的 DataProvider 实现类
2. 实现所有接口方法
3. 添加 API 密钥配置
4. 在初始化时替换 MockDataProvider

```typescript
// 替换数据源
// 原来：
const dataProvider = new MockDataProvider();

// 替换为：
const dataProvider = new YahooFinanceDataProvider(process.env.YAHOO_API_KEY);
// 或
const dataProvider = new AlphaVantageDataProvider(process.env.ALPHA_VANTAGE_KEY);
```

## 📈 数据更新频率

### MockDataProvider（当前）
- **价格数据**：每次请求时更新 timestamp
- **历史数据**：预生成，不实时更新
- **期权链**：预生成，每次请求更新 lastUpdate

### 真实数据源（建议）
- **价格数据**：实时或延迟 15 分钟
- **历史数据**：每日收盘后更新
- **期权链**：实时或延迟 15-20 分钟

## 🔒 数据缓存策略

### 当前实现
```typescript
// MockDataProvider 使用内存 Map 作为缓存
private mockUnderlyings: Map<string, UnderlyingAsset>
private mockPrices: Map<string, PriceData>
private mockHistoricalData: Map<string, PriceData[]>
private mockOptionChains: Map<string, OptionContract[]>
```

### 生产环境建议
```typescript
// 使用 Redis 或内存缓存
interface CacheConfig {
  priceCache: {
    ttl: 60,        // 价格缓存 60 秒
    maxSize: 1000   // 最多缓存 1000 个标的
  },
  optionChainCache: {
    ttl: 300,       // 期权链缓存 5 分钟
    maxSize: 100    // 最多缓存 100 个期权链
  },
  historicalCache: {
    ttl: 3600,      // 历史数据缓存 1 小时
    maxSize: 500
  }
}
```

## 🎯 总结

### 当前状态
- ✅ 使用 MockDataProvider 提供模拟数据
- ✅ 支持 3 个预置标的（AAPL、TSLA、MSFT）
- ✅ 自动生成历史价格和期权链
- ✅ 完整的重试和错误处理机制

### 优势
- 🚀 快速开发和测试
- 🧪 可控的测试环境
- 📊 完整的数据结构示例
- 🔄 易于替换为真实数据源

### 下一步
1. 选择合适的数据源 API
2. 实现对应的 DataProvider
3. 配置 API 密钥
4. 替换初始化代码
5. 测试真实数据集成

**无需修改任何业务逻辑代码**，只需替换 DataProvider 实现即可！
