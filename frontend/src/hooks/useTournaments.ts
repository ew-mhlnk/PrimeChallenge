'use client';

import { useState, useEffect } from 'react';
import { Tournament } from '@/types';

export default function useTournaments() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchTournaments = async () => {
      setIsLoading(true);
      try {
        const initData = window.Telegram?.WebApp?.initData;
        if (!initData) {
          throw new Error('Telegram initData not available');
        }

        const response = await fetch('https://primechallenge.onrender.com/tournaments/', {
          headers: {
            Authorization: initData,
          },
        });
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Failed to fetch tournaments:', response.status, errorText);
          throw new Error('Ошибка при загрузке турниров');
        }
        const data = await response.json();
        console.log('Tournaments data:', data); // Для отладки

        // Типизация данных от бэкенда
        const tournamentData: Tournament[] = data.map((item: { id: number; name: string; status: string; dates?: string; start?: string; close?: string; tag?: string }) => ({
          id: item.id,
          name: item.name,
          dates: item.dates || undefined,
          status: item.status as 'ACTIVE' | 'CLOSED' | 'COMPLETED',
          sheet_name: undefined,
          starting_round: undefined,
          type: undefined,
          start: item.start || undefined,
          close: item.close || undefined,
          tag: item.tag || undefined,
          true_draws: [],
          user_picks: [],
          scores: [],
          rounds: [],
        }));
        setTournaments(tournamentData);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Неизвестная ошибка';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTournaments();
  }, []);

  return { tournaments, error, isLoading };
}