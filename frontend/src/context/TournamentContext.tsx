'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Tournament } from '@/types';

interface TournamentContextType {
  tournaments: Tournament[];
  isLoading: boolean;
  error: string | null;
  refreshTournaments: () => Promise<void>;
}

// Описываем, как выглядят "сырые" данные с бэкенда, чтобы не использовать any
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

  // Оборачиваем в useCallback, чтобы функция не пересоздавалась при каждом рендере
  const fetchTournaments = useCallback(async () => {
    // Если данные уже загружены, не показываем лоадер (фоновое обновление)
    // Используем функциональное обновление стейта, чтобы избежать лишних зависимостей
    setIsLoading((prev) => !isLoaded ? true : prev);

    try {
      let attempts = 0;
      // Проверка на наличие window (SSR check) + ожидание Telegram
      if (typeof window !== 'undefined') {
         while (!window.Telegram?.WebApp?.initData && attempts < 10) {
             await new Promise(r => setTimeout(r, 100));
             attempts++;
         }
      }

      const initData = typeof window !== 'undefined' ? window.Telegram?.WebApp?.initData : '';
      const headers: HeadersInit = {};
      if (initData) headers['Authorization'] = initData;

      const response = await fetch('https://primechallenge.onrender.com/tournaments/', {
        headers
      });
      
      if (!response.ok) {
        throw new Error(`Ошибка сервера: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Используем типизированный map вместо any
      const mappedData: Tournament[] = data.map((item: ApiTournament) => ({
        id: item.id,
        name: item.name,
        dates: item.dates,
        status: item.status as 'ACTIVE' | 'CLOSED' | 'COMPLETED',
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
      console.error(err);
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded]); // Зависимость isLoaded нужна для логики лоадера

  // Запускаем 1 раз при монтировании
  useEffect(() => {
    fetchTournaments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 
  // Мы намеренно оставляем массив пустым [], чтобы запрос ушел ТОЛЬКО 1 раз при входе.
  // Добавление fetchTournaments в зависимости создаст бесконечный цикл, 
  // поэтому мы используем eslint-disable-next-line

  return (
    <TournamentContext.Provider value={{ tournaments, isLoading, error, refreshTournaments: fetchTournaments }}>
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