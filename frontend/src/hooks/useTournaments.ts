import { useState, useEffect } from 'react';
import { Tournament } from '@/types';

export default function useTournaments() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('>>> [tournaments] Loading tournaments...');
    fetch('https://primechallenge.onrender.com/tournaments', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! Status: ${res.status}, Message: ${await res.text()}`);
        }
        return res.json();
      })
      .then((data: Tournament[]) => {
        console.log('>>> [tournaments] Tournaments loaded:', data);
        setTournaments(data);
      })
      .catch((err) => {
        console.error('>>> [tournaments] Ошибка загрузки турниров:', err);
        setError('Не удалось загрузить турниры. Попробуйте позже.');
      });
  }, []);

  return { tournaments, error };
}