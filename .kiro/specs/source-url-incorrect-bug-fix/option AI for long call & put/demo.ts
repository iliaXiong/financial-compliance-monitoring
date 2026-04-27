#!/usr/bin/env tsx
/**
 * Options Trading Tool - Interactive Demo
 * 期权交易工具 - 交互式演示
 */

import * as readline from 'readline';
import { DefaultDialogEngine } from './src/dialog/DialogEngine.js';
import { StateManagerImpl } from './src/dialog/StateManager.js';
import { DefaultUnderlyingAnalyzer } from './src/analyzers/UnderlyingAnalyzer.js';
import { DefaultOptionAnalyzer } from './src/analyzers/OptionAnalyzer.js';
import { DefaultTradeService } from './src/services/TradeService.js';
import { MockLLMService } from './src/services/LLMService.js';
import { MockDataProvider } from './src/services/DataProvider.js';
import { BlackScholesGreeksCalculator } from './src/calculators/GreeksCalculator.js';

// 初始化所有组件
console.log('🚀 正在启动期权交易助手...\n');

const dataProvider = new MockDataProvider();
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

// 创建会话
const sessionId = dialogEngine.startSession();
console.log('✅ 系统已启动！\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 期权交易助手 - Options Trading Assistant');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('欢迎使用期权交易工具！我可以帮您：');
console.log('  1. 分析标的资产（支持代码或中文名称）');
console.log('  2. 评估市场情绪');
console.log('  3. 推荐期权合约');
console.log('  4. 生成交易链接\n');
console.log('💡 提示：');
console.log('  - 输入标的代码（如：AAPL）或中文名称（如：苹果）');
console.log('  - 输入 "帮助" 查看更多功能');
console.log('  - 输入 "重新开始" 重置会话');
console.log('  - 输入 "退出" 结束程序\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// 创建交互式命令行界面
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '您> '
});

// 处理用户输入
rl.prompt();

rl.on('line', async (input: string) => {
  const userInput = input.trim();
  
  // 处理退出命令
  if (userInput === '退出' || userInput === 'exit' || userInput === 'quit') {
    console.log('\n👋 感谢使用期权交易助手，再见！\n');
    rl.close();
    process.exit(0);
  }
  
  // 跳过空输入
  if (!userInput) {
    rl.prompt();
    return;
  }
  
  try {
    // 处理用户输入
    const response = await dialogEngine.processInput(sessionId, userInput);
    
    // 显示系统响应
    console.log('\n' + '─'.repeat(60));
    console.log('🤖 助手> \n');
    console.log(response.message);
    
    // 显示可选操作
    if (response.options && response.options.length > 0) {
      console.log('\n💡 建议操作：' + response.options.join(' | '));
    }
    
    console.log('─'.repeat(60) + '\n');
    
  } catch (error) {
    console.error('\n❌ 错误：', error instanceof Error ? error.message : '未知错误');
    console.log('');
  }
  
  rl.prompt();
});

rl.on('close', () => {
  console.log('\n👋 程序已退出\n');
  process.exit(0);
});

// 处理错误
process.on('uncaughtException', (error) => {
  console.error('\n❌ 系统错误：', error.message);
  console.log('正在重启...\n');
});
