'use client';

import { useState, useEffect } from 'react';
import { Tournament, UserPick, ComparisonResult, Match } from '@/types';

interface UseTournamentLogicProps {
  id?: string;
  allRounds: string[];
}

export const useTournamentLogic = ({ id, allRounds }: UseTournamentLogicProps) => {
  // Состояние для хранения данных турнира, матчей, пиков и т.д.
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [picks, setPicks] = useState<UserPick[]>([]);
  const [comparison, setComparison] = useState<ComparisonResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedRound, setSelectedRound] = useState<string | null>(null);
  const [rounds, setRounds] = useState<string[]>([]);

  // Загружаем данные турнира при монтировании компонента
  useEffect(() => {
    const fetchTournamentData = async () => {
      if (!id) return;

      setIsLoading(true); // Показываем состояние загрузки
      try {
        const initData = window.Telegram?.WebApp?.initData;
        if (!initData) {
          throw new Error('Telegram initData not available');
        }

        console.log('useTournamentLogic: Fetching tournament with id', id);
        const response = await fetch(`https://primechallenge.onrender.com/tournament/${id}`, {
          headers: {
            Authorization: initData,
          },
        });
        if (!response.ok) {
          throw new Error('Ошибка при загрузке турнира');
        }
        const data: Tournament & { compared_picks?: ComparisonResult[] } = await response.json();
        console.log('useTournamentLogic: Fetched data', data);
        setTournament(data);

        // Устанавливаем матчи, пики и сравнения
        const fetchedMatches = data.true_draws || [];
        const fetchedPicks = data.user_picks || [];
        const fetchedComparison = data.compared_picks || [];
        console.log('useTournamentLogic: Matches', fetchedMatches);
        console.log('useTournamentLogic: Picks', fetchedPicks);
        console.log('useTournamentLogic: Comparison', fetchedComparison);
        setMatches(fetchedMatches);
        setPicks(fetchedPicks);
        setComparison(fetchedComparison);

        // Устанавливаем доступные раунды
        if (data.starting_round) {
          const startIdx = allRounds.indexOf(data.starting_round);
          if (startIdx === -1) {
            console.error('useTournamentLogic: Invalid starting_round', data.starting_round);
            setRounds(allRounds);
            setSelectedRound(allRounds[0]);
          } else {
            const availableRounds = allRounds.slice(startIdx);
            console.log('useTournamentLogic: Available rounds', availableRounds);
            setRounds(availableRounds);
            setSelectedRound(data.starting_round);
          }
        } else {
          console.log('useTournamentLogic: No starting_round, using default');
          setRounds(allRounds);
          setSelectedRound(allRounds[0]);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Неизвестная ошибка';
        console.error('useTournamentLogic: Error', message);
        setError(message);
      } finally {
        setIsLoading(false); // Снимаем состояние загрузки
      }
    };

    fetchTournamentData();
  }, [id, allRounds]);

  // Функция для отправки пика на сервер
  const handlePick = async (match: UserPick, player: string | null) => {
    // Проверяем статус турнира перед редактированием
    if (tournament?.status !== 'ACTIVE') {
      setError('Турнир закрыт, пики нельзя изменить');
      return;
    }

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
      // Обновляем локальное состояние пиков
      const updatedPicks = picks.some((p) => p.id === updatedPick.id)
        ? picks.map((p) => (p.id === updatedPick.id ? updatedPick : p))
        : [...picks, updatedPick];
      setPicks(updatedPicks);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setError(message);
    }
  };

  // Функция для сохранения всех пиков сразу
  const savePicks = async () => {
    if (tournament?.status !== 'ACTIVE') {
      setError('Турнир закрыт, пики нельзя изменить');
      return;
    }

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