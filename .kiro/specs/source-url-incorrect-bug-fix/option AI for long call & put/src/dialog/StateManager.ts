// State Manager - Maintains session state and dialog context

import type { StateManager, SessionState, SessionId, DialogHistoryEntry } from '../types/index.js';
import { DialogState } from '../types/index.js';
import { randomUUID } from 'crypto';

export class StateManagerImpl implements StateManager {
  private sessions: Map<SessionId, SessionState> = new Map();
  private readonly sessionExpirationMs: number;

  constructor(sessionExpirationMs: number = 3600000) { // Default 1 hour
    this.sessionExpirationMs = sessionExpirationMs;
  }

  /**
   * Create a new session with unique ID
   */
  createSession(): SessionId {
    const sessionId = randomUUID();
    const now = new Date();
    
    const newSession: SessionState = {
      sessionId,
      currentState: DialogState.AWAITING_UNDERLYING,
      history: [],
      createdAt: now,
      updatedAt: now
    };

    this.sessions.set(sessionId, newSession);
    return sessionId;
  }

  /**
   * Update session state
   */
  updateState(sessionId: SessionId, state: SessionState): void {
    if (!this.sessions.has(sessionId)) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Update the updatedAt timestamp
    state.updatedAt = new Date();
    this.sessions.set(sessionId, state);
  }

  /**
   * Get session state with null handling
   */
  getState(sessionId: SessionId): SessionState | null {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }

    // Check if session has expired
    const now = new Date();
    const sessionAge = now.getTime() - session.createdAt.getTime();
    
    if (sessionAge > this.sessionExpirationMs) {
      this.deleteSession(sessionId);
      return null;
    }

    return session;
  }

  /**
   * Delete session
   */
  deleteSession(sessionId: SessionId): void {
    this.sessions.delete(sessionId);
  }

  /**
   * Append dialog history entry
   */
  appendHistory(sessionId: SessionId, entry: DialogHistoryEntry): void {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.history.push(entry);
    session.updatedAt = new Date();
    this.sessions.set(sessionId, session);
  }

  /**
   * Clean up expired sessions (utility method)
   */
  cleanupExpiredSessions(): number {
    const now = new Date();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      const sessionAge = now.getTime() - session.createdAt.getTime();
      if (sessionAge > this.sessionExpirationMs) {
        this.sessions.delete(sessionId);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * Get total number of active sessions (utility method)
   */
  getActiveSessionCount(): number {
    return this.sessions.size;
  }
}
