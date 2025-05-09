// frontend\src\hooks\useTournamentLogic.ts
'use client';

import { useState, useEffect } from 'react';
import { Tournament, UserPick, ComparisonResult, Match } from '@/types';

interface UseTournamentLogicProps {
  id?: string;
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
        const data = await response.json();
        const tournamentData: Tournament = {
          id: data.id,
          name: data.name,
          dates: data.dates,
          status: data.status,
          sheet_name: data.sheet_name || null,
          starting_round: data.starting_round || null,
          type: data.type || null,
          start: data.start || null,
          close: data.close || null,
          tag: data.tag || null,
          true_draws: data.true_draws || [],
          user_picks: data.user_picks || [],
          scores: data.scores || null,
        };
        setTournament(tournamentData);

        const fetchedMatches = data.true_draws || [];
        setMatches(fetchedMatches);

        const fetchedPicks = data.user_picks || [];
        setPicks(fetchedPicks);

        setRounds(data.rounds || []);
        setSelectedRound(data.rounds[0] || null);

        if (data.comparison) {
          setComparison(data.comparison);
          setCorrectPicks(data.correct_picks || 0);
          setScore(data.score || 0);
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
      const updatedData = await updatedResponse.json();
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