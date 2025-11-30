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

  // 1. Создаем "скелет" сетки
  // В R32 - реальные игроки. В R16, QF и т.д. - TBD (пока что)
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

  // 2. Функция, которая берет имя и пишет его в СЛЕДУЮЩИЙ раунд
  const propagate = useCallback((bState: BracketRoundMap, rList: string[], cRound: string, mNum: number, wName: string | null) => {
    const idx = rList.indexOf(cRound);
    // Если это последний раунд или раунд не найден - выход
    if (idx === -1 || idx === rList.length - 1) return;
    
    const nRound = rList[idx + 1];

    // Если следующий раунд - Чемпион (особый случай)
    if (nRound === 'Champion') {
        const cm = bState['Champion']?.find((m) => m.match_number === 1);
        if (cm) { cm.player1 = { name: wName || 'TBD' }; cm.predicted_winner = wName; }
        return;
    }

    // Обычная логика: вычисляем номер матча в след. круге
    const nNum = Math.ceil(mNum / 2);
    const isP1 = mNum % 2 !== 0; // Нечетные идут в player1, четные в player2
    const nm = bState[nRound]?.find((m) => m.match_number === nNum);

    if (nm) {
      const target = isP1 ? 'player1' : 'player2';
      // ПИШЕМ ИМЯ В ЯЧЕЙКУ
      nm[target] = { name: wName || 'TBD' };
    }
  }, []);

  // 3. Главная функция обработки данных
  const processData = useCallback((data: Tournament) => {
      console.log("Restoring User Bracket from DB...");
      setTournament(data);
      const rList = data.rounds || [];
      setRounds(rList);
      setSelectedRound(prev => prev || data.starting_round || rList[0]);

      // Берем сырую структуру из БД. 
      // В ней: R32 заполнен игроками, R16+ могут содержать реальных победителей (если есть)
      const base = ensureStructure(data.bracket || {}, rList, data.id);
      
      // TrueBracket оставляем как есть (для истории)
      setTrueBracket(JSON.parse(JSON.stringify(base)));

      // UserBracket - ЭТО ТО, ЧТО МЫ СЕЙЧАС БУДЕМ ПЕРЕСОБИРАТЬ
      const userB: BracketRoundMap = JSON.parse(JSON.stringify(base));
      
      // === ШАГ 1: ОЧИСТКА ===
      // Мы НЕ ВЕРИМ именам игроков в R16, QF и т.д., которые пришли с сервера.
      // В статусе ACTIVE мы хотим видеть только то, что навыбирал юзер.
      // Поэтому стираем всех игроков во всех раундах, кроме первого.
      for (let i = 1; i < rList.length; i++) {
          const rName = rList[i];
          if (userB[rName]) {
              userB[rName].forEach((m) => {
                  m.player1 = { name: 'TBD' };
                  m.player2 = { name: 'TBD' };
                  // НО! Мы НЕ стираем predicted_winner. Это сохраненный выбор юзера.
              });
          }
      }

      let foundPick = false;

      // === ШАГ 2: ВОССТАНОВЛЕНИЕ ЦЕПОЧКИ ===
      // Идем по раундам: R32 -> R16 -> QF -> ...
      for (let i = 0; i < rList.length; i++) {
        const rName = rList[i];
        if (!userB[rName]) continue;
        
        userB[rName].forEach((m) => {
            // A. Обработка BYE (Только в 1-м круге)
            if (i === 0) {
                 if (m.player1?.name === 'Bye' && m.player2?.name && m.player2.name !== 'TBD') {
                     const w = m.player2.name; 
                     m.predicted_winner = w; // Автоматом ставим предикшн
                     propagate(userB, rList, rName, m.match_number, w);
                 } else if (m.player2?.name === 'Bye' && m.player1?.name && m.player1.name !== 'TBD') {
                     const w = m.player1.name; 
                     m.predicted_winner = w; // Автоматом ставим предикшн
                     propagate(userB, rList, rName, m.match_number, w);
                 }
            }

            // B. Если в матче есть predicted_winner (из БД или от Bye),
            // мы берем это имя и ПИШЕМ ЕГО В СЛЕДУЮЩИЙ РАУНД.
            if (m.predicted_winner) {
                foundPick = true;
                propagate(userB, rList, rName, m.match_number, m.predicted_winner);
            }
        });
      }
      
      setBracket(userB);
      if (data.has_picks || foundPick) setHasPicks(true);
  }, [ensureStructure, propagate]);

  // Эффект загрузки (Один раз при старте)
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

  // Клик пользователя
  const handlePick = (round: string, matchId: string, player: string) => {
    if (tournament?.status !== 'ACTIVE') { 
        toast.error('Турнир не активен'); 
        return; 
    }
    
    // Блокировка Bye и TBD
    if (!player || player === 'Bye' || player === 'TBD') return;

    setBracket((prev) => {
      const nb: BracketRoundMap = JSON.parse(JSON.stringify(prev));
      const m = nb[round]?.find((x) => x.id === matchId);
      
      if (m) {
        // Блокировка матчей с Bye
        if (m.player1?.name === 'Bye' || m.player2?.name === 'Bye') return prev;

        // 1. Ставим победителя в текущий матч
        m.predicted_winner = player;
        
        // 2. Двигаем его в следующий круг
        propagate(nb, rounds, round, m.match_number, player);
        
        // 3. (Опционально) Если мы изменили победителя, можно сбросить цепочку дальше,
        // чтобы не было "висящих" предиктов на старого игрока. 
        // В данном коде я это убрал для простоты восстановления, но при клике это полезно.
        // Если хочешь жесткую логику "поменял - стерлось будущее", раскомментируй ниже:
        
        /*
        const idx = rounds.indexOf(round);
        if (idx !== -1 && idx < rounds.length - 1) {
             const nRound = rounds[idx + 1];
             const nNum = Math.ceil(m.match_number / 2);
             const nextM = nb[nRound]?.find(x => x.match_number === nNum);
             if (nextM) nextM.predicted_winner = null; // Сброс следующего
        }
        */
      }
      return nb;
    });
    setHasPicks(true);
  };

  const savePicks = async () => {
    const initData = await waitForTelegram();
    if (!initData) return;
    
    // Собираем ВСЕ предикты из текущего состояния bracket
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
        
        // НЕ обновляем данные с сервера (loadTournament), чтобы не сбить то, что мы только что накликали.
        // Мы и так знаем актуальное состояние.
    } catch (e) {
        console.error(e);
        toast.error('Ошибка сохранения');
    }
  };

  return { tournament, bracket, trueBracket, hasPicks, error, isLoading, selectedRound, setSelectedRound, rounds, handlePick, savePicks };
}