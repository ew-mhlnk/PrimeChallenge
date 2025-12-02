'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Tournament } from '@/types';

interface TournamentContextType {
  tournaments: Tournament[];
  isLoading: boolean;
  error: string | null;
  refreshTournaments: () => Promise<void>;
  getTournamentData: (id: string) => Tournament | null;
  loadTournament: (id: string, initData: string) => Promise<Tournament | null>;
}

interface ApiTournament {
  id: number;
  name: string;
  dates?: string;
  status: string;
  start?: string;
  close?: string;
  tag?: string;
}

const TournamentContext = createContext<TournamentContextType | undefined>(undefined);

export const TournamentProvider = ({ children }: { children: ReactNode }) => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Кэш детальных данных турниров
  const [tournamentDetails, setTournamentDetails] = useState<Record<string, Tournament>>({});

  // 1. Загрузка списка турниров
  const fetchTournaments = useCallback(async () => {
    // Показываем лоадер только при первой загрузке
    if (!isLoaded) setIsLoading(true);

    try {
      // Ждём инициализации Telegram WebApp (если запущено внутри него)
      let attempts = 0;
      while (typeof window !== 'undefined' && !window.Telegram?.WebApp?.initData && attempts < 20) {
        await new Promise(r => setTimeout(r, 100));
        attempts++;
      }

      const initData = typeof window !== 'undefined' ? window.Telegram?.WebApp?.initData : '';
      const headers: HeadersInit = {};
      if (initData) headers['Authorization'] = initData;

      // ИСПРАВЛЕНО: убрали слеш в конце → /api/tournaments
      const response = await fetch('/api/tournaments', { headers });

      if (!response.ok) {
        throw new Error(`Ошибка загрузки турниров: ${response.status} ${response.statusText}`);
      }

      const data: ApiTournament[] = await response.json();

      const mappedData: Tournament[] = data.map((item) => ({
        id: item.id,
        name: item.name,
        dates: item.dates,
        status: item.status.toUpperCase() as 'ACTIVE' | 'CLOSED' | 'COMPLETED',
        start: item.start,
        close: item.close,
        tag: item.tag,
        true_draws: [],
        user_picks: [],
        scores: [],
        rounds: [],
      }));

      setTournaments(mappedData);
      setIsLoaded(true);
    } catch (err) {
      console.error('Failed to fetch tournaments:', err);
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded]);

  // 2. Получение турнира из кэша (синхронно)
  const getTournamentData = useCallback((id: string): Tournament | null => {
    return tournamentDetails[id] ?? null;
  }, [tournamentDetails]);

  // 3. Загрузка детальных данных турнира
  const loadTournament = useCallback(async (id: string, initData: string): Promise<Tournament | null> => {
    try {
      const response = await fetch(`/api/tournament/${id}`, {
        headers: {
          Authorization: initData || '',
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`Ошибка загрузки турнира: ${response.status}`);
      }

      const data = await response.json();

      // Нормализуем статус
      if (data.status) {
        data.status = data.status.toString().trim().toUpperCase();
      }

      // Сохраняем в кэш
      setTournamentDetails(prev => ({
        ...prev,
        [id]: data as Tournament
      }));

      return data as Tournament;
    } catch (e) {
      console.error('Error loading tournament details:', e);
      return null;
    }
  }, []);

  // Загружаем список турниров при монтировании
  useEffect(() => {
    fetchTournaments();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <TournamentContext.Provider
      value={{
        tournaments,
        isLoading,
        error,
        refreshTournaments: fetchTournaments,
        getTournamentData,
        loadTournament,
      }}
    >
      {children}
    </TournamentContext.Provider>
  );
};

export const useTournamentContext = () => {
  const context = useContext(TournamentContext);
  if (!context) {
    throw new Error('useTournamentContext must be used within a TournamentProvider');
  }
  return context;
};