'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Tournament, BracketMatch } from '@/types';

interface UseTournamentLogicProps {
  id: string;
}

// Тип для отправки на бэкенд
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

  // === 1. ГЕНЕРАЦИЯ ПУСТОЙ СТРУКТУРЫ ===
  const ensureBracketStructure = useCallback((baseBracket: { [round: string]: BracketMatch[] }, roundList: string[], tourId: number) => {
    const newBracket = JSON.parse(JSON.stringify(baseBracket));

    for (let i = 0; i < roundList.length; i++) {
      const roundName = roundList[i];
      
      if (!newBracket[roundName]) {
        newBracket[roundName] = [];
      }

      let expectedMatches = 0;
      if (i === 0) {
        expectedMatches = newBracket[roundName].length;
      } else {
        const prevRoundName = roundList[i - 1];
        expectedMatches = Math.ceil(newBracket[prevRoundName].length / 2);
      }

      if (newBracket[roundName].length < expectedMatches) {
        for (let m = 1; m <= expectedMatches; m++) {
            const existingMatch = newBracket[roundName].find((match: BracketMatch) => match.match_number === m);
            if (!existingMatch) {
                newBracket[roundName].push({
                    id: `${tourId}_${roundName}_${m}`,
                    round: roundName,
                    match_number: m,
                    player1: { name: 'TBD' },
                    player2: { name: 'TBD' },
                    predicted_winner: null
                });
            }
        }
        newBracket[roundName].sort((a: BracketMatch, b: BracketMatch) => a.match_number - b.match_number);
      }
    }
    return newBracket;
  }, []);

  // === 2. ПРОНОС ПОБЕДИТЕЛЯ (РЕКУРСИВНО) ===
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
      const targetSlot = isPlayer1InNext ? 'player1' : 'player2';
      const oldPlayerName = nextMatch[targetSlot]?.name;

      // Обновляем слот
      nextMatch[targetSlot] = { name: winnerName || 'TBD' };

      // Если слот изменился, и этот игрок был выбран победителем в следующем раунде -> сброс
      if (nextMatch.predicted_winner && nextMatch.predicted_winner === oldPlayerName && oldPlayerName !== winnerName) {
          nextMatch.predicted_winner = null;
          propagateWinner(bracketState, roundList, nextRound, nextMatchNumber, null);
      }
    }
  }, []);

  // === 3. ВОССТАНОВЛЕНИЕ СЕТКИ (BYE + SAVED PICKS) ===
  // ИСПРАВЛЕНО: Теперь проходим по ВСЕМ раундам последовательно
  const processSavedPicksAndByes = useCallback((initialBracket: { [round: string]: BracketMatch[] }, roundList: string[]) => {
    // Важно: идем последовательно от первого раунда к последнему
    for (let i = 0; i < roundList.length; i++) {
        const roundName = roundList[i];
        const matches = initialBracket[roundName];
        
        if (!matches) continue;

        matches.forEach((match: BracketMatch) => {
            // 1. Если это первый раунд, проверяем BYE
            if (i === 0) {
                if (match.player1?.name === 'Bye' && match.player2?.name && match.player2.name !== 'TBD') {
                    match.predicted_winner = match.player2.name;
                    propagateWinner(initialBracket, roundList, roundName, match.match_number, match.player2.name);
                    return; // Bye обработан
                }
                else if (match.player2?.name === 'Bye' && match.player1?.name && match.player1.name !== 'TBD') {
                    match.predicted_winner = match.player1.name;
                    propagateWinner(initialBracket, roundList, roundName, match.match_number, match.player1.name);
                    return; // Bye обработан
                }
            }

            // 2. Если есть сохраненный выбор (Predicted Winner), проталкиваем его дальше
            if (match.predicted_winner) {
                propagateWinner(initialBracket, roundList, roundName, match.match_number, match.predicted_winner);
            }
        });
    }
    return initialBracket;
  }, [propagateWinner]);

  // === 4. ЗАГРУЗКА ТУРНИРА ===
  useEffect(() => {
    const fetchTournament = async () => {
      setIsLoading(true);
      try {
        const initData = window.Telegram?.WebApp?.initData;
        // if (!initData) throw new Error('Telegram initData not available');

        const response = await fetch(`https://primechallenge.onrender.com/tournament/${id}`, {
          headers: { Authorization: initData || '' },
        });

        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        const data = await response.json();

        if (data.status) data.status = data.status.trim().toUpperCase();

        setTournament(data);
        setRounds(data.rounds || []);
        setSelectedRound(data.starting_round || data.rounds?.[0] || null);

        // 1. Строим пустые ячейки
        let fullBracket = ensureBracketStructure(data.bracket || {}, data.rounds || [], data.id);
        
        // 2. Заполняем их данными из базы (восстанавливаем цепочку)
        fullBracket = processSavedPicksAndByes(fullBracket, data.rounds || []);
        
        setBracket(fullBracket);
        if (data.has_picks) setHasPicks(true);

      } catch (err) {
        console.error("Fetch error:", err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (id) fetchTournament();
  }, [id, ensureBracketStructure, processSavedPicksAndByes]);

  // === 5. КЛИК ПОЛЬЗОВАТЕЛЯ ===
  const handlePick = (round: string, matchId: string, player: string) => {
    if (tournament?.status !== 'ACTIVE') {
        toast.error('Турнир не активен');
        return;
    }

    setBracket((prev) => {
      const newBracket = JSON.parse(JSON.stringify(prev));
      const match = newBracket[round]?.find((m: BracketMatch) => m.id === matchId);

      if (match) {
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

  // === 6. СОХРАНЕНИЕ ===
  const savePicks = async () => {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) {
        toast.error('Ошибка авторизации Telegram');
        return;
    }

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

    console.log(`Sending ${picks.length} picks to DB:`, picks);

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
          toast.success('Прогноз сохранен!');
      } else {
          const txt = await response.text();
          console.error('Server error:', txt);
          throw new Error('Failed to save');
      }
    } catch (error) {
      console.error(error);
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