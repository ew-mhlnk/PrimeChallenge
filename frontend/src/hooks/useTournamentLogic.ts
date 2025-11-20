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

  // === 1. ГЕНЕРАЦИЯ ПУСТОЙ СТРУКТУРЫ (Если бэкенд не прислал будущие раунды) ===
  const ensureBracketStructure = useCallback((baseBracket: { [round: string]: BracketMatch[] }, roundList: string[], tourId: number) => {
    const newBracket = JSON.parse(JSON.stringify(baseBracket));

    for (let i = 0; i < roundList.length; i++) {
      const roundName = roundList[i];
      
      // Если раунда нет в объекте, создаем его
      if (!newBracket[roundName]) {
        newBracket[roundName] = [];
      }

      // Вычисляем сколько матчей должно быть в этом раунде
      // Если это первый раунд, берем сколько пришло. Если нет - вычисляем от предыдущего.
      let expectedMatches = 0;
      if (i === 0) {
        expectedMatches = newBracket[roundName].length;
      } else {
        const prevRoundName = roundList[i - 1];
        expectedMatches = Math.ceil(newBracket[prevRoundName].length / 2);
      }

      // Заполняем недостающие матчи пустышками (TBD)
      if (newBracket[roundName].length < expectedMatches) {
        for (let m = 1; m <= expectedMatches; m++) {
            // Проверяем, есть ли уже такой матч
            const existingMatch = newBracket[roundName].find((match: BracketMatch) => match.match_number === m);
            if (!existingMatch) {
                newBracket[roundName].push({
                    id: `${tourId}_${roundName}_${m}`, // Генерируем ID
                    round: roundName,
                    match_number: m,
                    player1: { name: 'TBD' },
                    player2: { name: 'TBD' },
                    predicted_winner: null
                });
            }
        }
        // Сортируем по номеру матча, чтобы порядок был верный
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
    const isPlayer1InNext = matchNumber % 2 !== 0; // Нечетные -> Player 1, Четные -> Player 2

    // Ищем матч в следующем раунде
    const nextMatch = bracketState[nextRound]?.find((m) => m.match_number === nextMatchNumber);

    if (nextMatch) {
      // Если мы меняем игрока, а он уже был выбран победителем дальше -> сбрасываем выбор дальше
      const targetSlot = isPlayer1InNext ? 'player1' : 'player2';
      const oldPlayerName = nextMatch[targetSlot]?.name;

      // Обновляем слот
      nextMatch[targetSlot] = { name: winnerName || 'TBD' };

      // Если в этом матче (nextMatch) победителем был тот, кого мы сейчас убрали/заменили
      if (nextMatch.predicted_winner && nextMatch.predicted_winner === oldPlayerName) {
          nextMatch.predicted_winner = null;
          // Рекурсивно чистим дальше
          propagateWinner(bracketState, roundList, nextRound, nextMatchNumber, null);
      }
    }
  }, []);

  // === 3. ОБРАБОТКА BYE ПРИ ЗАГРУЗКЕ ===
  const processInitialByes = useCallback((initialBracket: { [round: string]: BracketMatch[] }, roundList: string[]) => {
    const firstRound = roundList[0];
    if (!initialBracket[firstRound]) return initialBracket;

    // Проходим по первому раунду
    initialBracket[firstRound].forEach((match: BracketMatch) => {
        // Если уже есть выбор (из базы), проносим его
        if (match.predicted_winner) {
            propagateWinner(initialBracket, roundList, firstRound, match.match_number, match.predicted_winner);
        }
        // Если BYE
        else if (match.player1?.name === 'Bye' && match.player2?.name && match.player2.name !== 'TBD') {
            match.predicted_winner = match.player2.name;
            propagateWinner(initialBracket, roundList, firstRound, match.match_number, match.player2.name);
        }
        else if (match.player2?.name === 'Bye' && match.player1?.name && match.player1.name !== 'TBD') {
            match.predicted_winner = match.player1.name;
            propagateWinner(initialBracket, roundList, firstRound, match.match_number, match.player1.name);
        }
    });
    return initialBracket;
  }, [propagateWinner]);

  // === 4. ЗАГРУЗКА ТУРНИРА ===
  useEffect(() => {
    const fetchTournament = async () => {
      setIsLoading(true);
      try {
        const initData = window.Telegram?.WebApp?.initData;
        
        // Для тестов в браузере (если нет телеграма) можно закомментировать проверку
        // if (!initData) throw new Error('Telegram initData not available');

        const response = await fetch(`https://primechallenge.onrender.com/tournament/${id}`, {
          headers: { Authorization: initData || '' },
        });

        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        const data = await response.json();

        // Нормализация статуса
        if (data.status) data.status = data.status.trim().toUpperCase();

        setTournament(data);
        setRounds(data.rounds || []);
        setSelectedRound(data.starting_round || data.rounds?.[0] || null);

        // Сначала строим структуру, потом обрабатываем BYE
        let fullBracket = ensureBracketStructure(data.bracket || {}, data.rounds || [], data.id);
        fullBracket = processInitialByes(fullBracket, data.rounds || []);
        
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
  }, [id, ensureBracketStructure, processInitialByes]);

  // === 5. КЛИК ПОЛЬЗОВАТЕЛЯ ===
  const handlePick = (round: string, matchId: string, player: string) => {
    console.log('Attempting pick:', player, 'in match', matchId);

    // Проверка статуса
    if (tournament?.status !== 'ACTIVE') {
        toast.error('Турнир не активен');
        return;
    }

    setBracket((prev) => {
      // Глубокая копия всей сетки
      const newBracket = JSON.parse(JSON.stringify(prev));
      
      // Находим нужный матч
      const match = newBracket[round]?.find((m: BracketMatch) => m.id === matchId);

      if (match) {
        if (match.predicted_winner === player) {
          // Отмена выбора
          match.predicted_winner = null;
          propagateWinner(newBracket, rounds, round, match.match_number, null);
        } else {
          // Новый выбор
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
    
    // Собираем все непустые прогнозы
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

    console.log('Sending picks to DB:', picks);

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