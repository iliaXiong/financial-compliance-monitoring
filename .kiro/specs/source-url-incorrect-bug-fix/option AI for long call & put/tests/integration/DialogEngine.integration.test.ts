// Integration test for DialogEngine - demonstrates full workflow

import { describe, it, expect, beforeEach } from 'vitest';
import { DefaultDialogEngine } from '../../src/dialog/DialogEngine.js';
import { StateManagerImpl } from '../../src/dialog/StateManager.js';
import { DefaultUnderlyingAnalyzer } from '../../src/analyzers/UnderlyingAnalyzer.js';
import { DefaultOptionAnalyzer } from '../../src/analyzers/OptionAnalyzer.js';
import { DefaultTradeService } from '../../src/services/TradeService.js';
import { MockLLMService } from '../../src/services/LLMService.js';
import { MockDataProvider } from '../../tests/mocks/index.js';
import { BlackScholesGreeksCalculator } from '../../src/calculators/GreeksCalculator.js';
import { DialogState } from '../../src/types/index.js';

describe('DialogEngine Integration Test', () => {
  let dialogEngine: DefaultDialogEngine;
  let dataProvider: MockDataProvider;

  beforeEach(() => {
    // Create real instances with mock data provider
    dataProvider = new MockDataProvider();
    const stateManager = new StateManagerImpl();
    const greeksCalculator = new BlackScholesGreeksCalculator();
    const llmService = new MockLLMService();
    const underlyingAnalyzer = new DefaultUnderlyingAnalyzer(dataProvider, llmService);
    const optionAnalyzer = new DefaultOptionAnalyzer(dataProvider, greeksCalculator);
    const tradeService = new DefaultTradeService();

    dialogEngine = new DefaultDialogEngine(
      stateManager,
      underlyingAnalyzer,
      optionAnalyzer,
      tradeService,
      llmService
    );
  });

  it('should complete full workflow: AAPL Long Call analysis', async () => {
    // Step 1: Start session
    const sessionId = dialogEngine.startSession();
    expect(sessionId).toBeDefined();

    let state = dialogEngine.getSessionState(sessionId);
    expect(state!.currentState).toBe(DialogState.AWAITING_UNDERLYING);

    // Step 2: Input underlying - AAPL
    const response1 = await dialogEngine.processInput(sessionId, 'AAPL');
    expect(response1.state).toBe(DialogState.CONFIRMING_UNDERLYING);
    expect(response1.message).toContain('Apple');
    expect(response1.message).toContain('175'); // Mock data returns 175.50

    // Step 3: Confirm underlying
    const response2 = await dialogEngine.processInput(sessionId, '确认');
    expect(response2.state).toBe(DialogState.SUGGESTING_STRATEGY);
    expect(response2.message).toContain('市场分析完成');
    // Strategy can be either Long Call or Long Put depending on market analysis
    expect(response2.message).toMatch(/Long (Call|Put)/);

    // Step 4: Continue to analyze options
    const response3 = await dialogEngine.processInput(sessionId, '继续分析');
    expect(response3.state).toBe(DialogState.AWAITING_SELECTION);
    expect(response3.message).toContain('AAPL');
    expect(response3.message).toContain('行权价');

    // Step 5: Select first contract
    const response4 = await dialogEngine.processInput(sessionId, '1');
    expect(response4.state).toBe(DialogState.COMPLETED);
    expect(response4.message).toContain('交易链接');
    expect(response4.message).toContain('https://trade.example.com');
    expect(response4.message).toContain('成功添加');

    // Verify final state
    state = dialogEngine.getSessionState(sessionId);
    expect(state!.underlying).toBeDefined();
    expect(state!.underlying!.symbol).toBe('AAPL');
    expect(state!.selectedContracts).toBeDefined();
    expect(state!.selectedContracts!.length).toBe(1);
    expect(state!.history.length).toBeGreaterThan(8); // Multiple interactions
  });

  it('should handle restart at any point in the workflow', async () => {
    const sessionId = dialogEngine.startSession();

    // Progress through workflow
    await dialogEngine.processInput(sessionId, 'AAPL');
    await dialogEngine.processInput(sessionId, '确认');

    // Restart
    const restartResponse = await dialogEngine.processInput(sessionId, '重新开始');
    expect(restartResponse.state).toBe(DialogState.AWAITING_UNDERLYING);

    // Verify state is reset
    const state = dialogEngine.getSessionState(sessionId);
    expect(state!.underlying).toBeUndefined();
    expect(state!.sentiment).toBeUndefined();
    expect(state!.strategy).toBeUndefined();
  });

  it('should support Chinese name input for underlying', async () => {
    const sessionId = dialogEngine.startSession();

    // Input Chinese name
    const response = await dialogEngine.processInput(sessionId, '苹果');
    expect(response.state).toBe(DialogState.CONFIRMING_UNDERLYING);
    expect(response.message).toContain('Apple');
    expect(response.data.underlying.symbol).toBe('AAPL');
  });

  it('should handle multiple contract selection', async () => {
    const sessionId = dialogEngine.startSession();

    // Progress to contract selection
    await dialogEngine.processInput(sessionId, 'AAPL');
    await dialogEngine.processInput(sessionId, '确认');
    await dialogEngine.processInput(sessionId, '继续分析');

    // Select multiple contracts
    const response = await dialogEngine.processInput(sessionId, '1,2,3');
    expect(response.state).toBe(DialogState.COMPLETED);
    expect(response.data.tradeLinks.length).toBe(3);

    // Verify all contracts were added to watchlist
    const state = dialogEngine.getSessionState(sessionId);
    expect(state!.selectedContracts!.length).toBe(3);
  });

  it('should maintain conversation context throughout workflow', async () => {
    const sessionId = dialogEngine.startSession();

    await dialogEngine.processInput(sessionId, 'AAPL');
    await dialogEngine.processInput(sessionId, '确认');
    await dialogEngine.processInput(sessionId, '继续分析');

    const state = dialogEngine.getSessionState(sessionId);
    
    // Verify all context is maintained
    expect(state!.underlying).toBeDefined();
    expect(state!.sentiment).toBeDefined();
    expect(state!.strategy).toBeDefined();
    expect(state!.analyzedContracts).toBeDefined();
    expect(state!.history.length).toBeGreaterThan(5);

    // Verify history contains all user inputs
    const userInputs = state!.history.filter(h => h.role === 'user').map(h => h.content);
    expect(userInputs).toContain('AAPL');
    expect(userInputs).toContain('确认');
    expect(userInputs).toContain('继续分析');
  });

  it('should handle invalid underlying gracefully', async () => {
    const sessionId = dialogEngine.startSession();

    const response = await dialogEngine.processInput(sessionId, 'INVALID_SYMBOL_XYZ');
    expect(response.state).toBe(DialogState.AWAITING_UNDERLYING);
    expect(response.message).toContain('未找到标的');
  });

  it('should handle rejection and allow re-selection', async () => {
    const sessionId = dialogEngine.startSession();

    // Input underlying
    await dialogEngine.processInput(sessionId, 'AAPL');

    // Reject and go back
    const response = await dialogEngine.processInput(sessionId, '重新选择');
    expect(response.state).toBe(DialogState.AWAITING_UNDERLYING);
    expect(response.message).toContain('重新输入');

    // Verify underlying was cleared
    const state = dialogEngine.getSessionState(sessionId);
    expect(state!.underlying).toBeUndefined();
  });
});
