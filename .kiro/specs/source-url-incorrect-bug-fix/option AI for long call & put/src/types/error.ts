// Error types and interfaces

import { DialogState } from './dialog.js';

export interface ValidationError {
  type: "VALIDATION_ERROR";
  field: string;
  message: string;
  suggestions?: string[];
}

export interface DataError {
  type: "DATA_ERROR";
  source: string;
  message: string;
  retryable: boolean;
  fallbackAvailable: boolean;
}

export interface BusinessLogicError {
  type: "BUSINESS_LOGIC_ERROR";
  code: string;
  message: string;
  currentState?: DialogState;
  allowedActions?: string[];
}

export interface SystemError {
  type: "SYSTEM_ERROR";
  code: string;
  message: string;
  internalMessage: string;
  timestamp: Date;
}

export type AppError = ValidationError | DataError | BusinessLogicError | SystemError;

export interface ErrorResponse {
  success: false;
  error: AppError;
  requestId: string;
  timestamp: Date;
}
