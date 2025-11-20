'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Tournament, BracketMatch } from '@/types';

interface UseTournamentLogicProps {
  id: string;
}

export function useTournamentLogic({ id }: UseTournamentLogicProps) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  // Указываем явный тип для состояния bracket
  const [bracket, setBracket] = useState<{ [round: string]: BracketMatch[] }>({});
  const [hasPicks, setHasPicks] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedRound, setSelectedRound] = useState<string | null>(null);
  const [rounds, setRounds] = useState<string[]>([]);

  // Логика "проноса" победителя вперед
  // Оборачиваем в useCallback, чтобы использовать внутри других функций без предупреждений линтера
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

    const nextMatchIndex = bracketState[nextRound]?.findIndex((m) => m.match_number === nextMatchNumber);

    if (nextMatchIndex !== undefined && nextMatchIndex !== -1) {
      const nextMatch = bracketState[nextRound][nextMatchIndex];

      if (!winnerName) {
        // Если "отжали" выбор
        if (isPlayer1InNext) nextMatch.player1 = { name: 'TBD', seed: undefined };
        else nextMatch.player2 = { name: 'TBD', seed: undefined };

        if (nextMatch.predicted_winner === (isPlayer1InNext ? nextMatch.player1?.name : nextMatch.player2?.name)) {
          nextMatch.predicted_winner = null;
          propagateWinner(bracketState, roundList, nextRound, nextMatchNumber, null);
        }
      } else {
        // Если выбрали победителя
        if (isPlayer1InNext) {
          nextMatch.player1 = { name: winnerName, seed: undefined };
        } else {
          nextMatch.player2 = { name: winnerName, seed: undefined };
        }

        // Сброс следующего выбора, если изменился участник
        if (nextMatch.predicted_winner && nextMatch.predicted_winner !== winnerName) {
          nextMatch.predicted_winner = null;
          propagateWinner(bracketState, roundList, nextRound, nextMatchNumber, null);
        }
      }
    }
  }, []);

  // Обработка BYE
  const processInitialByes = useCallback((initialBracket: { [round: string]: BracketMatch[] }, roundList: string[]) => {
    const newBracket = JSON.parse(JSON.stringify(initialBracket));

    const firstRound = roundList[0];
    if (!newBracket[firstRound]) return newBracket;

    newBracket[firstRound].forEach((match: BracketMatch) => {
      if (match.predicted_winner) {
        propagateWinner(newBracket, roundList, firstRound, match.match_number, match.predicted_winner);
        return;
      }

      if (match.player1?.name === 'Bye' && match.player2?.name && match.player2.name !== 'TBD') {
        match.predicted_winner = match.player2.name;
        propagateWinner(newBracket, roundList, firstRound, match.match_number, match.player2.name);
      }
      else if (match.player2?.name === 'Bye' && match.player1?.name && match.player1.name !== 'TBD') {
        match.predicted_winner = match.player1.name;
        propagateWinner(newBracket, roundList, firstRound, match.match_number, match.player1.name);
      }
    });

    return newBracket;
  }, [propagateWinner]);

  // Загрузка данных
  useEffect(() => {
    const fetchTournament = async () => {
      setIsLoading(true);
      try {
        const initData = window.Telegram?.WebApp?.initData;
        if (!initData) throw new Error('Telegram initData not available');

        const response = await fetch(`https://primechallenge.onrender.com/tournament/${id}`, {
          headers: { Authorization: initData },
        });

        if (!response.ok) throw new Error('Failed to fetch');

        const data = await response.json();

        setTournament(data);
        setRounds(data.rounds || []);
        setSelectedRound(data.starting_round || data.rounds?.[0]);

        // Инициализируем сетку
        const initializedBracket = processInitialByes(data.bracket, data.rounds || []);
        setBracket(initializedBracket);
        
        // Если есть сохраненные пики, кнопку можно активировать (по желанию)
        if (data.has_picks) setHasPicks(true);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error');
      } finally {
        setIsLoading(false);
      }
    };
    fetchTournament();
  }, [id, processInitialByes]); // Теперь processInitialByes в зависимостях, но он стабилен благодаря useCallback

  // Обработчик клика
  const handlePick = (round: string, matchId: string, player: string) => {
    if (tournament?.status !== 'ACTIVE') return;

    setBracket((prev) => {
      const newBracket = JSON.parse(JSON.stringify(prev));
      const matchIndex = newBracket[round].findIndex((m: BracketMatch) => m.id === matchId);

      if (matchIndex !== -1) {
        const match = newBracket[round][matchIndex];
        const matchNum = match.match_number;

        if (match.predicted_winner === player) {
          match.predicted_winner = null;
          propagateWinner(newBracket, rounds, round, matchNum, null);
        } else {
          match.predicted_winner = player;
          propagateWinner(newBracket, rounds, round, matchNum, player);
        }
      }
      return newBracket;
    });
    setHasPicks(true);
  };

  const savePicks = async () => {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) return;

    const picks = [];
    for (const r of rounds) {
      if (!bracket[r]) continue;
      for (const m of bracket[r]) {
        // Сохраняем даже пустые пики (null), если нужно перезаписать выбор
        // Но обычно отправляют только сделанные.
        // Если нужно отправлять пустые, чтобы стереть выбор в БД, логика бэкенда должна это поддерживать.
        // Сейчас отправляем только победителей.
        if (m.predicted_winner) {
          picks.push({
            tournament_id: parseInt(id),
            round: m.round,
            match_number: m.match_number,
            predicted_winner: m.predicted_winner
          });
        }
      }
    }

    try {
      const response = await fetch('https://primechallenge.onrender.com/picks/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: initData,
        },
        body: JSON.stringify(picks),
      });
      if (response.ok) toast.success('Пики сохранены!');
    } catch (e: unknown) {
      console.error(e);
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