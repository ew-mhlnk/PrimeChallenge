import { useState, useEffect } from 'react';
import { Tournament } from '@/types';

export default function useTournaments() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const initData = window.Telegram?.WebApp?.initData;
        if (!initData) {
          throw new Error('Telegram initData not available');
        }

        const response = await fetch('https://primechallenge.onrender.com/tournaments', {
          headers: {
            Authorization: initData,
          },
        });
        if (!response.ok) {
          throw new Error('Ошибка при загрузке турниров');
        }
        const data: Tournament[] = await response.json();
        setTournaments(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Неизвестная ошибка';
        setError(message);
      }
    };

    fetchTournaments();
  }, []);

  return { tournaments, error };
}