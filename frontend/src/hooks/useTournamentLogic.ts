'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Tournament, BracketMatch } from '@/types';
import { useTournamentContext } from '@/context/TournamentContext';

interface UseTournamentLogicProps {
  id: string;
}

type PickPayload = {
  tournament_id: number;
  round: string;
  match_number: number;
  predicted_winner: string;
};

const waitForTelegram = async (retries = 20, delay = 100): Promise<string | null> => {
    for (let i = 0; i < retries; i++) {
        if (window.Telegram?.WebApp?.initData) {
            return window.Telegram.WebApp.initData;
        }
        await new Promise(resolve => setTimeout(resolve, delay));
    }
    return null;
};

export function useTournamentLogic({ id }: UseTournamentLogicProps) {
  const { getTournamentData, loadTournament } = useTournamentContext();
  const cachedTournament = getTournamentData(id);

  // 1. Состояния
  const [tournament, setTournament] = useState<Tournament | null>(cachedTournament);
  
  // bracket = Сетка Юзера (с его прогнозами и протянутыми победителями)
  const [bracket, setBracket] = useState<{ [round: string]: BracketMatch[] }>(cachedTournament?.bracket || {});
  
  // trueBracket = Реальная Сетка (как она есть в БД, без фантазий юзера)
  const [trueBracket, setTrueBracket] = useState<{ [round: string]: BracketMatch[] }>({});
  
  const [hasPicks, setHasPicks] = useState<boolean>(cachedTournament?.has_picks || false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!cachedTournament);
  
  const [selectedRound, setSelectedRound] = useState<string | null>(
      cachedTournament?.starting_round || cachedTournament?.rounds?.[0] || null
  );
  const [rounds, setRounds] = useState<string[]>(cachedTournament?.rounds || []);

  // 2. Генерация базовой структуры (заполнение дыр)
  const ensureBracketStructure = useCallback((baseBracket: { [round: string]: BracketMatch[] }, roundList: string[], tourId: number) => {
    const newBracket = JSON.parse(JSON.stringify(baseBracket));

    for (let i = 0; i < roundList.length; i++) {
      const roundName = roundList[i];
      if (!newBracket[roundName]) newBracket[roundName] = [];

      const count = roundName === 'Champion' ? 1 : (
          i === 0 ? newBracket[roundName].length : Math.ceil(newBracket[roundList[i - 1]].length / 2)
      );

      if (newBracket[roundName].length < count) {
        for (let m = 1; m <= count; m++) {
            // Если матча нет в данных, создаем пустой слот
            if (!newBracket[roundName].find((match: BracketMatch) => match.match_number === m)) {
                newBracket[roundName].push({
                    id: `${tourId}_${roundName}_${m}`,
                    match_number: m,
                    round: roundName,
                    player1: { name: 'TBD' },
                    player2: { name: 'TBD' },
                    predicted_winner: null,
                    actual_winner: null,
                    source_matches: [] 
                });
            }
        }
        newBracket[roundName].sort((a: BracketMatch, b: BracketMatch) => a.match_number - b.match_number);
      }
    }
    return newBracket;
  }, []);

  // 3. Протягивание победителя (ТОЛЬКО для User Bracket)
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
    
    // Спец. логика для финала -> чемпион
    if (nextRound === 'Champion') {
        const championMatch = bracketState['Champion']?.find(m => m.match_number === 1);
        if (championMatch) {
            championMatch.player1 = { name: winnerName || 'TBD' };
            championMatch.predicted_winner = winnerName;
        }
        return;
    }

    const nextMatchNumber = Math.ceil(matchNumber / 2);
    const isPlayer1InNext = matchNumber % 2 !== 0; 
    const nextMatch = bracketState[nextRound]?.find((m) => m.match_number === nextMatchNumber);

    if (nextMatch) {
      const targetSlot = isPlayer1InNext ? 'player1' : 'player2';
      const oldPlayerName = nextMatch[targetSlot]?.name;

      // Записываем имя победителя в следующий раунд (визуально)
      nextMatch[targetSlot] = { name: winnerName || 'TBD' };

      // Если мы поменяли игрока в сетке, и на него был прогноз дальше -> сбрасываем прогноз
      if (nextMatch.predicted_winner && nextMatch.predicted_winner === oldPlayerName && oldPlayerName !== winnerName) {
          nextMatch.predicted_winner = null;
          propagateWinner(bracketState, roundList, nextRound, nextMatchNumber, null);
      }
    }
  }, []);

  // 4. Применение сохраненных пиков к структуре
  const processSavedPicksAndByes = useCallback((initialBracket: { [round: string]: BracketMatch[] }, roundList: string[]) => {
    for (let i = 0; i < roundList.length; i++) {
        const roundName = roundList[i];
        const matches = initialBracket[roundName];
        if (!matches) continue;

        matches.forEach((match: BracketMatch) => {
            // Авто-проход BYE (только 1-й раунд)
            if (i === 0) {
                if (match.player1?.name === 'Bye' && match.player2?.name && match.player2.name !== 'TBD') {
                    match.predicted_winner = match.player2.name;
                    propagateWinner(initialBracket, roundList, roundName, match.match_number, match.player2.name);
                    return;
                }
                else if (match.player2?.name === 'Bye' && match.player1?.name && match.player1.name !== 'TBD') {
                    match.predicted_winner = match.player1.name;
                    propagateWinner(initialBracket, roundList, roundName, match.match_number, match.player1.name);
                    return;
                }
            }
            // Если есть сохраненный пик -> тянем его дальше
            if (match.predicted_winner) {
                propagateWinner(initialBracket, roundList, roundName, match.match_number, match.predicted_winner);
            }
        });
    }
    return initialBracket;
  }, [propagateWinner]);

  // 5. Обработка данных (Главная функция обновления стейта)
  const updateStateFromData = useCallback((data: Tournament) => {
      setTournament(data);
      setRounds(data.rounds || []);
      setSelectedRound(prev => prev || data.starting_round || data.rounds?.[0] || null);

      // А. Базовая структура (из БД + пустые слоты)
      const baseBracket = ensureBracketStructure(data.bracket || {}, data.rounds || [], data.id);
      
      // Б. True Bracket: Чистая копия базы. 
      // Здесь TBD остаются TBD, пока матч реально не сформируется.
      setTrueBracket(JSON.parse(JSON.stringify(baseBracket)));

      // В. User Bracket: База + Протянутые пики пользователя.
      // Здесь TBD заменяются на имена выбранных игроков.
      let userBracket = JSON.parse(JSON.stringify(baseBracket));
      
      // Если у юзера есть пики (или статус ACTIVE и мы хотим показать BYE), процессим
      if (data.has_picks || data.status === 'ACTIVE') {
          userBracket = processSavedPicksAndByes(userBracket, data.rounds || []);
      }
      
      setBracket(userBracket);
      if (data.has_picks) setHasPicks(true);
  }, [ensureBracketStructure, processSavedPicksAndByes]);

  // Инициализация из кэша
  useEffect(() => {
      if (cachedTournament) updateStateFromData(cachedTournament);
  }, [cachedTournament, updateStateFromData]);

  // Загрузка с сервера
  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      if (!cachedTournament) setIsLoading(true);
      try {
        const initData = await waitForTelegram();
        // Загружаем свежие данные
        const data = await loadTournament(id, initData || '');
        if (isMounted && data) {
            updateStateFromData(data);
        }
      } catch (err) {
        console.error(err);
        if (!cachedTournament) setError('Ошибка загрузки');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    if (id) init();
    return () => { isMounted = false; };
  }, [id, loadTournament, updateStateFromData, cachedTournament]);

  // 6. Обработка клика (Меняет только User Bracket)
  const handlePick = (round: string, matchId: string, player: string) => {
    if (tournament?.status !== 'ACTIVE') {
        toast.error('Выбор закрыт');
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

  // 7. Сохранение
  const savePicks = async () => {
    const initData = await waitForTelegram() || window.Telegram?.WebApp?.initData;
    if (!initData) { toast.error('Нет связи с Telegram'); return; }

    if (tournament?.status !== 'ACTIVE') {
        toast.error('Турнир закрыт');
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

    try {
      const response = await fetch('/api/picks/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: initData },
        body: JSON.stringify(picks),
      });

      if (response.ok) {
          toast.success('Прогноз сохранен!');
          // После сохранения обновляем данные, чтобы убедиться, что всё синхронизировано
          loadTournament(id, initData); 
      } else {
          throw new Error('Не удалось сохранить');
      }
    } catch (error) {
      console.error(error);
      toast.error('Ошибка сохранения');
    }
  };

  return { 
      tournament, 
      bracket, 
      trueBracket, // Экспортируем реальную сетку для сравнения на фронте
      hasPicks, 
      error, 
      isLoading, 
      selectedRound, 
      setSelectedRound, 
      rounds, 
      handlePick, 
      savePicks 
  };
}