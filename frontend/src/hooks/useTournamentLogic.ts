'use client';

import { useState, useEffect } from 'react';
import { Tournament, UserPick, ComparisonResult, Match } from '@/types';

interface UseTournamentLogicProps {
  id?: string;
  allRounds?: string[]; // Сделали опциональным
}

export const useTournamentLogic = ({ id }: UseTournamentLogicProps) => {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [picks, setPicks] = useState<UserPick[]>([]);
  const [comparison, setComparison] = useState<ComparisonResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedRound, setSelectedRound] = useState<string | null>(null);
  const [rounds, setRounds] = useState<string[]>([]);
  const [score, setScore] = useState<number>(0);
  const [correctPicks, setCorrectPicks] = useState<number>(0);
  const [userId, setUserId] = useState<number>(0);

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

        const response = await fetch(`https://primechallenge.onrender.com/tournament/${id}`, {
          headers: { Authorization: initData },
        });
        if (!response.ok) throw new Error('Ошибка при загрузке турнира');
        const data: Tournament = await response.json();
        setTournament(data);

        const fetchedMatches = data.true_draws || [];
        setMatches(fetchedMatches);

        const fetchedPicks = data.user_picks || [];
        setPicks(fetchedPicks);

        const roundsFromMatches = [...new Set(fetchedMatches.map((m) => m.round))].sort();
        setRounds(roundsFromMatches);
        setSelectedRound(roundsFromMatches[0] || null);

        if (data.status in ['CLOSED', 'COMPLETED']) {
          const resultsResponse = await fetch(`https://primechallenge.onrender.com/results/tournament/${id}/results`, {
            headers: { Authorization: initData },
          });
          if (!resultsResponse.ok) throw new Error('Ошибка при загрузке результатов');
          const results = await resultsResponse.json();
          setComparison(results.comparison);
          setCorrectPicks(results.correct_picks);
          setScore(results.score);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTournamentData();
  }, [id]);

  const handlePick = (match: Match, player: string | null) => {
    if (tournament?.status !== 'ACTIVE') {
      setError('Турнир закрыт, пики нельзя изменить');
      return;
    }

    const newPicks = [...picks];
    const pickIndex = newPicks.findIndex(
      (p) => p.round === match.round && p.match_number === match.match_number
    );
    const newPick: UserPick = {
      id: match.id,
      user_id: userId,
      tournament_id: parseInt(id || '0'),
      round: match.round,
      match_number: match.match_number,
      player1: match.player1,
      player2: match.player2,
      predicted_winner: player,
    };
    if (pickIndex !== -1) {
      newPicks[pickIndex] = newPick;
    } else {
      newPicks.push(newPick);
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
      const updatedData: Tournament = await updatedResponse.json();
      setPicks(updatedData.user_picks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    }
  };

  return {
    tournament,
    matches,
    picks,
    error,
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