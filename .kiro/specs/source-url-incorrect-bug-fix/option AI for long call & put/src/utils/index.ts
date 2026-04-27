// Utility functions

export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function calculateDaysToExpiry(expirationDate: Date): number {
  const now = new Date();
  const diffTime = expirationDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function isMarketOpen(): boolean {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  
  // Simple check: weekdays 9:30 AM - 4:00 PM ET (simplified)
  return day >= 1 && day <= 5 && hour >= 9 && hour < 16;
}

// Re-export error utilities
export * from './errors.js';
