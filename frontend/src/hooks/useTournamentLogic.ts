'use client';

import { useState, useEffect } from 'react';
import { Tournament, ComparisonResult, BracketMatch } from '@/types';

interface UseTournamentLogicProps {
  id?: string;
}

export const useTournamentLogic = ({ id }: UseTournamentLogicProps) => {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [bracket, setBracket] = useState<{ [round: string]: { [matchNumber: number]: BracketMatch } }>({});
  const [hasPicks, setHasPicks] = useState<boolean>(false);
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
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Failed to fetch tournament:', response.status, errorText);
          throw new Error('Ошибка при загрузке турнира');
        }
        const data = await response.json();
        console.log('Tournament data:', data); // Для отладки

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
          rounds: data.rounds || [],
        };
        setTournament(tournamentData);
        setBracket(data.bracket || {});
        setHasPicks(data.has_picks || false);
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

  const handlePick = async (round: string, matchNumber: number, player: string) => {
    if (tournament?.status !== 'ACTIVE') {
      setError('Турнир закрыт, пики нельзя изменить');
      return;
    }

    try {
      const initData = window.Telegram?.WebApp?.initData;
      if (!initData) throw new Error('Telegram initData not available');

      const response = await fetch('https://primechallenge.onrender.com/picks/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: initData },
        body: JSON.stringify({
          user_id: userId,
          tournament_id: parseInt(id || '0'),
          round,
          match_number: matchNumber,
          predicted_winner: player,
        }),
      });
      if (!response.ok) throw new Error('Ошибка при сохранении пика');

      const updatedResponse = await fetch(`https://primechallenge.onrender.com/tournament/${id}`, {
        headers: { Authorization: initData },
      });
      if (!updatedResponse.ok) throw new Error('Ошибка при обновлении данных турнира');
      const updatedData = await updatedResponse.json();
      setBracket(updatedData.bracket || {});
      setHasPicks(updatedData.has_picks || false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    }
  };

  const savePicks = async () => {
    if (tournament?.status !== 'ACTIVE') {
      setError('Турнир закрыт, пики нельзя изменить');
      return;
    }

    try {
      const initData = window.Telegram?.WebApp?.initData;
      if (!initData) throw new Error('Telegram initData not available');

      const picksToSave = [];
      for (const round of rounds) {
        for (const [matchNum, match] of Object.entries(bracket[round] || {})) {
          if (match.predicted_winner) {
            picksToSave.push({
              user_id: userId,
              tournament_id: parseInt(id || '0'),
              round,
              match_number: parseInt(matchNum),
              predicted_winner: match.predicted_winner,
            });
          }
        }
      }

      const response = await fetch('https://primechallenge.onrender.com/picks/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: initData },
        body: JSON.stringify(picksToSave),
      });
      if (!response.ok) throw new Error('Ошибка при сохранении пиков');

      const updatedResponse = await fetch(`https://primechallenge.onrender.com/tournament/${id}`, {
        headers: { Authorization: initData },
      });
      if (!updatedResponse.ok) throw new Error('Ошибка при обновлении данных турнира');
      const updatedData = await updatedResponse.json();
      setBracket(updatedData.bracket || {});
      setHasPicks(updatedData.has_picks || false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    }
  };

  return {
    tournament,
    bracket,
    hasPicks,
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