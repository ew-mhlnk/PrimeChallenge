'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Tournament, BracketMatch } from '@/types';
import { useTournamentContext } from '@/context/TournamentContext';

type BracketRoundMap = { [roundName: string]: BracketMatch[]; };

const waitForTelegram = async () => {
    for (let i = 0; i < 20; i++) {
        if (window.Telegram?.WebApp?.initData) return window.Telegram.WebApp.initData;
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
  const [selectedRound, setSelectedRound] = useState<string | null>(cached?.starting_round || cached?.rounds?.[0] || null);
  const [rounds, setRounds] = useState<string[]>(cached?.rounds || []);

  const isProcessed = useRef(false);

  // Функция для создания Реальной Сетки (чисто для отображения реальности, если нужно)
  const buildTrueBracket = useCallback((data: Tournament): BracketRoundMap => {
      const tb: BracketRoundMap = {};
      const rList = data.rounds || [];
      const draws = data.true_draws || [];
      
      rList.forEach(r => tb[r] = []);

      draws.forEach(d => {
          if (!tb[d.round]) tb[d.round] = [];
          const existing = tb[d.round].find(m => m.match_number === d.match_number);
          if (!existing) {
             tb[d.round].push({
                 id: `${data.id}_${d.round}_${d.match_number}`,
                 match_number: d.match_number,
                 round: d.round,
                 player1: { name: d.player1 || 'TBD' },
                 player2: { name: d.player2 || 'TBD' },
                 actual_winner: d.winner,
                 predicted_winner: null,
                 scores: [d.set1, d.set2, d.set3, d.set4, d.set5].filter(s => s) as string[],
                 source_matches: []
             });
          }
      });
      
      Object.keys(tb).forEach(r => tb[r].sort((a, b) => a.match_number - b.match_number));
      return tb;
  }, []);

  const processData = useCallback((data: Tournament) => {
      console.log("[CLOSED] Loading Backend Bracket...");
      
      setTournament(data);
      setRounds(data.rounds || []);
      
      // ИСПРАВЛЕНИЕ ОШИБКИ TS: Добавили || null в конце
      setSelectedRound(prev => prev || data.starting_round || data.rounds?.[0] || null);
      
      setHasPicks(!!data.has_picks);

      // 1. Берем ГОТОВУЮ раскрашенную сетку с бэкенда
      if (data.bracket) {
          setUserBracket(data.bracket);
      }

      // 2. Строим True Bracket (резерв)
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