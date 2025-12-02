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
  
  // ИСПРАВЛЕНИЕ: hasPicks по умолчанию false и меняется ТОЛЬКО если API скажет
  const [hasPicks, setHasPicks] = useState(false);
  
  const [isLoading, setIsLoading] = useState(!cached);
  const [selectedRound, setSelectedRound] = useState(cached?.starting_round || cached?.rounds?.[0] || null);
  const [rounds, setRounds] = useState(cached?.rounds || []);

  const isProcessed = useRef(false);

  // 1. Создание структуры
  const ensureStructure = useCallback((base: BracketRoundMap, rList: string[], tId: number): BracketRoundMap => {
    const newB: BracketRoundMap = JSON.parse(JSON.stringify(base));
    for (let i = 0; i < rList.length; i++) {
      const rName = rList[i];
      if (!newB[rName]) newB[rName] = [];
      const count = rName === 'Champion' ? 1 : (i === 0 ? newB[rName].length : Math.ceil(newB[rList[i-1]].length / 2));
      for (let m = 1; m <= count; m++) {
          if (!newB[rName].find((x) => x.match_number === m)) {
              newB[rName].push({
                  id: `${tId}_${rName}_${m}`, match_number: m, round: rName,
                  player1: { name: 'TBD' }, player2: { name: 'TBD' },
                  predicted_winner: null, actual_winner: null, source_matches: []
              });
          }
      }
      newB[rName].sort((a, b) => a.match_number - b.match_number);
    }
    return newB;
  }, []);

  // 2. Симуляция
  const propagate = useCallback((bState: BracketRoundMap, rList: string[], cRound: string, mNum: number, wName: string | null) => {
    const idx = rList.indexOf(cRound);
    if (idx === -1 || idx === rList.length - 1) return;
    const nRound = rList[idx + 1];

    if (nRound === 'Champion') {
        const cm = bState['Champion']?.find((m) => m.match_number === 1);
        if (cm) { cm.player1 = { name: wName || 'TBD' }; cm.predicted_winner = wName; }
        return;
    }

    const nNum = Math.ceil(mNum / 2);
    const isP1 = mNum % 2 !== 0; 
    const nm = bState[nRound]?.find((m) => m.match_number === nNum);

    if (nm) {
      const target = isP1 ? 'player1' : 'player2';
      nm[target] = { name: wName || 'TBD' };
      if (nm.predicted_winner) {
          propagate(bState, rList, nRound, nNum, nm.predicted_winner);
      }
    }
  }, []);

  const processData = useCallback((data: Tournament) => {
      console.log("[CLOSED] Calculating Brackets...");
      setTournament(data);
      const rList = data.rounds || [];
      setRounds(rList);
      setSelectedRound(prev => prev || data.starting_round || rList[0]);

      // ВАЖНО: Устанавливаем флаг участия строго из данных API
      // Если юзер не играл, data.has_picks будет false
      const apiHasPicks = !!data.has_picks; 
      setHasPicks(apiHasPicks);

      const base = ensureStructure(data.bracket || {}, rList, data.id);
      setTrueBracket(JSON.parse(JSON.stringify(base)));

      const userB: BracketRoundMap = JSON.parse(JSON.stringify(base));
      
      // Очищаем будущее в UserB
      for (let i = 1; i < rList.length; i++) {
          const rName = rList[i];
          if (userB[rName]) {
              userB[rName].forEach((m) => {
                  m.player1 = { name: 'TBD' };
                  m.player2 = { name: 'TBD' };
              });
          }
      }

      // Симулируем UserB
      for (let i = 0; i < rList.length; i++) {
        const rName = rList[i];
        if (!userB[rName]) continue;
        
        userB[rName].forEach((m) => {
            // BYE logic
            if (i === 0) {
                 if (m.player1?.name === 'Bye' && m.player2?.name && m.player2.name !== 'TBD') {
                     const w = m.player2.name; m.predicted_winner = w;
                     propagate(userB, rList, rName, m.match_number, w);
                 } else if (m.player2?.name === 'Bye' && m.player1?.name && m.player1.name !== 'TBD') {
                     const w = m.player1.name; m.predicted_winner = w;
                     propagate(userB, rList, rName, m.match_number, w);
                 }
            }
            // Picks logic
            if (m.predicted_winner) {
                propagate(userB, rList, rName, m.match_number, m.predicted_winner);
            }
        });
      }
      
      setUserBracket(userB);
  }, [ensureStructure, propagate]);

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