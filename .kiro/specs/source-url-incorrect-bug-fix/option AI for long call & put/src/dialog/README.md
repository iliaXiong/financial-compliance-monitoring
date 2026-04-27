# Dialog Engine

The Dialog Engine is the core orchestrator of the options trading tool, managing the complete conversation flow from underlying asset selection to trade link generation.

## Architecture

The Dialog Engine implements a state machine with the following states:

1. **AWAITING_UNDERLYING** - Waiting for user to input underlying asset
2. **CONFIRMING_UNDERLYING** - Confirming the selected underlying
3. **ANALYZING_UNDERLYING** - Performing market sentiment analysis
4. **SUGGESTING_STRATEGY** - Presenting strategy recommendation
5. **ANALYZING_OPTIONS** - Fetching and analyzing option contracts
6. **PRESENTING_CONTRACTS** - Displaying analyzed contracts
7. **AWAITING_SELECTION** - Waiting for user to select contracts
8. **GENERATING_TRADE_LINK** - Generating trade links and adding to watchlist
9. **COMPLETED** - Workflow completed

## Usage Example

```typescript
import { DefaultDialogEngine } from './dialog/DialogEngine.js';
import { StateManagerImpl } from './dialog/StateManager.js';
import { DefaultUnderlyingAnalyzer } from './analyzers/UnderlyingAnalyzer.js';
import { DefaultOptionAnalyzer } from './analyzers/OptionAnalyzer.js';
import { DefaultTradeService } from './services/TradeService.js';
import { MockLLMService } from './services/LLMService.js';
import { MockDataProvider } from './services/DataProvider.js';
import { BlackScholesGreeksCalculator } from './calculators/GreeksCalculator.js';

// Initialize components
const dataProvider = new MockDataProvider();
const stateManager = new StateManagerImpl();
const greeksCalculator = new BlackScholesGreeksCalculator();
const llmService = new MockLLMService();
const underlyingAnalyzer = new DefaultUnderlyingAnalyzer(dataProvider, llmService);
const optionAnalyzer = new DefaultOptionAnalyzer(dataProvider, greeksCalculator);
const tradeService = new DefaultTradeService();

// Create dialog engine
const dialogEngine = new DefaultDialogEngine(
  stateManager,
  underlyingAnalyzer,
  optionAnalyzer,
  tradeService,
  llmService
);

// Start a new session
const sessionId = dialogEngine.startSession();

// Process user inputs
const response1 = await dialogEngine.processInput(sessionId, 'AAPL');
console.log(response1.message);
// Output: 找到标的：Apple Inc.（AAPL）
//         当前价格：$175.50
//         涨跌：+2.50 (+1.44%)
//         
//         是否确认分析此标的？

const response2 = await dialogEngine.processInput(sessionId, '确认');
console.log(response2.message);
// Output: 市场分析完成！
//         [市场分析详情...]
//         市场情绪：看涨 📈
//         建议策略：Long Call
//         
//         是否继续分析期权合约？

const response3 = await dialogEngine.processInput(sessionId, '继续分析');
console.log(response3.message);
// Output: 为您找到 X 个 Long Call 合约，以下是推荐的前 5 个：
//         [合约列表...]

const response4 = await dialogEngine.processInput(sessionId, '1');
console.log(response4.message);
// Output: 已为您生成 1 个合约的交易链接：
//         [交易链接...]
//         成功添加 1 个合约到自选列表

// Get session state at any time
const state = dialogEngine.getSessionState(sessionId);
console.log(state.currentState); // COMPLETED
console.log(state.underlying); // { symbol: 'AAPL', name: 'Apple Inc.', ... }
console.log(state.selectedContracts); // [{ contractSymbol: '...', ... }]

// Reset session to start over
dialogEngine.resetSession(sessionId);
```

## State Transitions

```
AWAITING_UNDERLYING
    ↓ (valid underlying input)
CONFIRMING_UNDERLYING
    ↓ (confirmation)
ANALYZING_UNDERLYING
    ↓ (analysis complete)
SUGGESTING_STRATEGY
    ↓ (continue)
ANALYZING_OPTIONS
    ↓ (contracts fetched)
PRESENTING_CONTRACTS
    ↓ (auto-transition)
AWAITING_SELECTION
    ↓ (contract selection)
GENERATING_TRADE_LINK
    ↓ (links generated)
COMPLETED

Any state → AWAITING_UNDERLYING (on reset/restart)
```

## Natural Language Support

The Dialog Engine supports natural language input in Chinese:

- **Confirmations**: "是", "确认", "好的", "好", "对", "yes", "ok", "继续"
- **Rejections**: "否", "不是", "不", "取消", "no", "重新"
- **Special Commands**:
  - "重新开始" / "重置" / "restart" - Reset session
  - "帮助" / "help" / "?" - Show help message

## Error Handling

The Dialog Engine handles errors gracefully:

- **Invalid underlying**: Returns error message with suggestions
- **API failures**: Falls back to cached data or simplified analysis
- **Invalid session**: Returns error response with option to restart
- **State inconsistencies**: Automatically recovers to safe state

## Context Maintenance

The Dialog Engine maintains complete conversation context:

- **Session state**: Current state, underlying, sentiment, strategy, contracts
- **History**: All user inputs and system responses with timestamps
- **Persistence**: Session data persists until explicitly reset or expired

## Testing

See `tests/unit/dialog/DialogEngine.test.ts` for comprehensive unit tests and `tests/integration/DialogEngine.integration.test.ts` for integration tests demonstrating the complete workflow.
