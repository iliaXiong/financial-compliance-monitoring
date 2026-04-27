/**
 * Options Trading Assistant - Frontend Application
 * 期权交易助手 - 前端应用
 */

// Global state
let sessionId = null;
let isProcessing = false;

// DOM elements
const welcomeCard = document.getElementById('welcomeCard');
const chatContainer = document.getElementById('chatContainer');
const loadingIndicator = document.getElementById('loadingIndicator');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const statusBadge = document.getElementById('statusBadge');

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  initializeSession();
  setupEventListeners();
});

/**
 * Initialize a new session
 */
async function initializeSession() {
  try {
    // For demo purposes, we'll use a mock session
    // In production, this would call: const response = await fetch('/api/session/start', { method: 'POST' });
    sessionId = 'demo-session-' + Date.now();
    console.log('Session initialized:', sessionId);
    
    // Show welcome message
    addSystemMessage('欢迎使用期权交易工具！请输入您想要分析的标的代码（如：AAPL）或中文名称（如：苹果）');
    
  } catch (error) {
    console.error('Failed to initialize session:', error);
    updateStatus('连接失败', 'error');
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Send button click
  sendButton.addEventListener('click', sendMessage);
  
  // Enter key press
  userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  
  // Input field focus
  userInput.addEventListener('focus', () => {
    // Hide welcome card when user starts typing
    if (welcomeCard && chatContainer.children.length === 0) {
      welcomeCard.style.display = 'none';
    }
  });
}

/**
 * Send user message
 */
async function sendMessage() {
  const message = userInput.value.trim();
  
  if (!message || isProcessing) {
    return;
  }
  
  // Hide welcome card
  if (welcomeCard) {
    welcomeCard.style.display = 'none';
  }
  
  // Add user message to chat
  addUserMessage(message);
  
  // Clear input
  userInput.value = '';
  
  // Show loading
  setProcessing(true);
  
  try {
    // Send to backend (mock for demo)
    const response = await processUserInput(message);
    
    // Add system response
    addAssistantMessage(response.message, response.options);
    
  } catch (error) {
    console.error('Error processing message:', error);
    addAssistantMessage('抱歉，处理您的请求时出现错误，请稍后重试');
  } finally {
    setProcessing(false);
  }
}

/**
 * Send quick message (from quick action buttons)
 */
window.sendQuickMessage = async function(message) {
  userInput.value = message;
  await sendMessage();
};

/**
 * Send option selection
 */
window.sendOption = async function(option) {
  userInput.value = option;
  await sendMessage();
};

/**
 * Process user input (mock implementation)
 * In production, this would call the backend API
 */
async function processUserInput(input) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Mock response based on input
  // In production: const response = await fetch('/api/dialog/process', { method: 'POST', body: JSON.stringify({ sessionId, input }) });
  
  return getMockResponse(input);
}

/**
 * Mock response generator (simulates DialogEngine)
 * This will be replaced with actual API calls in production
 */
function getMockResponse(input) {
  const normalized = input.trim().toLowerCase();
  
  // Mock state machine
  if (!window.mockState) {
    window.mockState = {
      state: 'AWAITING_UNDERLYING',
      underlying: null,
      sentiment: null
    };
  }
  
  const state = window.mockState;
  
  // Handle special commands
  if (normalized.includes('帮助') || normalized === 'help') {
    return {
      message: '我可以帮您分析期权交易机会。流程如下：\n1. 选择标的资产\n2. 分析市场情绪\n3. 推荐期权合约\n4. 生成交易链接\n\n支持的标的：AAPL（苹果）、TSLA（特斯拉）、MSFT（微软）',
      options: ['继续', '重新开始']
    };
  }
  
  if (normalized.includes('重新开始') || normalized === 'restart') {
    state.state = 'AWAITING_UNDERLYING';
    state.underlying = null;
    state.sentiment = null;
    return {
      message: '已重置会话，让我们重新开始。请输入您想要分析的标的',
      options: ['帮助']
    };
  }
  
  // State machine logic
  switch (state.state) {
    case 'AWAITING_UNDERLYING':
      if (normalized === 'aapl' || normalized === '苹果') {
        state.underlying = { symbol: 'AAPL', name: 'Apple Inc.', price: 175.50, change: 2.50, changePercent: 1.44 };
        state.state = 'CONFIRMING_UNDERLYING';
        return {
          message: `找到标的：${state.underlying.name}（${state.underlying.symbol}）\n当前价格：$${state.underlying.price.toFixed(2)}\n涨跌：+${state.underlying.change.toFixed(2)} (+${state.underlying.changePercent.toFixed(2)}%)\n\n是否确认分析此标的？`,
          options: ['确认', '重新选择']
        };
      } else if (normalized === 'tsla' || normalized === '特斯拉') {
        state.underlying = { symbol: 'TSLA', name: 'Tesla Inc.', price: 242.80, change: -5.20, changePercent: -2.10 };
        state.state = 'CONFIRMING_UNDERLYING';
        return {
          message: `找到标的：${state.underlying.name}（${state.underlying.symbol}）\n当前价格：$${state.underlying.price.toFixed(2)}\n涨跌：${state.underlying.change.toFixed(2)} (${state.underlying.changePercent.toFixed(2)}%)\n\n是否确认分析此标的？`,
          options: ['确认', '重新选择']
        };
      } else if (normalized === 'msft' || normalized === '微软') {
        state.underlying = { symbol: 'MSFT', name: 'Microsoft Corp.', price: 378.90, change: 3.40, changePercent: 0.90 };
        state.state = 'CONFIRMING_UNDERLYING';
        return {
          message: `找到标的：${state.underlying.name}（${state.underlying.symbol}）\n当前价格：$${state.underlying.price.toFixed(2)}\n涨跌：+${state.underlying.change.toFixed(2)} (+${state.underlying.changePercent.toFixed(2)}%)\n\n是否确认分析此标的？`,
          options: ['确认', '重新选择']
        };
      } else {
        return {
          message: '未找到标的。请输入有效的股票代码（如：AAPL、TSLA、MSFT）或中文名称（如：苹果、特斯拉、微软）',
          options: ['重新输入', '帮助']
        };
      }
    
    case 'CONFIRMING_UNDERLYING':
      if (normalized.includes('确认') || normalized === '是' || normalized === 'yes') {
        state.state = 'ANALYZING_UNDERLYING';
        state.sentiment = state.underlying.changePercent > 0 ? 'BULLISH' : 'BEARISH';
        const sentimentText = state.sentiment === 'BULLISH' ? '看涨 📈' : '看跌 📉';
        const strategy = state.sentiment === 'BULLISH' ? 'Long Call' : 'Long Put';
        
        return {
          message: `市场分析完成！\n\n${state.underlying.symbol} 当前价格为 $${state.underlying.price.toFixed(2)}，较前一交易日${state.underlying.changePercent > 0 ? '上涨' : '下跌'} ${Math.abs(state.underlying.changePercent).toFixed(2)}%。\n\n技术面显示${state.sentiment === 'BULLISH' ? '上升趋势，支撑位稳固' : '下降趋势，压力位明显'}。波动率适中（IV: 25.0%）。\n\n市场情绪：${sentimentText}\n建议策略：${strategy}\n\n是否继续分析期权合约？`,
          options: ['继续分析', '重新选择标的']
        };
      } else if (normalized.includes('重新') || normalized === '否') {
        state.state = 'AWAITING_UNDERLYING';
        state.underlying = null;
        return {
          message: '好的，请重新输入您想要分析的标的',
          options: ['帮助']
        };
      } else {
        return {
          message: '请确认是否分析此标的',
          options: ['确认', '重新选择']
        };
      }
    
    case 'ANALYZING_UNDERLYING':
      if (normalized.includes('继续') || normalized.includes('分析') || normalized === '是') {
        state.state = 'PRESENTING_CONTRACTS';
        const strategy = state.sentiment === 'BULLISH' ? 'Long Call' : 'Long Put';
        const contractType = state.sentiment === 'BULLISH' ? 'CALL' : 'PUT';
        const strikePrice = state.underlying.price;
        
        return {
          message: `为您找到 15 个 ${strategy} 合约，以下是推荐的前 3 个：\n\n【1】${state.underlying.symbol}240119${contractType[0]}00${Math.round(strikePrice)}000\n  行权价：$${strikePrice.toFixed(2)}\n  到期日：2024-01-19 (30天)\n  权利金：$5.50\n  Delta：0.52\n  推荐评分：85/100\n  风险等级：MEDIUM\n  该合约为平值期权，流动性良好\n\n【2】${state.underlying.symbol}240119${contractType[0]}00${Math.round(strikePrice * 1.05)}000\n  行权价：$${(strikePrice * 1.05).toFixed(2)}\n  到期日：2024-01-19 (30天)\n  权利金：$3.50\n  Delta：0.42\n  推荐评分：80/100\n  风险等级：MEDIUM\n  该合约为虚值期权，杠杆较高\n\n【3】${state.underlying.symbol}240216${contractType[0]}00${Math.round(strikePrice)}000\n  行权价：$${strikePrice.toFixed(2)}\n  到期日：2024-02-16 (60天)\n  权利金：$7.80\n  Delta：0.55\n  推荐评分：78/100\n  风险等级：LOW\n  该合约到期时间较长，时间价值充足\n\n请输入序号选择合约（例如：1 或 1,2,3 选择多个）`,
          options: ['查看更多', '重新分析']
        };
      } else if (normalized.includes('重新')) {
        state.state = 'AWAITING_UNDERLYING';
        state.underlying = null;
        state.sentiment = null;
        return {
          message: '好的，请重新输入您想要分析的标的',
          options: ['帮助']
        };
      } else {
        return {
          message: '请确认是否继续分析期权合约',
          options: ['继续分析', '重新选择标的']
        };
      }
    
    case 'PRESENTING_CONTRACTS':
      const selection = input.match(/\d+/g);
      if (selection && selection.length > 0) {
        state.state = 'COMPLETED';
        const count = selection.length;
        const contractType = state.sentiment === 'BULLISH' ? 'CALL' : 'PUT';
        const strikePrice = state.underlying.price;
        
        let message = `已为您生成 ${count} 个合约的交易链接：\n\n`;
        selection.forEach((num, idx) => {
          const contractSymbol = `${state.underlying.symbol}240119${contractType[0]}00${Math.round(strikePrice)}000`;
          message += `【${idx + 1}】${contractSymbol}\n`;
          message += `  交易链接：https://trade.example.com/options?symbol=${contractSymbol}\n\n`;
        });
        
        message += `✅ 成功添加 ${count} 个合约到自选列表\n\n`;
        message += '分析完成！您可以：\n';
        message += '- 输入"重新开始"分析其他标的\n';
        message += '- 输入"帮助"查看更多功能';
        
        return {
          message,
          options: ['重新开始', '帮助']
        };
      } else {
        return {
          message: '请输入有效的合约序号（例如：1 或 1,2,3）',
          options: ['查看合约列表']
        };
      }
    
    case 'COMPLETED':
      if (normalized.includes('重新')) {
        state.state = 'AWAITING_UNDERLYING';
        state.underlying = null;
        state.sentiment = null;
        return {
          message: '已重置会话，让我们重新开始。请输入您想要分析的标的',
          options: ['帮助']
        };
      } else {
        return {
          message: '分析已完成。输入"重新开始"可以分析其他标的',
          options: ['重新开始', '帮助']
        };
      }
    
    default:
      return {
        message: '系统状态异常，请重新开始',
        options: ['重新开始']
      };
  }
}

/**
 * Add user message to chat
 */
function addUserMessage(text) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'chat-message user-message';
  
  messageDiv.innerHTML = `
    <div class="message-avatar">👤</div>
    <div class="message-content">
      <div class="message-text">${escapeHtml(text)}</div>
    </div>
  `;
  
  chatContainer.appendChild(messageDiv);
  scrollToBottom();
}

/**
 * Add assistant message to chat
 */
function addAssistantMessage(text, options = []) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'chat-message assistant-message';
  
  let optionsHtml = '';
  if (options && options.length > 0) {
    optionsHtml = '<div class="message-options">';
    options.forEach(option => {
      optionsHtml += `<button class="option-btn" onclick="sendOption('${escapeHtml(option)}')">${escapeHtml(option)}</button>`;
    });
    optionsHtml += '</div>';
  }
  
  messageDiv.innerHTML = `
    <div class="message-avatar">🤖</div>
    <div class="message-content">
      <div class="message-text">${escapeHtml(text)}</div>
      ${optionsHtml}
    </div>
  `;
  
  chatContainer.appendChild(messageDiv);
  scrollToBottom();
}

/**
 * Add system message to chat
 */
function addSystemMessage(text) {
  addAssistantMessage(text);
}

/**
 * Set processing state
 */
function setProcessing(processing) {
  isProcessing = processing;
  sendButton.disabled = processing;
  userInput.disabled = processing;
  
  if (processing) {
    loadingIndicator.style.display = 'flex';
  } else {
    loadingIndicator.style.display = 'none';
  }
  
  scrollToBottom();
}

/**
 * Update status badge
 */
function updateStatus(text, type = 'success') {
  const statusDot = statusBadge.querySelector('.status-dot');
  statusBadge.innerHTML = `<span class="status-dot"></span>${text}`;
  
  if (type === 'error') {
    statusDot.style.background = 'var(--danger-color)';
  } else {
    statusDot.style.background = 'var(--success-color)';
  }
}

/**
 * Scroll chat to bottom
 */
function scrollToBottom() {
  setTimeout(() => {
    chatContainer.parentElement.scrollTop = chatContainer.parentElement.scrollHeight;
  }, 100);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
