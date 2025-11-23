'use client';

import { useState, useEffect } from 'react';
import { Tournament } from '@/types';

export default function useTournaments() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    const fetchTournaments = async () => {
      setIsLoading(true);
      try {
        // Ждем до 2 секунд, пока появится initData
        let attempts = 0;
        while (!window.Telegram?.WebApp?.initData && attempts < 20) {
            await new Promise(r => setTimeout(r, 100));
            attempts++;
        }

        const initData = window.Telegram?.WebApp?.initData;
        
        if (!initData) {
            console.warn('Telegram initData missing after wait');
            // Для веба можно не выбрасывать ошибку, а просто логировать
            // throw new Error('Не удалось авторизоваться.');
        }

        const response = await fetch('https://primechallenge.onrender.com/tournaments/', {
          headers: {
            Authorization: initData || '',
          },
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          // ИСПРАВЛЕНО: используем errorText в сообщении
          throw new Error(`Ошибка загрузки: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        
        if (isMounted) {
            // ИСПРАВЛЕНО: заменили any на явный тип
            const tournamentData: Tournament[] = data.map((item: {
              id: number;
              name: string;
              dates?: string;
              status: string;
              start?: string;
              close?: string;
              tag?: string;
            }) => ({
              id: item.id,
              name: item.name,
              dates: item.dates || undefined,
              status: item.status as 'ACTIVE' | 'CLOSED' | 'COMPLETED',
              start: item.start || undefined,
              close: item.close || undefined,
              tag: item.tag || undefined,
              true_draws: [],
              user_picks: [],
              scores: [],
              rounds: [],
            }));
            setTournaments(tournamentData);
        }
      } catch (err) {
        if (isMounted) {
            const message = err instanceof Error ? err.message : 'Неизвестная ошибка';
            setError(message);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchTournaments();

    return () => { isMounted = false; };
  }, []);

  return { tournaments, error, isLoading };
}