'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { Tournament, BracketMatch } from '@/types';
import { useTournamentContext } from '@/context/TournamentContext';

type BracketRoundMap = { [roundName: string]: BracketMatch[]; };
type PickPayload = {
  tournament_id: number; round: string; match_number: number; predicted_winner: string;
};

const waitForTelegram = async () => {
    for (let i = 0; i < 20; i++) {
        if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initData) {
            return window.Telegram.WebApp.initData;
        }
        await new Promise(r => setTimeout(r, 100));
    }
    return null;
};

export function useActiveTournament(id: string) {
  const { getTournamentData, loadTournament } = useTournamentContext();
  const cached = getTournamentData(id);

  const [bracket, setBracket] = useState<BracketRoundMap>(cached?.bracket || {}); 
  const [selectedRound, setSelectedRound] = useState(cached?.starting_round || cached?.rounds?.[0] || null);
  const [rounds, setRounds] = useState(cached?.rounds || []);
  const [isLoading, setIsLoading] = useState(!cached);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  const isProcessed = useRef(false);

  // 1. Создаем структуру (скелет)
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

  // 2. Функция "Протаскивания"
  const propagate = useCallback((bState: BracketRoundMap, rList: string[], cRound: string, mNum: number, wName: string | null, isRestoring: boolean = false) => {
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
      
      if (isRestoring) {
          if (nm.predicted_winner) {
              propagate(bState, rList, nRound, nNum, nm.predicted_winner, true);
          }
      } 
      else {
          if (nm.predicted_winner && nm.predicted_winner !== wName) {
              nm.predicted_winner = null;
              propagate(bState, rList, nRound, nNum, null, false);
          }
      }
    }
  }, []);

  // 3. Обработка данных
  const processData = useCallback((data: Tournament) => {
      const rList = data.rounds || [];
      setRounds(rList);
      setSelectedRound(prev => prev || data.starting_round || rList[0]);

      const base = ensureStructure(data.bracket || {}, rList, data.id);
      const userB: BracketRoundMap = JSON.parse(JSON.stringify(base));
      
      for (let i = 1; i < rList.length; i++) {
          const rName = rList[i];
          if (userB[rName]) {
              userB[rName].forEach((m) => {
                  m.player1 = { name: 'TBD' };
                  m.player2 = { name: 'TBD' };
              });
          }
      }

      for (let i = 0; i < rList.length; i++) {
        const rName = rList[i];
        if (!userB[rName]) continue;
        
        userB[rName].forEach((m) => {
            if (i === 0) {
                 if (m.player1?.name === 'Bye' && m.player2?.name && m.player2.name !== 'TBD') {
                     const w = m.player2.name; 
                     m.predicted_winner = w; 
                     propagate(userB, rList, rName, m.match_number, w, true);
                 } else if (m.player2?.name === 'Bye' && m.player1?.name && m.player1.name !== 'TBD') {
                     const w = m.player1.name; 
                     m.predicted_winner = w; 
                     propagate(userB, rList, rName, m.match_number, w, true);
                 }
            }
            if (m.predicted_winner) {
                propagate(userB, rList, rName, m.match_number, m.predicted_winner, true);
            }
        });
      }
      setBracket(userB);
  }, [ensureStructure, propagate]);

  // Загрузка
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

  const handlePick = (round: string, matchId: string, player: string) => {
    if (!player || player === 'Bye' || player === 'TBD') return;

    setBracket((prev) => {
      const nb: BracketRoundMap = JSON.parse(JSON.stringify(prev));
      const m = nb[round]?.find((x) => x.id === matchId);
      
      if (m) {
        if (m.player1?.name === 'Bye' || m.player2?.name === 'Bye') return prev;
        m.predicted_winner = player;
        propagate(nb, rounds, round, m.match_number, player, false);
      }
      return nb;
    });
  };

  // --- SAVE ---
  const savePicks = async () => {
    setSaveStatus('loading');
    
    // Берем свежий initData перед отправкой
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) {
        toast.error('Ошибка авторизации. Перезагрузка...');
        setTimeout(() => window.location.reload(), 1500);
        setSaveStatus('idle');
        return;
    }
    
    const picks: PickPayload[] = [];
    Object.keys(bracket).forEach(r => bracket[r].forEach((m) => {
        if (m.predicted_winner) {
            picks.push({ 
                tournament_id: parseInt(id, 10), 
                round: m.round, 
                match_number: Number(m.match_number), 
                predicted_winner: String(m.predicted_winner) 
            });
        }
    }));

    if (picks.length === 0) {
        toast('Вы ничего не выбрали!', { icon: '🤔' });
        setSaveStatus('idle');
        return;
    }
    
    try {
        const res = await fetch('/api/picks/bulk', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json', 'Authorization': initData }, 
            body: JSON.stringify(picks) 
        });

        if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
                throw new Error('AUTH_EXPIRED');
            }
            if (res.status === 400) {
                const err = await res.json();
                throw new Error(err.detail || 'Ошибка сохранения');
            }
            throw new Error('Ошибка сервера');
        }

        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 2000);
        
        if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }

    } catch (e: any) {
        console.error("Save error:", e);
        setSaveStatus('idle');
        
        if (e.message === 'AUTH_EXPIRED') {
            toast.error('Сессия истекла. Обновляю...', { duration: 2000 });
            setTimeout(() => window.location.reload(), 2000);
        } else {
            toast.error(e.message || 'Не удалось сохранить');
        }
    }
  };

  return { bracket, isLoading, selectedRound, setSelectedRound, rounds, handlePick, savePicks, saveStatus };
}