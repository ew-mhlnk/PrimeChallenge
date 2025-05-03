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
        const availableRounds = allRounds.slice(roundIndex);
        setRounds(availableRounds);
        setSelectedRound(startingRound);

        let generatedPicks: UserPick[] = [];

        if (data.status === 'COMPLETED') {
          if (initialPicks.length === 0) {
            setError('Вы не участвовали в этом турнире');
            setPicks([]);
            setIsLoading(false);
            return;
          }
          generatedPicks = initialPicks;
        } else if (data.status === 'ACTIVE') {
          if (initialPicks.length === 0) {
            const firstRoundMatches = fetchedMatches.filter((match) => match.round === startingRound);
            if (firstRoundMatches.length !== 16 && startingRound === 'R32') {
              console.warn('Expected 16 matches for R32, got:', firstRoundMatches.length);
            }

            generatedPicks = firstRoundMatches.map((match) => ({
              id: match.match_number,
              user_id: userId,
              tournament_id: parseInt(id),
              round: match.round,
              match_number: match.match_number,
              player1: match.player1 || 'TBD',
              player2: match.player2 || 'TBD',
              predicted_winner: match.player2 === 'Bye' ? match.player1 : null,
            }));

            const matchCounts: { [key: string]: number } = {
              'R32': 16, 'R16': 8, 'QF': 4, 'SF': 2, 'F': 1, 'W': 1
            };

            for (let i = roundIndex + 1; i < allRounds.length; i++) {
              const round = allRounds[i];
              const count = matchCounts[round] || 1;
              for (let matchNum = 1; matchNum <= count; matchNum++) {
                generatedPicks.push({
                  id: matchNum,
                  user_id: userId,
                  tournament_id: parseInt(id),
                  round,
                  match_number: matchNum,
                  player1: 'TBD',
                  player2: round !== 'W' ? 'TBD' : '',
                  predicted_winner: null,
                });
              }
            }
          } else {
            generatedPicks = initialPicks;

            const matchCounts: { [key: string]: number } = {
              'R32': 16, 'R16': 8, 'QF': 4, 'SF': 2, 'F': 1, 'W': 1
            };
            const existingRounds = new Set(generatedPicks.map(pick => pick.round));

            for (let i = roundIndex; i < allRounds.length; i++) {
              const round = allRounds[i];
              if (!existingRounds.has(round)) {
                const count = matchCounts[round] || 1;
                for (let matchNum = 1; matchNum <= count; matchNum++) {
                  generatedPicks.push({
                    id: matchNum,
                    user_id: userId,
                    tournament_id: parseInt(id),
                    round,
                    match_number: matchNum,
                    player1: 'TBD',
                    player2: round !== 'W' ? 'TBD' : '',
                    predicted_winner: null,
                  });
                }
              }
            }
          }
        }

        setPicks(generatedPicks);
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

      const nextMatch = newPicks.find(
        (p) => p.round === nextRound && p.match_number === nextMatchNumber
      );
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
          const winnerMatch = newPicks.find((p) => p.round === 'W' && p.match_number === 1);
          if (winnerMatch) {
            winnerMatch.player1 = player;
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