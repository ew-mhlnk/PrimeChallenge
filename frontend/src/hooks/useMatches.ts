import { useState, useEffect, useCallback } from 'react';
import { Tournament, Match } from '@/types';
import useAuth from './useAuth'; // Для получения user.id

export default function useMatches(selectedTournament: Tournament | null) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth(); // Получаем user для user_id

  const loadMatches = useCallback(async (tournament: Tournament) => {
    if (!user || user.id === 0) {
      setError('Пользователь не авторизован');
      setMatches([]);
      return;
    }

    console.log('>>> [matches] Attempting to load matches for tournament:', tournament.id);
    try {
      const response = await fetch(
        `https://primechallenge.onrender.com/picks/initial-matches?tournament_id=${tournament.id}&user_id=${user.id}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );
      console.log('>>> [matches] Response status:', response.status);
      if (!response.ok) {
        throw new Error(`Failed to fetch matches: ${response.status}`);
      }
      const data: Match[] = await response.json();
      console.log('>>> [matches] Matches loaded:', data);
      setMatches(data);
      setError(null);
    } catch (err) {
      console.error('>>> [matches] Error loading matches:', err);
      setError('Ошибка загрузки матчей');
      setMatches([]);
    }
  }, [user]);

  useEffect(() => {
    if (selectedTournament && user) {
      console.log('>>> [matches] useEffect triggered with tournament:', selectedTournament);
      loadMatches(selectedTournament);
    } else {
      console.log('>>> [matches] No tournament selected or user not loaded, skipping loadMatches');
    }
  }, [selectedTournament, user, loadMatches]); // Теперь ESLint будет доволен

  return { matches, error, loadMatches };
}
