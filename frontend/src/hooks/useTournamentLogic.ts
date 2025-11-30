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

  const [tournament, setTournament] = useState<Tournament | null>(cachedTournament);
  const [bracket, setBracket] = useState<{ [round: string]: BracketMatch[] }>(cachedTournament?.bracket || {});
  const [trueBracket, setTrueBracket] = useState<{ [round: string]: BracketMatch[] }>({}); // ЧИСТАЯ РЕАЛЬНОСТЬ
  
  const [hasPicks, setHasPicks] = useState<boolean>(cachedTournament?.has_picks || false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!cachedTournament);
  
  const [selectedRound, setSelectedRound] = useState<string | null>(
      cachedTournament?.starting_round || cachedTournament?.rounds?.[0] || null
  );
  const [rounds, setRounds] = useState<string[]>(cachedTournament?.rounds || []);

  // 1. Создаем структуру
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

  // 2. Протягиваем победителя (визуализация выбора)
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

      // Ставим имя пользователя в следующий слот
      nextMatch[targetSlot] = { name: winnerName || 'TBD' };

      // Если изменился участник матча, сбрасываем прогноз на него дальше
      if (nextMatch.predicted_winner && nextMatch.predicted_winner === oldPlayerName && oldPlayerName !== winnerName) {
          nextMatch.predicted_winner = null;
          propagateWinner(bracketState, roundList, nextRound, nextMatchNumber, null);
      }
    }
  }, []);

  // 3. Применяем сохраненные пики к User Bracket
  const processSavedPicksAndByes = useCallback((initialBracket: { [round: string]: BracketMatch[] }, roundList: string[]) => {
    for (let i = 0; i < roundList.length; i++) {
        const roundName = roundList[i];
        const matches = initialBracket[roundName];
        if (!matches) continue;

        matches.forEach((match: BracketMatch) => {
            // Auto BYE (R32 only)
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
            // Load Picks
            if (match.predicted_winner) {
                propagateWinner(initialBracket, roundList, roundName, match.match_number, match.predicted_winner);
            }
        });
    }
    return initialBracket;
  }, [propagateWinner]);

  // 4. Главная функция обновления стейта
  const updateStateFromData = useCallback((data: Tournament) => {
      setTournament(data);
      setRounds(data.rounds || []);
      setSelectedRound(prev => prev || data.starting_round || data.rounds?.[0] || null);

      // A. База (из БД)
      const baseBracket = ensureBracketStructure(data.bracket || {}, data.rounds || [], data.id);
      
      // B. True Bracket: КОПИЯ БАЗЫ БЕЗ ИЗМЕНЕНИЙ (Реальность)
      setTrueBracket(JSON.parse(JSON.stringify(baseBracket)));

      // C. User Bracket: База + Фантазии
      let userBracket = JSON.parse(JSON.stringify(baseBracket));
      
      if (data.has_picks || data.status === 'ACTIVE') {
          userBracket = processSavedPicksAndByes(userBracket, data.rounds || []);
      }
      
      setBracket(userBracket);
      if (data.has_picks) setHasPicks(true);
  }, [ensureBracketStructure, processSavedPicksAndByes]);

  useEffect(() => {
      if (cachedTournament) updateStateFromData(cachedTournament);
  }, [cachedTournament, updateStateFromData]);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      if (!cachedTournament) setIsLoading(true);
      try {
        const initData = await waitForTelegram();
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
          loadTournament(id, initData); 
      } else {
          throw new Error('Не удалось сохранить');
      }
    } catch (error) {
      console.error(error);
      toast.error('Ошибка сохранения');
    }
  };

  return { tournament, bracket, trueBracket, hasPicks, error, isLoading, selectedRound, setSelectedRound, rounds, handlePick, savePicks };
}