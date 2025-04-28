import { useState, useEffect } from 'react';
import { Tournament } from '@/types';

export default function useTournaments() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const response = await fetch('https://primechallenge.onrender.com/tournaments/');
        if (!response.ok) {
          throw new Error('Ошибка при загрузке турниров');
        }
        const data: Tournament[] = await response.json();
        setTournaments(data);
      } catch (err: unknown) { // Заменяем any на unknown
        const message = err instanceof Error ? err.message : 'Неизвестная ошибка';
        setError(message);
      }
    };

    fetchTournaments();
  }, []);

  return { tournaments, error };
}