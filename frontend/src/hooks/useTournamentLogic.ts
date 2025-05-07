'use client';

import { useState, useEffect } from 'react';
import { Tournament, UserPick, ComparisonResult, Match } from '@/types';
import { useEmptyBracket } from './useEmptyBracket';

interface UseTournamentLogicProps {
  id?: string;
  allRounds: string[];
}

export const useTournamentLogic = ({ id, allRounds }: UseTournamentLogicProps) => {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [picks, setPicks] = useState<UserPick[]>([]);
  const [comparison, setComparison] = useState<ComparisonResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedRound, setSelectedRound] = useState<string | null>(null);
  const [rounds, setRounds] = useState<string[]>([]);

  const { generateEmptyPicks, error: bracketError } = useEmptyBracket({
    tournamentId: id ? parseInt(id) : 0,
    startingRound: tournament?.starting_round || allRounds[0],
    allRounds,
  });

  useEffect(() => {
    const fetchTournamentData = async () => {
      if (!id) return;

      setIsLoading(true);
      try {
        const initData = window.Telegram?.WebApp?.initData;
        if (!initData) throw new Error('Telegram initData not available');

        const response = await fetch(`https://primechallenge.onrender.com/tournament/${id}`, {
          headers: { Authorization: initData },
        });
        if (!response.ok) throw new Error('Ошибка при загрузке турнира');
        const data: Tournament & { compared_picks?: ComparisonResult[] } = await response.json();
        setTournament(data);

        const fetchedMatches = data.true_draws || [];
        setMatches(fetchedMatches);

        const fetchedPicks = data.user_picks || [];
        setPicks(fetchedPicks.length > 0 ? fetchedPicks : generateEmptyPicks());

        setComparison(data.compared_picks || []);

        const startingRound = data.starting_round || allRounds[0];
        const roundIndex = allRounds.indexOf(startingRound);
        const availableRounds = allRounds.slice(roundIndex);
        setRounds(availableRounds);
        setSelectedRound(startingRound);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTournamentData();
  }, [id, allRounds, generateEmptyPicks]);

  const handlePick = async (match: UserPick, player: string | null) => {
    if (tournament?.status !== 'ACTIVE') {
      setError('Турнир закрыт, пики нельзя изменить');
      return;
    }

    const newPicks = [...picks];
    const pickIndex = newPicks.findIndex(
      (p) => p.round === match.round && p.match_number === match.match_number
    );
    if (pickIndex !== -1) {
      newPicks[pickIndex] = { ...newPicks[pickIndex], predicted_winner: player };
    } else {
      newPicks.push({ ...match, predicted_winner: player });
    }
    setPicks(newPicks);
  };

  const savePicks = async () => {
    if (tournament?.status !== 'ACTIVE') {
      setError('Турнир закрыт, пики нельзя изменить');
      return;
    }

    try {
      const initData = window.Telegram?.WebApp?.initData;
      if (!initData) throw new Error('Telegram initData not available');

      const deleteResponse = await fetch(`https://primechallenge.onrender.com/picks/delete?tournament_id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: initData },
      });
      if (!deleteResponse.ok) throw new Error('Ошибка при удалении старых пиков');

      const response = await fetch('https://primechallenge.onrender.com/picks/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: initData },
        body: JSON.stringify(picks),
      });
      if (!response.ok) throw new Error('Ошибка при сохранении пиков');

      const updatedResponse = await fetch(`https://primechallenge.onrender.com/tournament/${id}`, {
        headers: { Authorization: initData },
      });
      if (!updatedResponse.ok) throw new Error('Ошибка при обновлении данных турнира');
      const updatedData: Tournament & { compared_picks?: ComparisonResult[] } = await updatedResponse.json();
      setPicks(updatedData.user_picks || []);
      setComparison(updatedData.compared_picks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    }
  };

  return {
    tournament,
    matches,
    picks,
    error: error || bracketError,
    isLoading,
    comparison,
    selectedRound,
    setSelectedRound,
    rounds,
    handlePick,
    savePicks,
  };
};