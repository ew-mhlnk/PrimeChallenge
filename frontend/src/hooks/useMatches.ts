import { useState, useEffect } from 'react';
import { Tournament, Match } from '@/types';

export default function useMatches(selectedTournament: Tournament | null) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadMatches = async (tournament: Tournament) => {
    console.log('>>> [matches] Attempting to load matches for tournament:', tournament.id);
    try {
      const response = await fetch(
        `https://primechallenge.onrender.com/tournaments/matches?tournament_id=${tournament.id}`
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
  };

  useEffect(() => {
    if (selectedTournament) {
      console.log('>>> [matches] useEffect triggered with tournament:', selectedTournament);
      loadMatches(selectedTournament);
    } else {
      console.log('>>> [matches] No tournament selected, skipping loadMatches');
    }
  }, [selectedTournament]);

  return { matches, error, loadMatches };
}