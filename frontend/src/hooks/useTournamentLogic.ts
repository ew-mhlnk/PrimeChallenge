'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Tournament, BracketMatch } from '@/types';
import { useTournamentContext } from '@/context/TournamentContext';

interface UseTournamentLogicProps { id: string; }
type PickPayload = { tournament_id: number; round: string; match_number: number; predicted_winner: string; };
type BracketRoundMap = { [roundName: string]: BracketMatch[]; };

const waitForTelegram = async () => {
    for (let i = 0; i < 20; i++) {
        if (window.Telegram?.WebApp?.initData) return window.Telegram.WebApp.initData;
        await new Promise(r => setTimeout(r, 100));
    }
    return null;
};

export function useTournamentLogic({ id }: UseTournamentLogicProps) {
  const { getTournamentData, loadTournament } = useTournamentContext();
  const cached = getTournamentData(id);

  const [tournament, setTournament] = useState<Tournament | null>(cached);
  const [bracket, setBracket] = useState<BracketRoundMap>(cached?.bracket || {}); 
  const [trueBracket, setTrueBracket] = useState<BracketRoundMap>({}); 
  const [hasPicks, setHasPicks] = useState(cached?.has_picks || false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!cached);
  const [selectedRound, setSelectedRound] = useState(cached?.starting_round || cached?.rounds?.[0] || null);
  const [rounds, setRounds] = useState(cached?.rounds || []);

  // 1. Создаем структуру (основа)
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

  // 2. Функция продвижения (симуляция)
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
      const old = nm[target]?.name;
      nm[target] = { name: wName || 'TBD' };
      
      if (nm.predicted_winner === old && old !== wName) {
          nm.predicted_winner = null;
          propagate(bState, rList, nRound, nNum, null);
      }
    }
  }, []);

  const updateState = useCallback((data: Tournament) => {
      setTournament(data);
      const rList = data.rounds || [];
      setRounds(rList);
      setSelectedRound(prev => prev || data.starting_round || rList[0]);

      // 1. Исходные данные
      const base = ensureStructure(data.bracket || {}, rList, data.id);
      
      // 2. TRUE BRACKET (Реальность)
      setTrueBracket(JSON.parse(JSON.stringify(base)));

      // 3. USER BRACKET (Фантазия) - СТРОИМ ЗАНОВО
      const userB: BracketRoundMap = JSON.parse(JSON.stringify(base));
      
      // === ЧИСТКА ===
      for (let i = 1; i < rList.length; i++) {
          const rName = rList[i];
          if (userB[rName]) {
              userB[rName].forEach((m) => {
                  m.player1 = { name: 'TBD' };
                  m.player2 = { name: 'TBD' };
              });
          }
      }

      let foundAnyPick = false;

      // === СИМУЛЯЦИЯ ===
      for (let i = 0; i < rList.length; i++) {
        const rName = rList[i];
        if (!userB[rName]) continue;
        
        userB[rName].forEach((m) => {
            // A. BYE
            if (i === 0) {
                 if (m.player1?.name === 'Bye' && m.player2?.name && m.player2.name !== 'TBD') {
                     const w = m.player2.name; m.predicted_winner = w;
                     propagate(userB, rList, rName, m.match_number, w);
                 } else if (m.player2?.name === 'Bye' && m.player1?.name && m.player1.name !== 'TBD') {
                     const w = m.player1.name; m.predicted_winner = w;
                     propagate(userB, rList, rName, m.match_number, w);
                 }
            }

            // B. PROGNOZ
            if (m.predicted_winner) {
                foundAnyPick = true;
                propagate(userB, rList, rName, m.match_number, m.predicted_winner);
            }
        });
      }
      
      setBracket(userB);
      if (data.has_picks || foundAnyPick) {
          setHasPicks(true);
      }
  }, [ensureStructure, propagate]);

  useEffect(() => { if (cached) updateState(cached); }, [cached, updateState]);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      if (!cached) setIsLoading(true);
      try {
        const initData = await waitForTelegram();
        const data = await loadTournament(id, initData || '');
        if (mounted && data) updateState(data);
      } catch (e) { 
          console.error(e);
          if (!cached) setError('Ошибка загрузки'); 
      } finally { 
          if (mounted) setIsLoading(false); 
      }
    };
    init();
    return () => { mounted = false; };
  }, [id, loadTournament, updateState, cached]); 

  // === ОБРАБОТКА КЛИКА (ИСПРАВЛЕНО let -> const) ===
  const handlePick = (round: string, matchId: string, player: string) => {
    console.log(`[Click] Round: ${round}, ID: ${matchId}, Player: ${player}`);
    
    if (tournament?.status !== 'ACTIVE') { 
        toast.error('Турнир не активен'); 
        return; 
    }
    
    setBracket((prev) => {
      const nb: BracketRoundMap = JSON.parse(JSON.stringify(prev));
      // Ищем матч. Сначала пробуем по ID
      const m = nb[round]?.find((x) => x.id === matchId);
      
      if (m) {
        console.log("Match found! Updating predicted winner...");
        const newVal = m.predicted_winner === player ? null : player;
        m.predicted_winner = newVal;
        propagate(nb, rounds, round, m.match_number, newVal);
      } else {
          console.error("CRITICAL: Match object not found in state!");
      }
      return nb;
    });
    setHasPicks(true);
  };

  const savePicks = async () => {
    const initData = await waitForTelegram();
    if (!initData) return;
    const picks: PickPayload[] = [];
    Object.keys(bracket).forEach(r => bracket[r].forEach((m) => {
        if (m.predicted_winner) {
            picks.push({ tournament_id: parseInt(id), round: m.round, match_number: m.match_number, predicted_winner: m.predicted_winner });
        }
    }));
    try {
        await fetch('/api/picks/bulk', { method: 'POST', headers: { Authorization: initData }, body: JSON.stringify(picks) });
        toast.success('Сохранено');
        loadTournament(id, initData);
    } catch (e) { console.error(e); toast.error('Ошибка сохранения'); }
  };

  return { tournament, bracket, trueBracket, hasPicks, error, isLoading, selectedRound, setSelectedRound, rounds, handlePick, savePicks };
}