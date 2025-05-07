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
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRound, setSelectedRound] = useState<string | null>(null);
  const [rounds, setRounds] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [correctPicks, setCorrectPicks] = useState(0);
  const [userId, setUserId] = useState<number>(0);

  const startingRound = tournament?.starting_round || allRounds[0];

  const { generateEmptyPicks, error: bracketError } = useEmptyBracket({
    tournamentId: id ? parseInt(id) : 0,
    startingRound,
    allRounds,
    userId,
  });

  useEffect(() => {
    const fetchTournamentData = async () => {
      if (!id) return;

      setIsLoading(true);

      try {
        const initData = window.Telegram?.WebApp?.initData;
        if (!initData) throw new Error('Telegram initData not available');

        const userIdMatch = initData.match(/user=([^&]+)/);
        const userData = userIdMatch ? JSON.parse(decodeURIComponent(userIdMatch[1])) : null;
        const fetchedUserId = userData?.id || 0;
        setUserId(fetchedUserId);

        const res = await fetch(`https://primechallenge.onrender.com/tournament/${id}`, {
          headers: { Authorization: initData },
        });
        if (!res.ok) throw new Error('Ошибка при загрузке турнира');
        const data: Tournament = await res.json();
        setTournament(data);

        const fetchedMatches = data.true_draws || [];
        const fetchedPicks = data.user_picks || [];

        setMatches(fetchedMatches);
        setPicks(fetchedPicks.length > 0 ? fetchedPicks : generateEmptyPicks());

        if (['CLOSED', 'COMPLETED'].includes(data.status)) {
          const resultsRes = await fetch(`https://primechallenge.onrender.com/results/tournament/${id}/results`, {
            headers: { Authorization: initData },
          });
          if (!resultsRes.ok) throw new Error('Ошибка при загрузке результатов');
          const results = await resultsRes.json();

          setComparison(results.comparison);
          setCorrectPicks(results.correct_picks);
          setScore(results.score);
        }

        const roundIndex = allRounds.indexOf(startingRound);
        setRounds(allRounds.slice(roundIndex));
        setSelectedRound(startingRound);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTournamentData();
  }, [id, userId, generateEmptyPicks, startingRound, allRounds]);

  const handlePick = (match: UserPick, player: string | null) => {
    if (tournament?.status !== 'ACTIVE') {
      setError('Турнир закрыт, пики нельзя изменить');
      return;
    }

    const newPicks = [...picks];
    const idx = newPicks.findIndex(p => p.round === match.round && p.match_number === match.match_number);

    if (idx !== -1) {
      newPicks[idx] = { ...newPicks[idx], predicted_winner: player };
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

      const delRes = await fetch(`https://primechallenge.onrender.com/picks/delete?tournament_id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: initData },
      });
      if (!delRes.ok) throw new Error('Ошибка при удалении старых пиков');

      const saveRes = await fetch('https://primechallenge.onrender.com/picks/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: initData,
        },
        body: JSON.stringify(picks),
      });
      if (!saveRes.ok) throw new Error('Ошибка при сохранении пиков');

      const updateRes = await fetch(`https://primechallenge.onrender.com/tournament/${id}`, {
        headers: { Authorization: initData },
      });
      if (!updateRes.ok) throw new Error('Ошибка при обновлении данных турнира');

      const updatedData: Tournament = await updateRes.json();
      setPicks(updatedData.user_picks || []);
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
    score,
    correctPicks,
  };
};