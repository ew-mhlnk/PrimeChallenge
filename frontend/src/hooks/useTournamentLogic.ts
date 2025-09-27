'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
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
        console.log('Fetching tournament with ID:', id); // Отладка
        const initData = window.Telegram?.WebApp?.initData;
        console.log('initData:', initData); // Отладка
        if (!initData) throw new Error('Telegram initData not available');
        if (!id || id === 'undefined') throw new Error('Invalid tournament ID');

        const response = await fetch(`https://primechallenge.onrender.com/tournament/${id}`, {
          headers: { Authorization: initData },
        });
        console.log('Response status:', response.status); // Отладка
        if (!response.ok) {
          const errorText = await response.text();
          console.log('Response error:', errorText); // Отладка
          throw new Error(`Failed to fetch tournament: ${errorText}`);
        }
        const data = await response.json();
        console.log('Tournament data:', data); // Отладка
        console.log('Bracket structure:', data.bracket); // Отладка
        setTournament(data);
        setBracket(data.bracket || {});
        setHasPicks(data.has_picks || false);
        setRounds(data.rounds || []);
        setComparison(data.comparison || []);
        setSelectedRound(data.starting_round || data.rounds?.[0] || null);
      } catch (err) {
        console.error('Fetch error:', err); // Отладка
        setError(err instanceof Error ? err.message : 'Unknown error');
        toast.error(err instanceof Error ? err.message : 'Ошибка загрузки турнира');
      } finally {
        setIsLoading(false);
      }
    };
    fetchTournament();
  }, [id]);

  const handlePick = (round: string, matchId: string, player: string) => {
    console.log('Handle pick:', { round, matchId, player }); // Отладка
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
      console.log('Saving picks, initData:', initData); // Отладка
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

      console.log('Picks to save:', picks); // Отладка
      const response = await fetch('https://primechallenge.onrender.com/picks/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: initData,
        },
        body: JSON.stringify(picks),
      });
      console.log('Save picks response:', response.status); // Отладка
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save picks: ${errorText}`);
      }
      setHasPicks(true);
      toast.success('Пики сохранены!');
    } catch (err) {
      console.error('Save picks error:', err); // Отладка
      setError(err instanceof Error ? err.message : 'Unknown error');
      toast.error(err instanceof Error ? err.message : 'Ошибка сохранения пиков');
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