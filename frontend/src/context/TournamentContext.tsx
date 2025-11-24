'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Tournament } from '@/types';

interface TournamentContextType {
  tournaments: Tournament[];
  isLoading: boolean;
  error: string | null;
  refreshTournaments: () => Promise<void>;
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

  const fetchTournaments = useCallback(async () => {
    setIsLoading((prev) => !isLoaded ? true : prev);

    try {
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

      // === ИЗМЕНЕНИЕ ЗДЕСЬ: используем /api/ вместо полного адреса ===
      const response = await fetch('/api/tournaments/', {
        headers
      });
      
      if (!response.ok) {
        throw new Error(`Ошибка сервера: ${response.status}`);
      }
      
      const data = await response.json();
      
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
  }, [isLoaded]);

  useEffect(() => {
    fetchTournaments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

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