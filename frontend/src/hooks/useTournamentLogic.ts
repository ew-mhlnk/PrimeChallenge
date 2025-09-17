'use client';

import { useState, useEffect } from 'react';
import { Tournament, BracketMatch, ComparisonResult } from '@/types';

interface UseTournamentLogicProps {
  id: string;
}

export function useTournamentLogic({ id }: UseTournamentLogicProps) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [bracket, setBracket] = useState<{ [round: string]: BracketMatch[] }>({});
  const [hasPicks, setHasPicks] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedRound, setSelectedRound] = useState<string | null>(null);
  const [rounds, setRounds] = useState<string[]>([]);
  const [comparison, setComparison] = useState<ComparisonResult[]>([]);

  useEffect(() => {
    const fetchTournament = async () => {
      setIsLoading(true);
      try {
        const initData = window.Telegram?.WebApp?.initData;
        if (!initData) throw new Error('Telegram initData not available');

        const response = await fetch(`https://primechallenge.onrender.com/tournament/${id}`, {
          headers: { Authorization: initData },
        });
        if (!response.ok) throw new Error('Failed to fetch tournament');
        const data = await response.json();

        setTournament(data);
        setBracket(data.bracket || {});
        setHasPicks(data.has_picks || false);
        setRounds(data.rounds || []);
        setComparison(data.comparison || []);
        setSelectedRound(data.rounds?.[0] || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };
    fetchTournament();
  }, [id]);

  const handlePick = (round: string, matchId: string, player: string) => {
    setBracket((prev) => {
      const newBracket = { ...prev };
      const matchIndex = newBracket[round].findIndex((m) => m.id === matchId);
      if (matchIndex !== -1) {
        newBracket[round][matchIndex] = { ...newBracket[round][matchIndex], predicted_winner: player };
      }
      return newBracket;
    });
    setHasPicks(true);
  };

  const savePicks = async () => {
    try {
      const initData = window.Telegram?.WebApp?.initData;
      if (!initData) throw new Error('Telegram initData not available');

      const picks = Object.values(bracket)
        .flat()
        .filter((match) => match.predicted_winner)
        .map((match) => ({
          tournament_id: parseInt(id),
          round: match.round,
          match_number: parseInt(match.id.split('_')[2]),
          predicted_winner: match.predicted_winner,
        }));

      const response = await fetch('https://primechallenge.onrender.com/picks/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: initData,
        },
        body: JSON.stringify(picks),
      });
      if (!response.ok) throw new Error('Failed to save picks');
      setHasPicks(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return {
    tournament,
    bracket,
    hasPicks,
    error,
    isLoading,
    selectedRound,
    setSelectedRound,
    rounds,
    handlePick,
    savePicks,
    comparison,
  };
}