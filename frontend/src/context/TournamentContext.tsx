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

// Интерфейс сырых данных от Бэкенда
interface ApiTournament {
  id: number;
  name: string;
  dates?: string;
  status: string; // Приходит строкой: "PLANNED", "ACTIVE"...
  start?: string;
  close?: string;
  tag?: string;
  
  // --- НОВЫЕ ПОЛЯ ---
  surface?: string;
  defending_champion?: string;
  description?: string;
  matches_count?: string;
  month?: string;
  // ------------------
}

const TournamentContext = createContext<TournamentContextType | undefined>(undefined);

export const TournamentProvider = ({ children }: { children: ReactNode }) => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Кэш деталей
  const [tournamentDetails, setTournamentDetails] = useState<Record<string, Tournament>>({});

  const fetchTournaments = useCallback(async () => {
    // Если уже загружено, не включаем спиннер на весь экран, но обновляем данные
    setIsLoading((prev) => !isLoaded ? true : prev);
    
    try {
      // Ждем инициализации Telegram WebApp (если мы внутри)
      let attempts = 0;
      if (typeof window !== 'undefined') {
         while (!window.Telegram?.WebApp?.initData && attempts < 10) {
             await new Promise(r => setTimeout(r, 100));
             attempts++;
         }
      }
      const initData = typeof window !== 'undefined' ? window.Telegram?.WebApp?.initData : '';
      const headers: HeadersInit = {};
      if (initData) headers['Authorization'] = initData;

      // Запрос списка
      const response = await fetch('/api/tournaments', { headers });
      if (!response.ok) throw new Error(`Ошибка: ${response.status}`);
      
      const data = await response.json();
      
      // Маппинг данных (Backend JSON -> Frontend Types)
      const mappedData: Tournament[] = data.map((item: ApiTournament) => ({
        id: item.id,
        name: item.name,
        dates: item.dates,
        // Приводим строку к нашему типу статуса
        status: item.status as 'PLANNED' | 'ACTIVE' | 'CLOSED' | 'COMPLETED',
        start: item.start,
        close: item.close,
        tag: item.tag,
        
        // Маппинг новых полей
        surface: item.surface,
        defending_champion: item.defending_champion,
        description: item.description,
        matches_count: item.matches_count,
        month: item.month,

        // Пустые массивы для списка (детали грузятся отдельно)
        true_draws: [],
        user_picks: [],
        scores: [],
        rounds: [],
      }));

      setTournaments(mappedData);
      setIsLoaded(true);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded]);

  const getTournamentData = useCallback((id: string) => {
    return tournamentDetails[id] || null;
  }, [tournamentDetails]);

  const loadTournament = useCallback(async (id: string, initData: string) => {
    try {
      const response = await fetch(`/api/tournament/${id}`, {
        headers: { Authorization: initData || '' },
        cache: 'no-store',
        next: { revalidate: 0 }
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      const data = await response.json();

      // Нормализация статуса на всякий случай
      if (data.status) data.status = data.status.toString().trim().toUpperCase();

      // Сохраняем в кэш
      setTournamentDetails(prev => ({
        ...prev,
        [id]: data
      }));

      return data;
    } catch (e) {
      console.error("Error loading tournament details:", e);
      return null;
    }
  }, []);

  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]); 

  return (
    <TournamentContext.Provider value={{ 
        tournaments, 
        isLoading, 
        error, 
        refreshTournaments: fetchTournaments,
        getTournamentData,
        loadTournament 
    }}>
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