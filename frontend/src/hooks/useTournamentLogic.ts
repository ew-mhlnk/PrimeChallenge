'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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

type BracketRoundMap = {
  [roundName: string]: BracketMatch[];
};

const waitForTelegram = async () => {
    for (let i = 0; i < 20; i++) {
        if (window.Telegram?.WebApp?.initData) return window.Telegram.WebApp.initData;
        await new Promise(r => setTimeout(r, 100));
    }
    return null;
};

// Функция мягкой очистки для сравнения внутри логики
const cleanNameLogic = (name: string | null | undefined) => {
    if (!name || name === 'TBD' || name.toLowerCase() === 'bye') return "tbd";
    // Убираем скобки и всё кроме букв
    let n = name.replace(/\s*\(.*?\)/g, '');
    n = n.replace(/[^a-zA-Z]/g, '').toLowerCase();
    return n;
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

  // 2. Продвижение победителя (С МЯГКИМ СРАВНЕНИЕМ)
  const propagate = useCallback((bState: BracketRoundMap, rList: string[], cRound: string, mNum: number, wName: string | null) => {
    // console.log(`[Propagate] ${wName} from ${cRound} match ${mNum}`);
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
      
      // ВАЖНО: Сравниваем очищенные имена!
      // Если имена "похожи" (например Zverev и A. Zverev), то мы НЕ сбрасываем прогноз.
      // Сбрасываем только если это реально разные люди.
      if (nm.predicted_winner) {
          const oldClean = cleanNameLogic(nm.predicted_winner);
          const newClean = cleanNameLogic(wName);
          
          if (oldClean !== newClean && newClean !== 'tbd') {
              console.log(`[Mismatch] Resetting future pick: ${nm.predicted_winner} != ${wName}`);
              nm.predicted_winner = null;
              propagate(bState, rList, nRound, nNum, null);
          }
      }
    }
  }, []);

  const processData = useCallback((data: Tournament) => {
      console.log("Processing Data (ONCE)...");
      setTournament(data);
      const rList = data.rounds || [];
      setRounds(rList);
      setSelectedRound(prev => prev || data.starting_round || rList[0]);

      const base = ensureStructure(data.bracket || {}, rList, data.id);
      
      // REALITY
      setTrueBracket(JSON.parse(JSON.stringify(base)));

      // FANTASY
      const userB: BracketRoundMap = JSON.parse(JSON.stringify(base));
      
      // Очистка будущего
      for (let i = 1; i < rList.length; i++) {
          const rName = rList[i];
          if (userB[rName]) {
              userB[rName].forEach((m) => {
                  m.player1 = { name: 'TBD' };
                  m.player2 = { name: 'TBD' };
              });
          }
      }

      let foundPicks = false;

      // Симуляция (R32 -> R16 -> ...)
      for (let i = 0; i < rList.length; i++) {
        const rName = rList[i];
        if (!userB[rName]) continue;
        
        userB[rName].forEach((m) => {
            // A. BYE в R32
            if (i === 0) {
                 if (m.player1?.name === 'Bye' && m.player2?.name && m.player2.name !== 'TBD') {
                     const w = m.player2.name; 
                     m.predicted_winner = w;
                     propagate(userB, rList, rName, m.match_number, w);
                 } else if (m.player2?.name === 'Bye' && m.player1?.name && m.player1.name !== 'TBD') {
                     const w = m.player1.name; 
                     m.predicted_winner = w;
                     propagate(userB, rList, rName, m.match_number, w);
                 }
            }

            // B. Продвигаем существующий прогноз
            if (m.predicted_winner) {
                foundPicks = true;
                propagate(userB, rList, rName, m.match_number, m.predicted_winner);
            }
        });
      }
      
      setBracket(userB);
      if (data.has_picks || foundPicks) setHasPicks(true);
  }, [ensureStructure, propagate]);

  // Эффект загрузки
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
            if (mounted) setError('Ошибка');
          } finally {
            if (mounted) setIsLoading(false);
          }
      }
    };
    init();
    return () => { mounted = false; };
  }, [id, loadTournament, cached, processData]);

  // Клик
  const handlePick = (round: string, matchId: string, player: string) => {
    if (tournament?.status !== 'ACTIVE') { 
        toast.error('Турнир не активен'); 
        return; 
    }
    
    if (!player || player === 'Bye' || player === 'TBD') return;

    setBracket((prev) => {
      const nb: BracketRoundMap = JSON.parse(JSON.stringify(prev));
      const m = nb[round]?.find((x) => x.id === matchId);
      
      if (m) {
        if (m.player1?.name === 'Bye' || m.player2?.name === 'Bye') return prev;

        m.predicted_winner = player;
        propagate(nb, rounds, round, m.match_number, player);
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
            picks.push({ 
                tournament_id: parseInt(id, 10), 
                round: m.round, 
                match_number: Number(m.match_number), 
                predicted_winner: String(m.predicted_winner) 
            });
        }
    }));
    
    try {
        const res = await fetch('/api/picks/bulk', { 
            method: 'POST', 
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': initData 
            }, 
            body: JSON.stringify(picks) 
        });
        
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        toast.success('Сохранено');
        // Разрешаем пересчет, чтобы убедиться, что данные с сервера встали корректно
        isProcessed.current = false; 
        loadTournament(id, initData);
    } catch (e) {
        console.error(e);
        toast.error('Ошибка сохранения');
    }
  };

  return { tournament, bracket, trueBracket, hasPicks, error, isLoading, selectedRound, setSelectedRound, rounds, handlePick, savePicks };
}