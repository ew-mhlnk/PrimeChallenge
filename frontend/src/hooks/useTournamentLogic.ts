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

  useEffect(() => {
    const fetchTournamentData = async () => {
      if (!id) return;

      setIsLoading(true);
      try {
        const initData = window.Telegram?.WebApp?.initData;
        if (!initData) {
          throw new Error('Telegram initData not available');
        }

        const response = await fetch(`https://primechallenge.onrender.com/tournament/${id}`, {
          headers: { Authorization: initData },
        });
        if (!response.ok) {
          throw new Error('Ошибка при загрузке турнира');
        }
        const data: Tournament & { compared_picks?: ComparisonResult[] } = await response.json();
        setTournament(data);

        const fetchedMatches = data.true_draws || [];
        let fetchedPicks = data.user_picks || [];
        const fetchedComparison = data.compared_picks || [];
        setMatches(fetchedMatches);
        setComparison(fetchedComparison);

        // Устанавливаем все раунды, начиная с starting_round
        let availableRounds: string[] = [];
        if (data.starting_round) {
          const startIdx = allRounds.indexOf(data.starting_round);
          if (startIdx !== -1) {
            availableRounds = allRounds.slice(startIdx);
          } else {
            availableRounds = allRounds;
          }
          setSelectedRound(data.starting_round || allRounds[0]);
        } else {
          availableRounds = allRounds;
          setSelectedRound(allRounds[0]);
        }
        setRounds(availableRounds);

        // Создаём заготовки пиков для starting_round, если их нет
        if (fetchedPicks.length === 0 && data.status === 'ACTIVE' && data.starting_round) {
          const firstRoundMatches = fetchedMatches.filter(
            (match) => match.round === data.starting_round
          );
          fetchedPicks = firstRoundMatches.map((match) => ({
            id: match.match_number,
            user_id: 0,
            tournament_id: parseInt(id),
            round: match.round,
            match_number: match.match_number,
            player1: match.player1,
            player2: match.player2 || 'TBD',
            predicted_winner: match.player2 === 'Bye' ? match.player1 : null,
          }));
        }

        setPicks(fetchedPicks);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Неизвестная ошибка';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTournamentData();
  }, [id, allRounds]);

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

    const currentRoundIdx = allRounds.indexOf(match.round);
    if (player && currentRoundIdx < allRounds.length - 1) {
      const nextRound = allRounds[currentRoundIdx + 1];
      const nextMatchNumber = Math.ceil(match.match_number / 2);

      let nextMatch = newPicks.find(
        (p) => p.round === nextRound && p.match_number === nextMatchNumber
      );
      if (!nextMatch) {
        nextMatch = {
          id: nextMatchNumber,
          user_id: 0,
          tournament_id: match.tournament_id,
          round: nextRound,
          match_number: nextMatchNumber,
          player1: '',
          player2: '',
          predicted_winner: null,
        };
        newPicks.push(nextMatch);
      }

      if (nextMatch) {
        if (match.match_number % 2 === 1) {
          nextMatch.player1 = player;
        } else {
          nextMatch.player2 = player;
        }

        if (nextMatch.player1 && nextMatch.player2 && !nextMatch.predicted_winner) {
          nextMatch.predicted_winner = null;
        }

        if (nextRound === 'F' && nextMatchNumber === 1) {
          let winnerMatch = newPicks.find((p) => p.round === 'W' && p.match_number === 1);
          if (!winnerMatch) {
            winnerMatch = {
              id: 1,
              user_id: 0,
              tournament_id: match.tournament_id,
              round: 'W',
              match_number: 1,
              player1: '',
              player2: '',
              predicted_winner: null,
            };
            newPicks.push(winnerMatch);
          }
          if (winnerMatch) {
            winnerMatch.player1 = player;
          }
        }
      }
    }

    if (player === null) {
      const currentRoundIdx = allRounds.indexOf(match.round);
      for (let roundIdx = currentRoundIdx + 1; roundIdx < allRounds.length; roundIdx++) {
        const nextRound = allRounds[roundIdx];
        const nextMatchNumber = Math.ceil(match.match_number / 2);
        const nextMatch = newPicks.find(
          (p) => p.round === nextRound && p.match_number === nextMatchNumber
        );

        if (nextMatch) {
          if (match.match_number % 2 === 1) {
            if (nextMatch.player1 === match.predicted_winner) {
              nextMatch.player1 = '';
              nextMatch.predicted_winner = null;
            }
          } else {
            if (nextMatch.player2 === match.predicted_winner) {
              nextMatch.player2 = '';
              nextMatch.predicted_winner = null;
            }
          }
        }

        if (nextRound === 'W') {
          const winnerMatch = newPicks.find((p) => p.round === 'W' && p.match_number === 1);
          if (winnerMatch) {
            winnerMatch.player1 = '';
            winnerMatch.predicted_winner = null;
          }
        }
      }
    }

    setPicks(newPicks);

    try {
      const initData = window.Telegram?.WebApp?.initData;
      if (!initData) throw new Error('Telegram initData not available');

      const response = await fetch('https://primechallenge.onrender.com/picks/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: initData },
        body: JSON.stringify({
          tournament_id: match.tournament_id,
          round: match.round,
          match_number: match.match_number,
          predicted_winner: player,
        }),
      });

      if (!response.ok) throw new Error('Ошибка при обновлении пика');

      const updatedPick: UserPick = await response.json();
      const updatedPicks = newPicks.map((p) =>
        p.round === updatedPick.round && p.match_number === updatedPick.match_number ? updatedPick : p
      );
      setPicks(updatedPicks);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setError(message);
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