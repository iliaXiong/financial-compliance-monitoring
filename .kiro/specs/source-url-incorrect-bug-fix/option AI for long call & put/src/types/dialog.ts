// Dialog-related types and interfaces

import type { UnderlyingAsset, MarketSentiment, StrategyType } from './market.js';
import type { AnalyzedContract, OptionContract } from './option.js';

export type SessionId = string;

export enum DialogState {
  AWAITING_UNDERLYING = "AWAITING_UNDERLYING",
  CONFIRMING_UNDERLYING = "CONFIRMING_UNDERLYING",
  ANALYZING_UNDERLYING = "ANALYZING_UNDERLYING",
  SUGGESTING_STRATEGY = "SUGGESTING_STRATEGY",
  ANALYZING_OPTIONS = "ANALYZING_OPTIONS",
  PRESENTING_CONTRACTS = "PRESENTING_CONTRACTS",
  AWAITING_SELECTION = "AWAITING_SELECTION",
  GENERATING_TRADE_LINK = "GENERATING_TRADE_LINK",
  COMPLETED = "COMPLETED"
}

export interface DialogResponse {
  message: string;
  state: DialogState;
  options?: string[];
  data?: any;
}

export interface DialogHistoryEntry {
  timestamp: Date;
  role: "user" | "system";
  content: string;
  state: DialogState;
}

export interface SessionState {
  sessionId: SessionId;
  currentState: DialogState;
  underlying?: UnderlyingAsset;
  sentiment?: MarketSentiment;
  strategy?: StrategyType;
  analyzedContracts?: AnalyzedContract[];
  selectedContracts?: OptionContract[];
  history: DialogHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

// Interface definitions for DialogEngine and StateManager
export interface DialogEngine {
  startSession(): SessionId;
  processInput(sessionId: SessionId, userInput: string): Promise<DialogResponse>;
  getSessionState(sessionId: SessionId): SessionState | null;
  resetSession(sessionId: SessionId): void;
}

export interface StateManager {
  createSession(): SessionId;
  updateState(sessionId: SessionId, state: SessionState): void;
  getState(sessionId: SessionId): SessionState | null;
  deleteSession(sessionId: SessionId): void;
  appendHistory(sessionId: SessionId, entry: DialogHistoryEntry): void;
}
