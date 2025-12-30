'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Tournament, BracketMatch } from '@/types';
import { useTournamentContext } from '@/context/TournamentContext';

type BracketRoundMap = { [roundName: string]: BracketMatch[]; };

const waitForTelegram = async () => {
    for (let i = 0; i < 20; i++) {
        if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initData) {
            return window.Telegram.WebApp.initData;
        }
        await new Promise(r => setTimeout(r, 100));
    }
    return null;
};

export function useClosedTournament(id: string) {
  const { getTournamentData, loadTournament } = useTournamentContext();
  const cached = getTournamentData(id);

  const [tournament, setTournament] = useState<Tournament | null>(cached);
  const [userBracket, setUserBracket] = useState<BracketRoundMap>({});
  const [trueBracket, setTrueBracket] = useState<BracketRoundMap>({});
  const [hasPicks, setHasPicks] = useState(false);
  const [isLoading, setIsLoading] = useState(!cached);
  const [selectedRound, setSelectedRound] = useState<string | null>(null);
  const [rounds, setRounds] = useState<string[]>(cached?.rounds || []);

  const isProcessed = useRef(false);

  // Строит полную структуру сетки для зрителей (скелет)
  const buildTrueBracket = useCallback((data: Tournament): BracketRoundMap => {
      const tb: BracketRoundMap = {};
      const rList = data.rounds || [];
      const draws = data.true_draws || [];
      
      const matchCounts: Record<string, number> = {
          "R128": 64, "R64": 32, "R32": 16, "R16": 8, 
          "QF": 4, "SF": 2, "F": 1, "Champion": 1
      };

      // 1. Создаем пустой скелет
      rList.forEach(r => {
          tb[r] = [];
          const count = matchCounts[r] || 0;
          for (let i = 1; i <= count; i++) {
              tb[r].push({
                 id: `placeholder_${r}_${i}`,
                 match_number: i,
                 round: r,
                 player1: { name: 'TBD' },
                 player2: { name: 'TBD' },
                 actual_winner: null,
                 predicted_winner: null,
                 scores: [],
                 source_matches: []
              });
          }
      });

      // 2. Заполняем данными из БД
      draws.forEach(d => {
          if (tb[d.round]) {
              const match = tb[d.round].find(m => m.match_number === d.match_number);
              if (match) {
                  match.id = `${data.id}_${d.round}_${d.match_number}`;
                  match.player1 = { name: d.player1 || 'TBD' };
                  match.player2 = { name: d.player2 || 'TBD' };
                  match.actual_winner = d.winner;
                  match.scores = [d.set1, d.set2, d.set3, d.set4, d.set5].filter(s => s) as string[];
              }
          }
      });
      
      return tb;
  }, []);

  const processData = useCallback((data: Tournament) => {
      console.log("[CLOSED] Loading Backend Bracket...");
      
      setTournament(data);
      const rList = data.rounds || [];
      setRounds(rList);
      
      const userHasPicks = !!data.has_picks;
      setHasPicks(userHasPicks);

      // --- ЛОГИКА ВЫБОРА СТАРТОВОГО РАУНДА (НОВАЯ ФИЧА) ---
      // По умолчанию берем стартовый раунд (например, R32)
      let targetRound = data.starting_round || rList[0] || null;

      // Если у юзера ЕСТЬ прогнозы и в турнире больше 1 раунда -> прыгаем на следующий (R16)
      // Это нужно, чтобы сразу показать "мясо", а не первый круг
      if (userHasPicks && rList.length > 1) {
          targetRound = rList[1]; // Индекс 1 = второй раунд
      }

      // Устанавливаем раунд (prev || targetRound нужен, чтобы не сбрасывать выбор, если хук перезапустился)
      setSelectedRound(prev => prev || targetRound);
      // -----------------------------------------------------

      // 1. User Bracket (Фантазия) - берем готовую с бэкенда
      if (data.bracket) {
          setUserBracket(data.bracket);
      }

      // 2. True Bracket (Реальность) - строим полный скелет
      const tb = buildTrueBracket(data);
      setTrueBracket(tb);

  }, [buildTrueBracket]);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      if (cached && !isProcessed.current) {
          processData(cached);
          isProcessed.current = true;
          setIsLoading(false);
          return;
      }
      if (!cached) {
          setIsLoading(true);
          try {
            const initData = await waitForTelegram();
            const data = await loadTournament(id, initData || '');
            if (mounted && data) {
                processData(data);
                isProcessed.current = true;
            }
          } catch (e) {
            console.error(e);
          } finally {
            if (mounted) setIsLoading(false);
          }
      }
    };
    init();
    return () => { mounted = false; };
  }, [id, loadTournament, cached, processData]);

  return { tournament, userBracket, trueBracket, hasPicks, isLoading, selectedRound, setSelectedRound, rounds };
}