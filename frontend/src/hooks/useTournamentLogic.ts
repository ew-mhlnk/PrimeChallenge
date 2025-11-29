'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Tournament, BracketMatch } from '@/types';
import { useTournamentContext } from '@/context/TournamentContext'; // Импортируем контекст

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
  // Берем методы из контекста
  const { getTournamentData, loadTournament } = useTournamentContext();

  // Пытаемся сразу достать данные из кэша
  const cachedTournament = getTournamentData(id);

  const [tournament, setTournament] = useState<Tournament | null>(cachedTournament);
  const [bracket, setBracket] = useState<{ [round: string]: BracketMatch[] }>(
     // Если есть кэш, сразу строим сетку (упрощенно, полная пересборка будет в useEffect)
     cachedTournament?.bracket || {}
  );
  const [hasPicks, setHasPicks] = useState<boolean>(cachedTournament?.has_picks || false);
  const [error, setError] = useState<string | null>(null);
  
  // Если данные есть в кэше, мы НЕ грузимся. Иначе - грузимся.
  const [isLoading, setIsLoading] = useState<boolean>(!cachedTournament);
  
  const [selectedRound, setSelectedRound] = useState<string | null>(
      cachedTournament?.starting_round || cachedTournament?.rounds?.[0] || null
  );
  const [rounds, setRounds] = useState<string[]>(cachedTournament?.rounds || []);

  // === ЛОГИКА СЕТКИ (Остается той же) ===
  const ensureBracketStructure = useCallback((baseBracket: { [round: string]: BracketMatch[] }, roundList: string[], tourId: number) => {
    const newBracket = JSON.parse(JSON.stringify(baseBracket));
    for (let i = 0; i < roundList.length; i++) {
      const roundName = roundList[i];
      if (!newBracket[roundName]) newBracket[roundName] = [];
      const expectedMatches = i === 0 
          ? newBracket[roundName].length 
          : Math.ceil(newBracket[roundList[i - 1]].length / 2);
      const count = roundName === 'Champion' ? 1 : expectedMatches;

      if (newBracket[roundName].length < count) {
        for (let m = 1; m <= count; m++) {
            const existingMatch = newBracket[roundName].find((match: BracketMatch) => match.match_number === m);
            if (!existingMatch) {
                newBracket[roundName].push({
                    id: `${tourId}_${roundName}_${m}`,
                    match_number: m,
                    round: roundName,
                    player1: { name: 'TBD' },
                    player2: { name: 'TBD' },
                    predicted_winner: null,
                    source_matches: [] 
                });
            }
        }
        newBracket[roundName].sort((a: BracketMatch, b: BracketMatch) => a.match_number - b.match_number);
      }
    }
    return newBracket;
  }, []);

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
      nextMatch[targetSlot] = { name: winnerName || 'TBD' };
      if (nextMatch.predicted_winner && nextMatch.predicted_winner === oldPlayerName && oldPlayerName !== winnerName) {
          nextMatch.predicted_winner = null;
          propagateWinner(bracketState, roundList, nextRound, nextMatchNumber, null);
      }
    }
  }, []);

  const processSavedPicksAndByes = useCallback((initialBracket: { [round: string]: BracketMatch[] }, roundList: string[]) => {
    for (let i = 0; i < roundList.length; i++) {
        const roundName = roundList[i];
        const matches = initialBracket[roundName];
        if (!matches) continue;
        matches.forEach((match: BracketMatch) => {
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
            if (match.predicted_winner) {
                propagateWinner(initialBracket, roundList, roundName, match.match_number, match.predicted_winner);
            }
        });
    }
    return initialBracket;
  }, [propagateWinner]);

  // === ФУНКЦИЯ ПОЛНОГО ОБНОВЛЕНИЯ СЕТКИ ИЗ ДАННЫХ ===
  const updateStateFromData = useCallback((data: Tournament) => {
      setTournament(data);
      setRounds(data.rounds || []);
      
      // Если раунд не выбран, ставим стартовый
      setSelectedRound(prev => prev || data.starting_round || data.rounds?.[0] || null);

      let fullBracket = ensureBracketStructure(data.bracket || {}, data.rounds || [], data.id);
      fullBracket = processSavedPicksAndByes(fullBracket, data.rounds || []);
      
      setBracket(fullBracket);
      if (data.has_picks) setHasPicks(true);
  }, [ensureBracketStructure, processSavedPicksAndByes]);

  // === ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ КЭША ===
  useEffect(() => {
      if (cachedTournament) {
          updateStateFromData(cachedTournament);
      }
  }, [cachedTournament, updateStateFromData]);

  // === ЗАГРУЗКА С СЕРВЕРА (SWR - Stale While Revalidate) ===
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      // Если данных нет вообще, включаем лоадер. Если есть (кэш), не включаем (тихое обновление)
      if (!cachedTournament) setIsLoading(true);
      
      try {
        const initData = await waitForTelegram();
        // Загружаем свежие данные через контекст
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

  // ... (handlePick и savePicks без изменений)
  
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

  const savePicks = async () => {
    const initData = await waitForTelegram() || window.Telegram?.WebApp?.initData;
    if (!initData) {
        toast.error('Нет связи с Telegram');
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
        headers: {
          'Content-Type': 'application/json',
          Authorization: initData,
        },
        body: JSON.stringify(picks),
      });
      if (response.ok) {
          toast.success('Прогноз сохранен!');
          // ПОСЛЕ СОХРАНЕНИЯ НУЖНО ОБНОВИТЬ КЭШ В КОНТЕКСТЕ!
          // Чтобы при выходе и входе мы видели актуальные данные.
          loadTournament(id, initData); 
      } else {
          throw new Error('Не удалось сохранить');
      }
    } catch (error) {
      console.error(error);
      toast.error('Ошибка сохранения');
    }
  };

  return { tournament, bracket, hasPicks, error, isLoading, selectedRound, setSelectedRound, rounds, handlePick, savePicks };
}