'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Tournament, BracketMatch } from '@/types';

interface UseTournamentLogicProps {
  id: string;
}

// Тип для отправки данных на бэкенд
type PickPayload = {
  tournament_id: number;
  round: string;
  match_number: number;
  predicted_winner: string;
};

export function useTournamentLogic({ id }: UseTournamentLogicProps) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [bracket, setBracket] = useState<{ [round: string]: BracketMatch[] }>({});
  const [hasPicks, setHasPicks] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedRound, setSelectedRound] = useState<string | null>(null);
  const [rounds, setRounds] = useState<string[]>([]);

  // === ЛОГИКА ПРОНОСА ПОБЕДИТЕЛЯ ===
  const propagateWinner = useCallback((
    bracketState: { [round: string]: BracketMatch[] },
    roundList: string[],
    currentRound: string,
    matchNumber: number,
    winnerName: string | null
  ) => {
    const currentRoundIndex = roundList.indexOf(currentRound);
    if (currentRoundIndex === -1 || currentRoundIndex === roundList.length - 1) return;

    const nextRound = roundList[currentRoundIndex + 1];
    const nextMatchNumber = Math.ceil(matchNumber / 2);
    const isPlayer1InNext = matchNumber % 2 !== 0; 

    const nextMatch = bracketState[nextRound]?.find((m) => m.match_number === nextMatchNumber);

    if (nextMatch) {
      const targetPlayerSlot = isPlayer1InNext ? 'player1' : 'player2';
      
      if (!winnerName) {
        nextMatch[targetPlayerSlot] = { name: 'TBD' };
        
        if (nextMatch.predicted_winner === (isPlayer1InNext ? nextMatch.player1?.name : nextMatch.player2?.name)) {
          nextMatch.predicted_winner = null;
          propagateWinner(bracketState, roundList, nextRound, nextMatchNumber, null);
        }
      } else {
        nextMatch[targetPlayerSlot] = { name: winnerName };

        if (nextMatch.predicted_winner && nextMatch.predicted_winner !== winnerName) {
           nextMatch.predicted_winner = null;
           propagateWinner(bracketState, roundList, nextRound, nextMatchNumber, null);
        }
      }
    }
  }, []);

  // === ОБРАБОТКА BYE ===
  const processInitialByes = useCallback((initialBracket: { [round: string]: BracketMatch[] }, roundList: string[]) => {
    const newBracket = JSON.parse(JSON.stringify(initialBracket));
    const firstRound = roundList[0];
    
    if (newBracket[firstRound]) {
      newBracket[firstRound].forEach((match: BracketMatch) => {
        if (match.predicted_winner) {
           propagateWinner(newBracket, roundList, firstRound, match.match_number, match.predicted_winner);
        } 
        else if (match.player1?.name === 'Bye' && match.player2?.name && match.player2.name !== 'TBD') {
          match.predicted_winner = match.player2.name;
          propagateWinner(newBracket, roundList, firstRound, match.match_number, match.player2.name);
        }
        else if (match.player2?.name === 'Bye' && match.player1?.name && match.player1.name !== 'TBD') {
          match.predicted_winner = match.player1.name;
          propagateWinner(newBracket, roundList, firstRound, match.match_number, match.player1.name);
        }
      });
    }
    return newBracket;
  }, [propagateWinner]);

  // === ЗАГРУЗКА ДАННЫХ ===
  useEffect(() => {
    const fetchTournament = async () => {
      setIsLoading(true);
      try {
        const initData = window.Telegram?.WebApp?.initData;
        if (!initData) throw new Error('Telegram initData not available');

        const response = await fetch(`https://primechallenge.onrender.com/tournament/${id}`, {
          headers: { Authorization: initData },
        });

        if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
        const data = await response.json();

        // Нормализация статуса (убираем пробелы, верхний регистр)
        if (data.status) data.status = data.status.trim().toUpperCase();

        setTournament(data);
        setRounds(data.rounds || []);
        setSelectedRound(data.starting_round || data.rounds?.[0] || null);

        const initializedBracket = processInitialByes(data.bracket || {}, data.rounds || []);
        setBracket(initializedBracket);
        
        if (data.has_picks) setHasPicks(true);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error');
      } finally {
        setIsLoading(false);
      }
    };
    fetchTournament();
  }, [id, processInitialByes]);

  // === ОБРАБОТЧИК КЛИКА ===
  const handlePick = (round: string, matchId: string, player: string) => {
    if (tournament?.status !== 'ACTIVE') {
        toast.error('Турнир не активен для прогнозов');
        return;
    }

    setBracket((prev) => {
      const newBracket = JSON.parse(JSON.stringify(prev));
      const matchesInRound = newBracket[round];
      const matchIndex = matchesInRound.findIndex((m: BracketMatch) => m.id === matchId);

      if (matchIndex !== -1) {
        const match = matchesInRound[matchIndex];
        
        if (match.predicted_winner === player) {
          match.predicted_winner = null;
          propagateWinner(newBracket, rounds, round, match.match_number, null);
        } else {
          match.predicted_winner = player;
          propagateWinner(newBracket, rounds, round, match.match_number, player);
        }
      }
      return newBracket;
    });
    setHasPicks(true);
  };

  // === СОХРАНЕНИЕ ===
  const savePicks = async () => {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) return;

    // ИСПРАВЛЕНИЕ 1: Типизируем массив picks
    const picks: PickPayload[] = [];
    
    Object.keys(bracket).forEach(r => {
        bracket[r].forEach(m => {
            if (m.predicted_winner) {
                picks.push({
                    tournament_id: parseInt(id),
                    round: m.round,
                    match_number: m.match_number,
                    predicted_winner: m.predicted_winner
                });
            }
        });
    });

    try {
      const response = await fetch('https://primechallenge.onrender.com/picks/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: initData,
        },
        body: JSON.stringify(picks),
      });

      if (response.ok) {
          toast.success('Пики успешно сохранены!');
      } else {
          throw new Error('Failed to save');
      }
    } catch (error) {
      // ИСПРАВЛЕНИЕ 2: Используем переменную error
      console.error('Ошибка при сохранении:', error);
      toast.error('Ошибка сохранения');
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
  };
}