import { useState, useEffect } from 'react';
import { Tournament, Match } from '@/types';

export default function useMatches(selectedTournament: Tournament | null) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadMatches = async (tournament: Tournament) => {
    console.log(`>>> [matches] Loading matches for tournament ${tournament.id}`);
    try {
      const response = await fetch(`https://primechallenge.onrender.com/tournaments/matches?tournament_id=${tournament.id}`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      console.log('>>> [matches] Matches loaded:', data);
      setMatches(data.map((m: Match) => ({ ...m, predicted_winner: '' })));
    } catch (err) {
      console.error('>>> [matches] Ошибка загрузки матчей:', err);
      setMatches([]);
      setError('Не удалось загрузить матчи. Попробуйте позже.');
    }
  };

  useEffect(() => {
    if (selectedTournament) {
      loadMatches(selectedTournament);
    }
  }, [selectedTournament]);

  return { matches, error, loadMatches };
}