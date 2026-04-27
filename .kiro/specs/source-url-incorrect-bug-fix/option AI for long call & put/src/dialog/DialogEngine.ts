// Dialog Engine - Manages conversation flow and state transitions

import type { 
  DialogEngine, 
  DialogResponse, 
  SessionId, 
  SessionState,
  StateManager,
  DialogHistoryEntry
} from '../types/index.js';
import { DialogState, MarketSentiment } from '../types/index.js';
import type { UnderlyingAnalyzer } from '../analyzers/UnderlyingAnalyzer.js';
import type { OptionAnalyzer } from '../analyzers/OptionAnalyzer.js';
import type { TradeService } from '../services/TradeService.js';
import type { LLMService } from '../services/LLMService.js';
import { UserIntent } from '../services/LLMService.js';

/**
 * Default implementation of DialogEngine
 * Orchestrates all components to manage the complete dialog flow
 * 
 * State transitions:
 * 1. AWAITING_UNDERLYING → CONFIRMING_UNDERLYING (on valid underlying input)
 * 2. CONFIRMING_UNDERLYING → ANALYZING_UNDERLYING (on confirmation)
 * 3. ANALYZING_UNDERLYING → SUGGESTING_STRATEGY (after sentiment analysis)
 * 4. SUGGESTING_STRATEGY → ANALYZING_OPTIONS (on strategy selection)
 * 5. ANALYZING_OPTIONS → PRESENTING_CONTRACTS (after contract analysis)
 * 6. PRESENTING_CONTRACTS → AWAITING_SELECTION (contracts displayed)
 * 7. AWAITING_SELECTION → GENERATING_TRADE_LINK (on contract selection)
 * 8. GENERATING_TRADE_LINK → COMPLETED (after trade link generation)
 * 9. Any state → AWAITING_UNDERLYING (on reset)
 */
export class DefaultDialogEngine implements DialogEngine {
  constructor(
    private stateManager: StateManager,
    private underlyingAnalyzer: UnderlyingAnalyzer,
    private optionAnalyzer: OptionAnalyzer,
    private tradeService: TradeService,
    private llmService: LLMService
  ) {}

  /**
   * Starts a new session
   * Initial state: AWAITING_UNDERLYING
   */
  startSession(): SessionId {
    const sessionId = this.stateManager.createSession();
    
    // Add initial system message
    this.addHistoryEntry(sessionId, 'system', '欢迎使用期权交易工具！', DialogState.AWAITING_UNDERLYING);
    
    return sessionId;
  }

  /**
   * Processes user input and returns appropriate response
   * Implements state machine logic for all DialogState transitions
   */
  async processInput(sessionId: SessionId, userInput: string): Promise<DialogResponse> {
    // Get current session state
    const state = this.stateManager.getState(sessionId);
    
    if (!state) {
      return {
        message: '会话不存在或已过期，请重新开始',
        state: DialogState.AWAITING_UNDERLYING,
        options: ['重新开始']
      };
    }

    // Add user input to history
    this.addHistoryEntry(sessionId, 'user', userInput, state.currentState);

    // Parse user intent
    const intent = this.parseUserIntent(userInput, state.currentState);

    // Handle special intents (restart, help)
    if (intent === UserIntent.RESTART) {
      return await this.handleRestart(sessionId);
    }

    if (intent === UserIntent.HELP) {
      return await this.handleHelp(sessionId, state);
    }

    // Process based on current state
    let response: DialogResponse;

    switch (state.currentState) {
      case DialogState.AWAITING_UNDERLYING:
        response = await this.handleAwaitingUnderlying(sessionId, userInput, state);
        break;

      case DialogState.CONFIRMING_UNDERLYING:
        response = await this.handleConfirmingUnderlying(sessionId, userInput, state);
        break;

      case DialogState.ANALYZING_UNDERLYING:
        response = await this.handleAnalyzingUnderlying(sessionId, state);
        break;

      case DialogState.SUGGESTING_STRATEGY:
        response = await this.handleSuggestingStrategy(sessionId, userInput, state);
        break;

      case DialogState.ANALYZING_OPTIONS:
        response = await this.handleAnalyzingOptions(sessionId, state);
        break;

      case DialogState.PRESENTING_CONTRACTS:
        response = await this.handlePresentingContracts(sessionId, state);
        break;

      case DialogState.AWAITING_SELECTION:
        response = await this.handleAwaitingSelection(sessionId, userInput, state);
        break;

      case DialogState.GENERATING_TRADE_LINK:
        response = await this.handleGeneratingTradeLink(sessionId, state);
        break;

      case DialogState.COMPLETED:
        response = await this.handleCompleted(sessionId, userInput);
        break;

      default:
        response = {
          message: '系统状态异常，请重新开始',
          state: DialogState.AWAITING_UNDERLYING,
          options: ['重新开始']
        };
    }

    // Add system response to history
    this.addHistoryEntry(sessionId, 'system', response.message, response.state);

    return response;
  }

  /**
   * Gets current session state
   */
  getSessionState(sessionId: SessionId): SessionState | null {
    return this.stateManager.getState(sessionId);
  }

  /**
   * Resets session to initial state
   */
  resetSession(sessionId: SessionId): void {
    const state = this.stateManager.getState(sessionId);
    
    if (!state) {
      return;
    }

    // Clear all business data
    const resetState: SessionState = {
      sessionId,
      currentState: DialogState.AWAITING_UNDERLYING,
      underlying: undefined,
      sentiment: undefined,
      strategy: undefined,
      analyzedContracts: undefined,
      selectedContracts: undefined,
      history: state.history, // Keep history
      createdAt: state.createdAt,
      updatedAt: new Date()
    };

    this.stateManager.updateState(sessionId, resetState);
  }

  // ============================================================================
  // State Handlers
  // ============================================================================

  /**
   * State: AWAITING_UNDERLYING
   * Validates underlying input and transitions to CONFIRMING_UNDERLYING
   */
  private async handleAwaitingUnderlying(
    sessionId: SessionId,
    userInput: string,
    state: SessionState
  ): Promise<DialogResponse> {
    // Validate underlying
    const validation = await this.underlyingAnalyzer.validateUnderlying(userInput);

    if (!validation.isValid) {
      // Validation failed - stay in same state
      let message = validation.error || '标的验证失败，请重新输入';
      
      if (validation.suggestions && validation.suggestions.length > 0) {
        message += `\n\n您是否想输入：${validation.suggestions.join('、')}？`;
      }

      return {
        message,
        state: DialogState.AWAITING_UNDERLYING,
        options: ['重新输入', '帮助']
      };
    }

    // Get full underlying info
    const underlying = await this.underlyingAnalyzer.getUnderlyingInfo(validation.symbol!);

    // Update state
    state.underlying = underlying;
    state.currentState = DialogState.CONFIRMING_UNDERLYING;
    this.stateManager.updateState(sessionId, state);

    // Generate confirmation message
    const message = `找到标的：${underlying.name}（${underlying.symbol}）\n` +
      `当前价格：$${underlying.currentPrice.toFixed(2)}\n` +
      `涨跌：${underlying.change >= 0 ? '+' : ''}${underlying.change.toFixed(2)} (${underlying.changePercent >= 0 ? '+' : ''}${underlying.changePercent.toFixed(2)}%)\n\n` +
      `是否确认分析此标的？`;

    return {
      message,
      state: DialogState.CONFIRMING_UNDERLYING,
      options: ['确认', '重新选择'],
      data: { underlying }
    };
  }

  /**
   * State: CONFIRMING_UNDERLYING
   * Handles confirmation and transitions to ANALYZING_UNDERLYING
   */
  private async handleConfirmingUnderlying(
    sessionId: SessionId,
    userInput: string,
    state: SessionState
  ): Promise<DialogResponse> {
    const normalizedInput = userInput.trim().toLowerCase();

    // Check for confirmation
    if (this.isConfirmation(normalizedInput)) {
      // Transition to analyzing state
      state.currentState = DialogState.ANALYZING_UNDERLYING;
      this.stateManager.updateState(sessionId, state);

      // Trigger analysis
      return await this.handleAnalyzingUnderlying(sessionId, state);
    }

    // Check for rejection
    if (this.isRejection(normalizedInput)) {
      // Go back to awaiting underlying
      state.currentState = DialogState.AWAITING_UNDERLYING;
      state.underlying = undefined;
      this.stateManager.updateState(sessionId, state);

      return {
        message: '好的，请重新输入您想要分析的标的',
        state: DialogState.AWAITING_UNDERLYING,
        options: ['帮助']
      };
    }

    // Unclear input - ask again
    return {
      message: '请确认是否分析此标的',
      state: DialogState.CONFIRMING_UNDERLYING,
      options: ['确认', '重新选择']
    };
  }

  /**
   * State: ANALYZING_UNDERLYING
   * Performs market sentiment analysis and transitions to SUGGESTING_STRATEGY
   */
  private async handleAnalyzingUnderlying(
    sessionId: SessionId,
    state: SessionState
  ): Promise<DialogResponse> {
    if (!state.underlying) {
      return this.createErrorResponse('标的信息缺失', DialogState.AWAITING_UNDERLYING);
    }

    try {
      // Perform market analysis
      const marketAnalysis = await this.underlyingAnalyzer.analyzeMarketSentiment(
        state.underlying.symbol
      );

      // Update state
      state.sentiment = marketAnalysis.sentiment;
      state.strategy = marketAnalysis.suggestedStrategy;
      state.currentState = DialogState.SUGGESTING_STRATEGY;
      this.stateManager.updateState(sessionId, state);

      // Generate analysis message
      const sentimentText = this.getSentimentText(marketAnalysis.sentiment);
      const message = `市场分析完成！\n\n` +
        `${marketAnalysis.analysis}\n\n` +
        `市场情绪：${sentimentText}\n` +
        `建议策略：${marketAnalysis.suggestedStrategy}\n\n` +
        `是否继续分析期权合约？`;

      return {
        message,
        state: DialogState.SUGGESTING_STRATEGY,
        options: ['继续分析', '重新选择标的'],
        data: { marketAnalysis }
      };

    } catch (error) {
      return this.createErrorResponse(
        '市场分析失败，请稍后重试',
        DialogState.CONFIRMING_UNDERLYING
      );
    }
  }

  /**
   * State: SUGGESTING_STRATEGY
   * Handles strategy confirmation and transitions to ANALYZING_OPTIONS
   */
  private async handleSuggestingStrategy(
    sessionId: SessionId,
    userInput: string,
    state: SessionState
  ): Promise<DialogResponse> {
    const normalizedInput = userInput.trim().toLowerCase();

    // Check for confirmation to continue
    if (this.isConfirmation(normalizedInput) || normalizedInput.includes('继续') || normalizedInput.includes('分析')) {
      // Transition to analyzing options
      state.currentState = DialogState.ANALYZING_OPTIONS;
      this.stateManager.updateState(sessionId, state);

      return await this.handleAnalyzingOptions(sessionId, state);
    }

    // Check for going back
    if (normalizedInput.includes('重新') || normalizedInput.includes('返回')) {
      state.currentState = DialogState.AWAITING_UNDERLYING;
      state.underlying = undefined;
      state.sentiment = undefined;
      state.strategy = undefined;
      this.stateManager.updateState(sessionId, state);

      return {
        message: '好的，请重新输入您想要分析的标的',
        state: DialogState.AWAITING_UNDERLYING
      };
    }

    // Unclear input
    return {
      message: '请确认是否继续分析期权合约',
      state: DialogState.SUGGESTING_STRATEGY,
      options: ['继续分析', '重新选择标的']
    };
  }

  /**
   * State: ANALYZING_OPTIONS
   * Fetches and analyzes option contracts, transitions to PRESENTING_CONTRACTS
   */
  private async handleAnalyzingOptions(
    sessionId: SessionId,
    state: SessionState
  ): Promise<DialogResponse> {
    if (!state.underlying || !state.strategy || !state.sentiment) {
      return this.createErrorResponse('分析信息不完整', DialogState.AWAITING_UNDERLYING);
    }

    try {
      // Get option chain
      const contracts = await this.optionAnalyzer.getOptionChain(
        state.underlying.symbol,
        state.strategy
      );

      if (contracts.length === 0) {
        return {
          message: `未找到 ${state.underlying.symbol} 的 ${state.strategy} 期权合约`,
          state: DialogState.SUGGESTING_STRATEGY,
          options: ['重新选择标的']
        };
      }

      // Analyze contracts
      const analyzedContracts = await this.optionAnalyzer.analyzeContracts(
        contracts,
        state.underlying,
        state.sentiment
      );

      // Rank contracts
      const rankedContracts = this.optionAnalyzer.rankContracts(analyzedContracts);

      // Update state
      state.analyzedContracts = rankedContracts;
      state.currentState = DialogState.PRESENTING_CONTRACTS;
      this.stateManager.updateState(sessionId, state);

      return await this.handlePresentingContracts(sessionId, state);

    } catch (error) {
      return this.createErrorResponse(
        '期权合约分析失败，请稍后重试',
        DialogState.SUGGESTING_STRATEGY
      );
    }
  }

  /**
   * State: PRESENTING_CONTRACTS
   * Displays analyzed contracts and transitions to AWAITING_SELECTION
   */
  private async handlePresentingContracts(
    sessionId: SessionId,
    state: SessionState
  ): Promise<DialogResponse> {
    if (!state.analyzedContracts || state.analyzedContracts.length === 0) {
      return this.createErrorResponse('没有可用的期权合约', DialogState.SUGGESTING_STRATEGY);
    }

    // Show top 5 contracts
    const topContracts = state.analyzedContracts.slice(0, 5);
    
    let message = `为您找到 ${state.analyzedContracts.length} 个 ${state.strategy} 合约，以下是推荐的前 ${topContracts.length} 个：\n\n`;

    topContracts.forEach((contract, index) => {
      message += `【${index + 1}】${contract.contractSymbol}\n`;
      message += `  行权价：$${contract.strike.toFixed(2)}\n`;
      message += `  到期日：${contract.expiration.toISOString().split('T')[0]} (${contract.daysToExpiry}天)\n`;
      message += `  权利金：$${contract.premium.toFixed(2)}\n`;
      message += `  Delta：${contract.delta.toFixed(3)}\n`;
      message += `  推荐评分：${contract.score.toFixed(0)}/100\n`;
      message += `  风险等级：${contract.riskLevel}\n`;
      message += `  ${contract.analysis}\n\n`;
    });

    message += '请输入序号选择合约（例如：1 或 1,2,3 选择多个）';

    // Transition to awaiting selection
    state.currentState = DialogState.AWAITING_SELECTION;
    this.stateManager.updateState(sessionId, state);

    return {
      message,
      state: DialogState.AWAITING_SELECTION,
      options: ['查看更多', '重新分析'],
      data: { contracts: topContracts }
    };
  }

  /**
   * State: AWAITING_SELECTION
   * Handles contract selection and transitions to GENERATING_TRADE_LINK
   */
  private async handleAwaitingSelection(
    sessionId: SessionId,
    userInput: string,
    state: SessionState
  ): Promise<DialogResponse> {
    if (!state.analyzedContracts || state.analyzedContracts.length === 0) {
      return this.createErrorResponse('没有可用的合约', DialogState.SUGGESTING_STRATEGY);
    }

    // Parse selection (e.g., "1", "1,2,3", "第1个")
    const selectedIndices = this.parseContractSelection(userInput);

    if (selectedIndices.length === 0) {
      return {
        message: '请输入有效的合约序号（例如：1 或 1,2,3）',
        state: DialogState.AWAITING_SELECTION,
        options: ['查看合约列表']
      };
    }

    // Validate indices
    const validIndices = selectedIndices.filter(
      i => i >= 1 && i <= state.analyzedContracts!.length
    );

    if (validIndices.length === 0) {
      return {
        message: `请输入 1 到 ${state.analyzedContracts.length} 之间的序号`,
        state: DialogState.AWAITING_SELECTION
      };
    }

    // Get selected contracts
    const selectedContracts = validIndices.map(i => state.analyzedContracts![i - 1]);

    // Update state
    state.selectedContracts = selectedContracts;
    state.currentState = DialogState.GENERATING_TRADE_LINK;
    this.stateManager.updateState(sessionId, state);

    return await this.handleGeneratingTradeLink(sessionId, state);
  }

  /**
   * State: GENERATING_TRADE_LINK
   * Generates trade links and adds to watchlist, transitions to COMPLETED
   */
  private async handleGeneratingTradeLink(
    sessionId: SessionId,
    state: SessionState
  ): Promise<DialogResponse> {
    if (!state.selectedContracts || state.selectedContracts.length === 0) {
      return this.createErrorResponse('没有选中的合约', DialogState.AWAITING_SELECTION);
    }

    try {
      // Generate trade links
      const tradeLinks: { contract: string; link: string }[] = [];
      
      for (const contract of state.selectedContracts) {
        const link = this.tradeService.generateTradeLink(contract);
        tradeLinks.push({
          contract: contract.contractSymbol,
          link
        });
      }

      // Add to watchlist (using sessionId as userId for demo)
      const watchlistResult = await this.tradeService.addToWatchlist(
        sessionId,
        state.selectedContracts
      );

      // Generate completion message
      let message = `已为您生成 ${tradeLinks.length} 个合约的交易链接：\n\n`;

      tradeLinks.forEach((item, index) => {
        message += `【${index + 1}】${item.contract}\n`;
        message += `  交易链接：${item.link}\n\n`;
      });

      message += `${watchlistResult.message}\n\n`;
      message += '分析完成！您可以：\n';
      message += '- 输入"重新开始"分析其他标的\n';
      message += '- 输入"帮助"查看更多功能';

      // Transition to completed
      state.currentState = DialogState.COMPLETED;
      this.stateManager.updateState(sessionId, state);

      return {
        message,
        state: DialogState.COMPLETED,
        options: ['重新开始', '帮助'],
        data: { tradeLinks, watchlistResult }
      };

    } catch (error) {
      return this.createErrorResponse(
        '生成交易链接失败，请稍后重试',
        DialogState.AWAITING_SELECTION
      );
    }
  }

  /**
   * State: COMPLETED
   * Handles post-completion interactions
   */
  private async handleCompleted(
    sessionId: SessionId,
    userInput: string
  ): Promise<DialogResponse> {
    const normalizedInput = userInput.trim().toLowerCase();

    // Check for restart
    if (normalizedInput.includes('重新') || normalizedInput.includes('开始')) {
      return await this.handleRestart(sessionId);
    }

    // Default response
    return {
      message: '分析已完成。输入"重新开始"可以分析其他标的',
      state: DialogState.COMPLETED,
      options: ['重新开始', '帮助']
    };
  }

  // ============================================================================
  // Special Intent Handlers
  // ============================================================================

  /**
   * Handles restart intent
   */
  private async handleRestart(sessionId: SessionId): Promise<DialogResponse> {
    this.resetSession(sessionId);

    const state = this.stateManager.getState(sessionId);
    const message = await this.llmService.generateResponse(
      state!,
      UserIntent.RESTART
    );

    return {
      message,
      state: DialogState.AWAITING_UNDERLYING,
      options: ['帮助']
    };
  }

  /**
   * Handles help intent
   */
  private async handleHelp(_sessionId: SessionId, state: SessionState): Promise<DialogResponse> {
    const message = await this.llmService.generateResponse(state, UserIntent.HELP);

    return {
      message,
      state: state.currentState,
      options: ['继续', '重新开始']
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Parses user intent from input
   */
  private parseUserIntent(input: string, currentState: DialogState): UserIntent {
    const normalized = input.trim().toLowerCase();

    // Check for restart
    if (normalized.includes('重新开始') || normalized.includes('重置') || normalized === 'restart') {
      return UserIntent.RESTART;
    }

    // Check for help
    if (normalized.includes('帮助') || normalized === 'help' || normalized === '?') {
      return UserIntent.HELP;
    }

    // Check for confirmation
    if (this.isConfirmation(normalized)) {
      return UserIntent.CONFIRM;
    }

    // State-specific intents
    switch (currentState) {
      case DialogState.AWAITING_UNDERLYING:
        return UserIntent.SELECT_UNDERLYING;
      
      case DialogState.AWAITING_SELECTION:
        return UserIntent.SELECT_CONTRACT;
      
      default:
        return UserIntent.CONFIRM;
    }
  }

  /**
   * Checks if input is a confirmation
   */
  private isConfirmation(input: string): boolean {
    const confirmations = ['是', '确认', '好的', '好', '对', 'yes', 'ok', '继续'];
    return confirmations.some(word => input === word || input.startsWith(word));
  }

  /**
   * Checks if input is a rejection
   */
  private isRejection(input: string): boolean {
    const rejections = ['否', '不是', '不', '取消', 'no', '重新'];
    return rejections.some(word => input === word || input.startsWith(word));
  }

  /**
   * Parses contract selection from user input
   * Supports formats: "1", "1,2,3", "第1个", "1 2 3"
   */
  private parseContractSelection(input: string): number[] {
    const indices: number[] = [];
    
    // Remove Chinese characters like "第", "个"
    const cleaned = input.replace(/[第个]/g, '');
    
    // Extract numbers
    const matches = cleaned.match(/\d+/g);
    
    if (matches) {
      matches.forEach(match => {
        const num = parseInt(match, 10);
        if (!isNaN(num) && !indices.includes(num)) {
          indices.push(num);
        }
      });
    }
    
    return indices.sort((a, b) => a - b);
  }

  /**
   * Gets sentiment text in Chinese
   */
  private getSentimentText(sentiment: MarketSentiment): string {
    switch (sentiment) {
      case MarketSentiment.BULLISH:
        return '看涨 📈';
      case MarketSentiment.BEARISH:
        return '看跌 📉';
      case MarketSentiment.NEUTRAL:
        return '中性 ➡️';
      default:
        return '未知';
    }
  }

  /**
   * Creates an error response
   */
  private createErrorResponse(message: string, fallbackState: DialogState): DialogResponse {
    return {
      message: `❌ ${message}`,
      state: fallbackState,
      options: ['重试', '重新开始']
    };
  }

  /**
   * Adds a history entry to the session
   */
  private addHistoryEntry(
    sessionId: SessionId,
    role: 'user' | 'system',
    content: string,
    state: DialogState
  ): void {
    const entry: DialogHistoryEntry = {
      timestamp: new Date(),
      role,
      content,
      state
    };

    this.stateManager.appendHistory(sessionId, entry);
  }
}
