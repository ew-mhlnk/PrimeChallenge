'use client';

import { useState, useEffect } from 'react';
import { Tournament, UserPick, ComparisonResult, Match } from '@/types';

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

  // Загрузка данных турнира, матчей и пиков
  useEffect(() => {
    const fetchTournamentData = async () => {
      if (!id) return;

      setIsLoading(true);
      try {
        const initData = window.Telegram?.WebApp?.initData;
        if (!initData) {
          throw new Error('Telegram initData not available');
        }

        const response = await fetch(`https://primechallenge.onrender.com/bracket/${id}`, {
          headers: {
            Authorization: initData,
          },
        });
        if (!response.ok) {
          throw new Error('Ошибка при загрузке турнира');
        }
        const data: Tournament = await response.json();
        setTournament(data);

        // Устанавливаем матчи и пики
        setMatches(data.true_draws || []);
        setPicks(data.user_picks || []);

        // Устанавливаем раунды
        if (data.starting_round) {
          const startIdx = allRounds.indexOf(data.starting_round);
          const availableRounds = allRounds.slice(startIdx);
          setRounds(availableRounds);
          setSelectedRound(data.starting_round);
        } else {
          setRounds(allRounds);
          setSelectedRound(allRounds[0]);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Неизвестная ошибка';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTournamentData();
  }, [id, allRounds]);

  // Сравнение пиков с реальными результатами
  useEffect(() => {
    const computeComparison = () => {
      if (!matches || !picks) return;

      const comparisonResults: ComparisonResult[] = matches.map((match) => {
        const pick = picks.find(
          (p) => p.round === match.round && p.match_number === match.match_number
        );
        return {
          round: match.round,
          match_number: match.match_number,
          player1: match.player1 || 'TBD',
          player2: match.player2 || 'TBD',
          predicted_winner: pick?.predicted_winner || '',
          actual_winner: match.winner || '',
          correct: pick?.predicted_winner === match.winner && !!match.winner,
        };
      });
      setComparison(comparisonResults);
    };

    computeComparison();
  }, [matches, picks]);

  // Функция для обработки пиков
  const handlePick = async (match: UserPick, player: string | null) => {
    try {
      const initData = window.Telegram?.WebApp?.initData;
      if (!initData) {
        throw new Error('Telegram initData not available');
      }

      const response = await fetch('https://primechallenge.onrender.com/picks/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: initData,
        },
        body: JSON.stringify({
          tournament_id: match.tournament_id,
          round: match.round,
          match_number: match.match_number,
          predicted_winner: player,
        }),
      });

      if (!response.ok) {
        throw new Error('Ошибка при обновлении пика');
      }

      const updatedPick: UserPick = await response.json();
      const updatedPicks = picks.some((p) => p.id === updatedPick.id)
        ? picks.map((p) => (p.id === updatedPick.id ? updatedPick : p))
        : [...picks, updatedPick];
      setPicks(updatedPicks);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setError(message);
    }
  };

  // Функция для сохранения всех пиков
  const savePicks = async () => {
    try {
      const initData = window.Telegram?.WebApp?.initData;
      if (!initData) {
        throw new Error('Telegram initData not available');
      }

      const response = await fetch('https://primechallenge.onrender.com/picks/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: initData,
        },
        body: JSON.stringify(picks),
      });

      if (!response.ok) {
        throw new Error('Ошибка при сохранении пиков');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setError(message);
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
  };
};