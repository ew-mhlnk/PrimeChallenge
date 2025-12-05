'use client';

import { useCallback } from 'react';

export function useHapticFeedback() {
  const impact = useCallback((style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred(style);
    }
  }, []);

  const notification = useCallback((type: 'error' | 'success' | 'warning') => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred(type);
    }
  }, []);

  const selection = useCallback(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.selectionChanged();
    }
  }, []);

  return { impact, notification, selection };
}