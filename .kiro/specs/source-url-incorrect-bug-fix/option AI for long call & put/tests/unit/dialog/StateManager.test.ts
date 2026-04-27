import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StateManagerImpl } from '../../../src/dialog/StateManager.js';
import { DialogState } from '../../../src/types/index.js';
import type { SessionState, DialogHistoryEntry } from '../../../src/types/index.js';

describe('StateManager', () => {
  let stateManager: StateManagerImpl;

  beforeEach(() => {
    stateManager = new StateManagerImpl();
  });

  describe('createSession', () => {
    it('should create a new session with unique ID', () => {
      const sessionId = stateManager.createSession();
      
      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
      expect(sessionId.length).toBeGreaterThan(0);
    });

    it('should create sessions with different IDs', () => {
      const sessionId1 = stateManager.createSession();
      const sessionId2 = stateManager.createSession();
      
      expect(sessionId1).not.toBe(sessionId2);
    });

    it('should initialize session with AWAITING_UNDERLYING state', () => {
      const sessionId = stateManager.createSession();
      const state = stateManager.getState(sessionId);
      
      expect(state).not.toBeNull();
      expect(state?.currentState).toBe(DialogState.AWAITING_UNDERLYING);
    });

    it('should initialize session with empty history', () => {
      const sessionId = stateManager.createSession();
      const state = stateManager.getState(sessionId);
      
      expect(state?.history).toEqual([]);
    });

    it('should set createdAt and updatedAt timestamps', () => {
      const before = new Date();
      const sessionId = stateManager.createSession();
      const after = new Date();
      const state = stateManager.getState(sessionId);
      
      expect(state?.createdAt).toBeDefined();
      expect(state?.updatedAt).toBeDefined();
      expect(state?.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(state?.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('updateState', () => {
    it('should update existing session state', () => {
      const sessionId = stateManager.createSession();
      const state = stateManager.getState(sessionId)!;
      
      state.currentState = DialogState.CONFIRMING_UNDERLYING;
      stateManager.updateState(sessionId, state);
      
      const updatedState = stateManager.getState(sessionId);
      expect(updatedState?.currentState).toBe(DialogState.CONFIRMING_UNDERLYING);
    });

    it('should update the updatedAt timestamp', () => {
      const sessionId = stateManager.createSession();
      const state = stateManager.getState(sessionId)!;
      const originalUpdatedAt = state.updatedAt;
      
      // Wait a bit to ensure timestamp difference
      vi.useFakeTimers();
      vi.advanceTimersByTime(100);
      
      stateManager.updateState(sessionId, state);
      
      const updatedState = stateManager.getState(sessionId);
      expect(updatedState?.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
      
      vi.useRealTimers();
    });

    it('should throw error for non-existent session', () => {
      const fakeSessionId = 'non-existent-session';
      const fakeState: SessionState = {
        sessionId: fakeSessionId,
        currentState: DialogState.AWAITING_UNDERLYING,
        history: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      expect(() => {
        stateManager.updateState(fakeSessionId, fakeState);
      }).toThrow('Session not found');
    });

    it('should preserve all session data during update', () => {
      const sessionId = stateManager.createSession();
      const state = stateManager.getState(sessionId)!;
      
      state.underlying = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        currentPrice: 150.00,
        priceTimestamp: new Date(),
        change: 2.50,
        changePercent: 1.69,
        supportsOptions: true
      };
      
      stateManager.updateState(sessionId, state);
      
      const updatedState = stateManager.getState(sessionId);
      expect(updatedState?.underlying?.symbol).toBe('AAPL');
      expect(updatedState?.underlying?.name).toBe('Apple Inc.');
    });
  });

  describe('getState', () => {
    it('should return session state for valid session ID', () => {
      const sessionId = stateManager.createSession();
      const state = stateManager.getState(sessionId);
      
      expect(state).not.toBeNull();
      expect(state?.sessionId).toBe(sessionId);
    });

    it('should return null for non-existent session', () => {
      const state = stateManager.getState('non-existent-session');
      
      expect(state).toBeNull();
    });

    it('should return null for expired session', () => {
      // Create state manager with 1 second expiration
      const shortExpirationManager = new StateManagerImpl(1000);
      const sessionId = shortExpirationManager.createSession();
      
      // Fast-forward time by 2 seconds
      vi.useFakeTimers();
      vi.advanceTimersByTime(2000);
      
      const state = shortExpirationManager.getState(sessionId);
      
      expect(state).toBeNull();
      
      vi.useRealTimers();
    });

    it('should delete expired session when accessed', () => {
      const shortExpirationManager = new StateManagerImpl(1000);
      const sessionId = shortExpirationManager.createSession();
      
      expect(shortExpirationManager.getActiveSessionCount()).toBe(1);
      
      vi.useFakeTimers();
      vi.advanceTimersByTime(2000);
      
      shortExpirationManager.getState(sessionId);
      
      expect(shortExpirationManager.getActiveSessionCount()).toBe(0);
      
      vi.useRealTimers();
    });
  });

  describe('deleteSession', () => {
    it('should delete existing session', () => {
      const sessionId = stateManager.createSession();
      
      expect(stateManager.getState(sessionId)).not.toBeNull();
      
      stateManager.deleteSession(sessionId);
      
      expect(stateManager.getState(sessionId)).toBeNull();
    });

    it('should not throw error when deleting non-existent session', () => {
      expect(() => {
        stateManager.deleteSession('non-existent-session');
      }).not.toThrow();
    });

    it('should allow creating new session with same ID after deletion', () => {
      const sessionId1 = stateManager.createSession();
      stateManager.deleteSession(sessionId1);
      
      const sessionId2 = stateManager.createSession();
      
      expect(stateManager.getState(sessionId2)).not.toBeNull();
    });
  });

  describe('appendHistory', () => {
    it('should append history entry to session', () => {
      const sessionId = stateManager.createSession();
      
      const entry: DialogHistoryEntry = {
        timestamp: new Date(),
        role: 'user',
        content: 'AAPL',
        state: DialogState.AWAITING_UNDERLYING
      };
      
      stateManager.appendHistory(sessionId, entry);
      
      const state = stateManager.getState(sessionId);
      expect(state?.history).toHaveLength(1);
      expect(state?.history[0]).toEqual(entry);
    });

    it('should append multiple history entries in order', () => {
      const sessionId = stateManager.createSession();
      
      const entry1: DialogHistoryEntry = {
        timestamp: new Date(),
        role: 'user',
        content: 'AAPL',
        state: DialogState.AWAITING_UNDERLYING
      };
      
      const entry2: DialogHistoryEntry = {
        timestamp: new Date(),
        role: 'system',
        content: '已找到标的：Apple Inc.',
        state: DialogState.CONFIRMING_UNDERLYING
      };
      
      stateManager.appendHistory(sessionId, entry1);
      stateManager.appendHistory(sessionId, entry2);
      
      const state = stateManager.getState(sessionId);
      expect(state?.history).toHaveLength(2);
      expect(state?.history[0]).toEqual(entry1);
      expect(state?.history[1]).toEqual(entry2);
    });

    it('should update updatedAt timestamp when appending history', () => {
      const sessionId = stateManager.createSession();
      const state = stateManager.getState(sessionId)!;
      const originalUpdatedAt = state.updatedAt;
      
      vi.useFakeTimers();
      vi.advanceTimersByTime(100);
      
      const entry: DialogHistoryEntry = {
        timestamp: new Date(),
        role: 'user',
        content: 'AAPL',
        state: DialogState.AWAITING_UNDERLYING
      };
      
      stateManager.appendHistory(sessionId, entry);
      
      const updatedState = stateManager.getState(sessionId);
      expect(updatedState?.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
      
      vi.useRealTimers();
    });

    it('should throw error for non-existent session', () => {
      const entry: DialogHistoryEntry = {
        timestamp: new Date(),
        role: 'user',
        content: 'AAPL',
        state: DialogState.AWAITING_UNDERLYING
      };
      
      expect(() => {
        stateManager.appendHistory('non-existent-session', entry);
      }).toThrow('Session not found');
    });
  });

  describe('session expiration handling', () => {
    it('should not expire sessions within expiration window', () => {
      const manager = new StateManagerImpl(5000); // 5 seconds
      const sessionId = manager.createSession();
      
      vi.useFakeTimers();
      vi.advanceTimersByTime(4000); // 4 seconds
      
      const state = manager.getState(sessionId);
      expect(state).not.toBeNull();
      
      vi.useRealTimers();
    });

    it('should expire sessions after expiration window', () => {
      const manager = new StateManagerImpl(5000); // 5 seconds
      const sessionId = manager.createSession();
      
      vi.useFakeTimers();
      vi.advanceTimersByTime(6000); // 6 seconds
      
      const state = manager.getState(sessionId);
      expect(state).toBeNull();
      
      vi.useRealTimers();
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should remove all expired sessions', () => {
      const manager = new StateManagerImpl(1000); // 1 second
      
      manager.createSession();
      manager.createSession();
      manager.createSession();
      
      expect(manager.getActiveSessionCount()).toBe(3);
      
      vi.useFakeTimers();
      vi.advanceTimersByTime(2000);
      
      const cleanedCount = manager.cleanupExpiredSessions();
      
      expect(cleanedCount).toBe(3);
      expect(manager.getActiveSessionCount()).toBe(0);
      
      vi.useRealTimers();
    });

    it('should not remove non-expired sessions', () => {
      const manager = new StateManagerImpl(5000); // 5 seconds
      
      manager.createSession();
      manager.createSession();
      
      vi.useFakeTimers();
      vi.advanceTimersByTime(3000); // 3 seconds
      
      const cleanedCount = manager.cleanupExpiredSessions();
      
      expect(cleanedCount).toBe(0);
      expect(manager.getActiveSessionCount()).toBe(2);
      
      vi.useRealTimers();
    });

    it('should return count of cleaned sessions', () => {
      const manager = new StateManagerImpl(1000);
      
      manager.createSession();
      manager.createSession();
      
      vi.useFakeTimers();
      vi.advanceTimersByTime(2000);
      
      const cleanedCount = manager.cleanupExpiredSessions();
      
      expect(cleanedCount).toBe(2);
      
      vi.useRealTimers();
    });
  });

  describe('edge cases', () => {
    it('should handle empty string session ID', () => {
      const state = stateManager.getState('');
      expect(state).toBeNull();
    });

    it('should handle very long session ID', () => {
      const longId = 'a'.repeat(10000);
      const state = stateManager.getState(longId);
      expect(state).toBeNull();
    });

    it('should handle special characters in session ID', () => {
      const specialId = '!@#$%^&*()';
      const state = stateManager.getState(specialId);
      expect(state).toBeNull();
    });

    it('should handle concurrent session creation', () => {
      const sessions = Array.from({ length: 100 }, () => stateManager.createSession());
      const uniqueSessions = new Set(sessions);
      
      expect(uniqueSessions.size).toBe(100);
    });

    it('should handle large history arrays', () => {
      const sessionId = stateManager.createSession();
      
      for (let i = 0; i < 1000; i++) {
        const entry: DialogHistoryEntry = {
          timestamp: new Date(),
          role: i % 2 === 0 ? 'user' : 'system',
          content: `Message ${i}`,
          state: DialogState.AWAITING_UNDERLYING
        };
        stateManager.appendHistory(sessionId, entry);
      }
      
      const state = stateManager.getState(sessionId);
      expect(state?.history).toHaveLength(1000);
    });
  });

  describe('getActiveSessionCount', () => {
    it('should return 0 for new state manager', () => {
      expect(stateManager.getActiveSessionCount()).toBe(0);
    });

    it('should return correct count after creating sessions', () => {
      stateManager.createSession();
      stateManager.createSession();
      stateManager.createSession();
      
      expect(stateManager.getActiveSessionCount()).toBe(3);
    });

    it('should decrease count after deleting sessions', () => {
      const sessionId = stateManager.createSession();
      stateManager.createSession();
      
      expect(stateManager.getActiveSessionCount()).toBe(2);
      
      stateManager.deleteSession(sessionId);
      
      expect(stateManager.getActiveSessionCount()).toBe(1);
    });
  });
});
