# 切换到真实数据源指南

## 📊 当前状态

**❌ 当前使用模拟数据（MockDataProvider）**

- 价格是固定的预设值
- 不会从真实市场获取
- 仅用于开发和测试

## ✅ 如何切换到真实数据

### 方案 1：Yahoo Finance（免费，推荐用于开发）

#### 步骤 1：使用 YahooFinanceDataProvider

我已经为您创建了 `src/services/YahooFinanceDataProvider.ts`

#### 步骤 2：修改初始化代码

**修改文件**：`demo.ts` 或您的主程序入口

```typescript
// ❌ 原来（模拟数据）
import { MockDataProvider } from './src/services/DataProvider.js';
const dataProvider = new MockDataProvider();

// ✅ 改为（真实数据）
import { YahooFinanceDataProvider } from './src/services/YahooFinanceDataProvider.js';
const dataProvider = new YahooFinanceDataProvider();
```

#### 步骤 3：重新运行

```bash
npm run dev
```

现在系统将从 Yahoo Finance 获取真实的市场数据！

### 方案 2：Alpha Vantage（需要 API Key）

#### 步骤 1：获取 API Key

1. 访问 https://www.alphavantage.co/support/#api-key
2. 免费注册获取 API Key
3. 免费版限制：每分钟 5 次请求，每天 500 次

#### 步骤 2：创建 AlphaVantageDataProvider

```typescript
// src/services/AlphaVantageDataProvider.ts
export class AlphaVantageDataProvider implements DataProvider {
  private apiKey: string;
  private baseUrl = 'https://www.alphavantage.co/query';
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async getCurrentPrice(symbol: string): Promise<PriceData> {
    const response = await fetch(
      `${this.baseUrl}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.apiKey}`
    );
    const data = await response.json();
    const quote = data['Global Quote'];
    
    return {
      symbol: quote['01. symbol'],
      price: parseFloat(quote['05. price']),
      timestamp: new Date(),
      change: parseFloat(quote['09. change']),
      changePercent: parseFloat(quote['10. change percent'].replace('%', ''))
    };
  }
  
  // 实现其他方法...
}
```

#### 步骤 3：使用 API Key

```typescript
// 从环境变量读取
const apiKey = process.env.ALPHA_VANTAGE_API_KEY || 'your-api-key';
const dataProvider = new AlphaVantageDataProvider(apiKey);
```

### 方案 3：其他数据源

#### IEX Cloud
- 官网：https://iexcloud.io/
- 特点：实时数据，支持期权
- 价格：免费版每月 50,000 次请求

#### Polygon.io
- 官网：https://polygon.io/
- 特点：高质量数据，WebSocket 支持
- 价格：免费版延迟 15 分钟

#### TD Ameritrade
- 官网：https://developer.tdameritrade.com/
- 特点：官方 API，数据质量高
- 价格：免费（需要 TD 账户）

## 🔄 完整示例

### 修改 demo.ts

```typescript
#!/usr/bin/env tsx
import * as readline from 'readline';
import { DefaultDialogEngine } from './src/dialog/DialogEngine.js';
import { StateManagerImpl } from './src/dialog/StateManager.js';
import { DefaultUnderlyingAnalyzer } from './src/analyzers/UnderlyingAnalyzer.js';
import { DefaultOptionAnalyzer } from './src/analyzers/OptionAnalyzer.js';
import { DefaultTradeService } from './src/services/TradeService.js';
import { MockLLMService } from './src/services/LLMService.js';
import { BlackScholesGreeksCalculator } from './src/calculators/GreeksCalculator.js';

// ============================================================================
// 数据源配置 - 在这里切换
// ============================================================================

// 方案 1：使用模拟数据（开发/测试）
// import { MockDataProvider } from './src/services/DataProvider.js';
// const dataProvider = new MockDataProvider();

// 方案 2：使用 Yahoo Finance（真实数据，免费）
import { YahooFinanceDataProvider } from './src/services/YahooFinanceDataProvider.js';
const dataProvider = new YahooFinanceDataProvider();

// 方案 3：使用 Alpha Vantage（真实数据，需要 API Key）
// import { AlphaVantageDataProvider } from './src/services/AlphaVantageDataProvider.js';
// const apiKey = process.env.ALPHA_VANTAGE_API_KEY || 'your-api-key';
// const dataProvider = new AlphaVantageDataProvider(apiKey);

// ============================================================================
// 其余代码保持不变
// ============================================================================

console.log('🚀 正在启动期权交易助手...\n');

const stateManager = new StateManagerImpl();
const greeksCalculator = new BlackScholesGreeksCalculator();
const llmService = new MockLLMService();
const underlyingAnalyzer = new DefaultUnderlyingAnalyzer(dataProvider, llmService);
const optionAnalyzer = new DefaultOptionAnalyzer(dataProvider, greeksCalculator);
const tradeService = new DefaultTradeService();

const dialogEngine = new DefaultDialogEngine(
  stateManager,
  underlyingAnalyzer,
  optionAnalyzer,
  tradeService,
  llmService
);

// ... 其余代码
```

## 📝 数据源对比

| 数据源 | 价格 | 实时性 | 期权数据 | API 限制 | 推荐场景 |
|--------|------|--------|----------|----------|----------|
| **MockDataProvider** | 免费 | N/A | ✅ | 无 | 开发/测试 |
| **Yahoo Finance** | 免费 | 延迟 15 分钟 | ✅ | 无官方限制 | 开发/演示 |
| **Alpha Vantage** | 免费/付费 | 实时 | ❌ | 5次/分钟 | 个人项目 |
| **IEX Cloud** | 免费/付费 | 实时 | ✅ | 50K次/月 | 小型应用 |
| **Polygon.io** | 付费 | 实时 | ✅ | 按套餐 | 生产环境 |
| **TD Ameritrade** | 免费 | 实时 | ✅ | 120次/分钟 | 专业应用 |

## ⚠️ 注意事项

### 1. Yahoo Finance 非官方 API
- Yahoo Finance 没有官方 API 文档
- API 端点可能随时变化
- 不建议用于生产环境
- 适合开发和演示

### 2. API 限制
```typescript
// 建议添加请求限流
class RateLimiter {
  private requests: number[] = [];
  
  async checkLimit(maxRequests: number, timeWindow: number): Promise<void> {
    const now = Date.now();
    this.requests = this.requests.filter(t => now - t < timeWindow);
    
    if (this.requests.length >= maxRequests) {
      const waitTime = timeWindow - (now - this.requests[0]);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.requests.push(now);
  }
}
```

### 3. 错误处理
```typescript
// 已内置重试机制
DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000,
  backoffMultiplier: 2
}

// 建议添加降级策略
try {
  const price = await realDataProvider.getCurrentPrice(symbol);
} catch (error) {
  console.warn('Real data failed, falling back to mock');
  const price = await mockDataProvider.getCurrentPrice(symbol);
}
```

### 4. 缓存策略
```typescript
// 建议添加缓存减少 API 调用
class CachedDataProvider implements DataProvider {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private ttl = 60000; // 60 秒
  
  async getCurrentPrice(symbol: string): Promise<PriceData> {
    const cached = this.cache.get(symbol);
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.data;
    }
    
    const data = await this.realProvider.getCurrentPrice(symbol);
    this.cache.set(symbol, { data, timestamp: Date.now() });
    return data;
  }
}
```

## 🎯 推荐方案

### 开发阶段（当前）
```typescript
✅ 使用 MockDataProvider
- 快速开发
- 无需网络
- 数据可控
```

### 演示阶段
```typescript
✅ 使用 YahooFinanceDataProvider
- 真实数据
- 免费
- 无需注册
```

### 生产环境
```typescript
✅ 使用 TD Ameritrade 或 Polygon.io
- 官方 API
- 数据质量高
- 稳定可靠
```

## 🚀 快速切换

只需修改一行代码：

```typescript
// 开发
const dataProvider = new MockDataProvider();

// 演示
const dataProvider = new YahooFinanceDataProvider();

// 生产
const dataProvider = new TDAmeritrade DataProvider(apiKey);
```

**无需修改任何业务逻辑！** 🎉
