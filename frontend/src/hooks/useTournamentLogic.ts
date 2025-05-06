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
  const [error, setError] = useState<string | null>(null); // Исправлено state на useState
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

        const userIdMatch = initData.match(/user=([^&]+)/);
        const userData = userIdMatch ? JSON.parse(decodeURIComponent(userIdMatch[1])) : null;
        const userId = userData?.id || 0;

        const response = await fetch(`https://primechallenge.onrender.com/tournament/${id}`, {
          headers: { Authorization: initData },
        });
        if (!response.ok) {
          throw new Error('Ошибка при загрузке турнира');
        }
        const data: Tournament & { compared_picks?: ComparisonResult[] } = await response.json();
        setTournament(data);

        const fetchedMatches = data.true_draws || [];
        const initialPicks = data.user_picks || [];
        const fetchedComparison = data.compared_picks || [];
        setMatches(fetchedMatches);
        setComparison(fetchedComparison);

        const startingRound = data.starting_round || allRounds[0];
        const roundIndex = allRounds.indexOf(startingRound);
        const availableRounds = allRounds.slice(roundIndex, roundIndex + 2); // Только первые два раунда (R32 и R16)
        setRounds(availableRounds);
        setSelectedRound(startingRound);

        let generatedPicks: UserPick[] = [];

        if (data.status === 'COMPLETED') {
          if (initialPicks.length === 0) {
            setError('Вы не участвовали в этом турнире!');
            setPicks([]);
            setIsLoading(false);
            return;
          }
          generatedPicks = initialPicks;
        } else if (data.status === 'ACTIVE') {
          const firstTwoRoundMatches = fetchedMatches
            .filter((match) => ['R32', 'R16'].includes(match.round))
            .sort((a, b) => {
              if (a.round !== b.round) return allRounds.indexOf(a.round) - allRounds.indexOf(b.round);
              return a.match_number - b.match_number;
            });

          if (firstTwoRoundMatches.length === 0) {
            throw new Error(`Нет матчей для начальных раундов ${startingRound} и R16`);
          }

          if (initialPicks.length === 0) {
            // Нет сохранённых пиков — загружаем из true_draws
            generatedPicks = firstTwoRoundMatches.map((match) => ({
              id: match.id || match.match_number,
              user_id: userId,
              tournament_id: parseInt(id),
              round: match.round,
              match_number: match.match_number,
              player1: match.player1 || '',
              player2: match.player2 || '',
              predicted_winner: null,
            }));
          } else {
            // Есть сохранённые пики — используем их
            generatedPicks = initialPicks;
            // Дополняем только первыми двумя раундами
            const firstTwoRoundMatchCount = firstTwoRoundMatches.filter(m => m.round === startingRound).length;
            let matchCount = firstTwoRoundMatchCount;
            for (let i = roundIndex; i < roundIndex + 2 && i < allRounds.length; i++) {
              matchCount = i === roundIndex ? firstTwoRoundMatchCount : Math.ceil(matchCount / 2);
              const round = allRounds[i];
              for (let matchNum = 1; matchNum <= matchCount; matchNum++) {
                if (!generatedPicks.find(p => p.round === round && p.match_number === matchNum)) {
                  generatedPicks.push({
                    id: matchNum,
                    user_id: userId,
                    tournament_id: parseInt(id),
                    round,
                    match_number: matchNum,
                    player1: '',
                    player2: round !== 'W' ? '' : '',
                    predicted_winner: null,
                  });
                }
              }
            }
          }
        }

        setPicks(generatedPicks);
        console.log('Начальные пики:', generatedPicks);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Неизвестная ошибка';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTournamentData();
  }, [id, allRounds, setError]); // Добавлен setError в зависимости

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
      newPicks[pickIndex] = { ...newPicks[pickIndex], predicted_winner: player, player1: match.player1, player2: match.player2 };
    } else {
      newPicks.push({ ...match, predicted_winner: player, player1: match.player1, player2: match.player2 });
    }

    const currentRoundIdx = allRounds.indexOf(match.round);
    if (player && currentRoundIdx < allRounds.length - 1 && currentRoundIdx < 1) { // Только для R32 -> R16
      const nextRound = allRounds[currentRoundIdx + 1];
      const nextMatchNumber = Math.ceil(match.match_number / 2);

      const nextMatch = newPicks.find(
        (p) => p.round === nextRound && p.match_number === nextMatchNumber
      );
      if (nextMatch) {
        if (match.match_number % 2 === 1) {
          nextMatch.player1 = player;
        } else {
          nextMatch.player2 = player;
        }
        if (nextMatch.player1 && nextMatch.player2 && nextMatch.predicted_winner) {
          nextMatch.predicted_winner = null;
        }
        console.log(`Обновлён матч следующего раунда ${nextRound}-${nextMatchNumber}:`, nextMatch);
      } else {
        console.warn(`Не найден матч следующего раунда ${nextRound}-${nextMatchNumber}`);
      }
    }

    setPicks(newPicks);
    console.log('Обновлённые пики после handlePick:', newPicks);
  };

  const savePicks = async () => {
    if (tournament?.status !== 'ACTIVE') {
      setError('Турнир закрыт, пики нельзя изменить');
      return;
    }

    try {
      const initData = window.Telegram?.WebApp?.initData;
      if (!initData) throw new Error('Telegram initData not available');

      // Удаляем старые пики перед сохранением новых
      const deleteResponse = await fetch(`https://primechallenge.onrender.com/picks/delete?tournament_id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: initData },
      });
      if (!deleteResponse.ok) throw new Error('Ошибка при удалении старых пиков');

      // Сохраняем новые пики
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
      console.log('Пики после сохранения:', updatedData.user_picks);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setError(message);
      console.error('Ошибка при сохранении:', message);
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