'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { ProfileStats } from '@/types';

interface ProfileContextType {
  stats: ProfileStats | null;
  isLoading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider = ({ children }: { children: ReactNode }) => {
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Оборачиваем в useCallback, чтобы React не ругался на зависимости
  const fetchStats = useCallback(async () => {
    // Если данные уже есть, не включаем спиннер, обновляем тихо
    setIsLoading((prev) => !isLoaded ? true : prev);

    try {
      let attempts = 0;
      if (typeof window !== 'undefined') {
         while (!window.Telegram?.WebApp?.initData && attempts < 20) {
             await new Promise(r => setTimeout(r, 100));
             attempts++;
         }
      }
      
      const initData = typeof window !== 'undefined' ? window.Telegram?.WebApp?.initData : '';
      if (!initData) return;

      const response = await fetch('/api/users/profile/stats', {
        headers: { Authorization: initData },
        cache: 'no-store'
      });

      if (!response.ok) throw new Error('Ошибка загрузки');
      const data = await response.json();
      
      setStats(data);
      setIsLoaded(true);
    } catch (err) {
      console.error(err);
      setError('Не удалось загрузить профиль');
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded]); // Зависимость от isLoaded

  useEffect(() => {
    fetchStats();
  }, [fetchStats]); // Теперь fetchStats в зависимостях, и это безопасно

  return (
    <ProfileContext.Provider value={{ stats, isLoading, error, refreshProfile: fetchStats }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfileContext = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfileContext must be used within a ProfileProvider');
  }
  return context;
};