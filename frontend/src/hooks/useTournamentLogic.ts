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
          dates: data.dates || undefined,
          status: data.status as 'ACTIVE' | 'CLOSED' | 'COMPLETED',
          sheet_name: data.sheet_name || undefined,
          starting_round: data.starting_round || undefined,
          type: data.type || undefined,
          start: data.start || undefined,
          close: data.close || undefined,
          tag: data.tag || undefined,
          true_draws: data.true_draws || [],
          user_picks: data.user_picks || [],
          scores: data.scores || [],
          rounds: data.rounds || [],
          bracket: data.bracket || {},
          has_picks: data.has_picks || false,
          comparison: data.comparison || [],
          score: data.score || 0,
          correct_picks: data.correct_picks || 0,
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

  const handlePick = (round: string, matchNumber: number, player: string) => {
    if (tournament?.status !== 'ACTIVE') {
      setError('Турнир закрыт, пики нельзя изменить');
      return;
    }

    setBracket((prevBracket) => {
      const newBracket = { ...prevBracket };
      if (!newBracket[round]) newBracket[round] = {};
      newBracket[round][matchNumber] = {
        ...newBracket[round][matchNumber],
        predicted_winner: player,
      };
      return newBracket;
    });
    setHasPicks(true);
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
              tournament_id: parseInt(id || '0'),
              round,
              match_number: parseInt(matchNum),
              predicted_winner: match.predicted_winner,
            });
          }
        }
      }

      console.log('Saving picks:', picksToSave); // Для отладки

      const response = await fetch('https://primechallenge.onrender.com/picks/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: initData },
        body: JSON.stringify(picksToSave),
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to save picks:', response.status, errorText);
        throw new Error('Ошибка при сохранении пиков');
      }

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