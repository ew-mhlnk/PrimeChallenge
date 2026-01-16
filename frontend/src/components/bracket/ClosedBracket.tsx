'use client';

import { useState } from 'react';
import { motion, AnimatePresence, Variants, PanInfo } from 'framer-motion';
import styles from './Bracket.module.css';
import { BracketMatch, Tournament } from '@/types';
import { useClosedTournament } from '@/hooks/useClosedTournament';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { BracketMatchCard } from './BracketMatchCard';
import { TournamentHero } from '../tournament/TournamentHero';

const variants: Variants = {
  enter: (direction: number) => ({ x: direction > 0 ? 50 : -50, opacity: 0, scale: 0.95 }),
  center: { x: 0, opacity: 1, scale: 1, position: 'relative' },
  exit: (direction: number) => ({ x: direction < 0 ? 50 : -50, opacity: 0, scale: 0.95, position: 'absolute', top: 0, left: 0, width: '100%' })
};

const clean = (name: string | undefined | null) => {
    if (!name || name === 'TBD') return "tbd";
    if (name.toLowerCase() === 'bye') return "bye";
    let n = name.replace(/\s*\(.*?\)/g, '');
    n = n.replace(/[^a-zA-Zа-яА-Я0-9]/g, '').toLowerCase();
    return n || "tbd";
};

interface ClosedBracketProps {
    tournament: Tournament;
}

export default function ClosedBracket({ tournament }: ClosedBracketProps) {
  const { userBracket, trueBracket, hasPicks, isLoading, selectedRound, setSelectedRound, rounds } = useClosedTournament(tournament.id.toString(), tournament);
  
  const { selection } = useHapticFeedback();
  const [direction, setDirection] = useState(0);

  if (isLoading) return <div className="flex justify-center pt-20 text-[#5F6067]">Загрузка...</div>;
  if (!selectedRound) return null;

  let winnerName: string | null = null;
  if (trueBracket['Champion']?.[0]) {
      winnerName = trueBracket['Champion'][0].player1?.name || null;
  }
  if (!winnerName && tournament.status === 'COMPLETED' && tournament.true_draws) {
       const w = tournament.true_draws.find(d => d.round === 'Champion');
       if (w && w.winner) winnerName = w.winner;
  }

  const changeRound = (newRound: string) => {
    const idx = rounds.indexOf(selectedRound);
    const nIdx = rounds.indexOf(newRound);
    if (idx === nIdx) return;
    selection();
    setDirection(nIdx > idx ? 1 : -1);
    setSelectedRound(newRound);
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const idx = rounds.indexOf(selectedRound);
    if (Math.abs(info.offset.y) > Math.abs(info.offset.x)) return;
    if (info.offset.x < -50 && idx < rounds.length - 1) changeRound(rounds[idx + 1]);
    else if (info.offset.x > 50 && idx > 0) changeRound(rounds[idx - 1]);
  };

  const displayBracket = hasPicks ? userBracket : trueBracket;

  return (
    <div className={styles.container}>
      <TournamentHero tournament={tournament} winnerName={winnerName} />

      <div className={styles.roundsContainer}>
        {rounds.map((round) => (
          <button key={round} onClick={() => changeRound(round)} className={`${styles.roundButton} ${selectedRound === round ? styles.activeRound : ''}`}>{round}</button>
        ))}
      </div>

      <div className={`${styles.bracketWindow} ${['SF', 'F', 'Champion'].includes(selectedRound) ? styles.bracketWindowCompact : styles.bracketWindowFull}`}>
        <div className={styles.scrollArea}>
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={selectedRound} custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
              layout drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.2} dragDirectionLock={true} onDragEnd={handleDragEnd}
              className={styles.sliderWrapper}
            >
              {displayBracket[selectedRound]?.length > 0 ? (
                displayBracket[selectedRound].map((match: BracketMatch) => {
                  
                  const trueMatch = trueBracket[selectedRound]?.find(m => m.match_number === match.match_number);
                  const scores = trueMatch?.scores || []; 

                  const uP1 = match.player1;
                  const uP2 = match.player2;
                  const myPick = match.predicted_winner;

                  // --- ОПРЕДЕЛЯЕМ, ЯВЛЯЕТСЯ ЛИ ИГРОК ВЫБОРОМ ПОЛЬЗОВАТЕЛЯ ---
                  let p1IsPick = clean(myPick) === clean(uP1.name);
                  let p2IsPick = clean(myPick) === clean(uP2.name);

                  // 🔥 Q/LL SAFEGUARD (ЗАЩИТА СЛОТОВ) 🔥
                  // Если имя не совпадает (например Q/LL vs Кеведо), но:
                  // 1. Бэкенд говорит, что мы угадали исход (match.status === CORRECT)
                  // 2. И этот игрок стоит в сетке верно (player_status === CORRECT)
                  // -> Значит это наш выбор (через слот).
                  if (!p1IsPick && match.status === 'CORRECT' && match.player1_status === 'CORRECT') {
                      p1IsPick = true;
                  }
                  if (!p2IsPick && match.status === 'CORRECT' && match.player2_status === 'CORRECT') {
                      p2IsPick = true;
                  }

                  // === ГЛАВНАЯ ЛОГИКА ЦВЕТОВ ===
                  const getStatus = (playerName: string | null | undefined, slotStatus: string | undefined, isUserPick: boolean) => {
                      const safeName = playerName || 'TBD';
                      const cleanName = clean(safeName);
                      
                      // 0. Без прогнозов
                      if (!hasPicks) {
                          if (cleanName === 'bye' || cleanName === 'tbd') return 'tbd';
                          return 'default';
                      }
                      
                      if (cleanName === 'bye' || cleanName === 'tbd') return 'tbd';
                      
                      // 1. СТАРТОВЫЙ РАУНД -> НИКОГДА НЕ ЗЕЛЕНЫЙ
                      const isFirstRound = rounds.length > 0 && selectedRound === rounds[0];
                      if (isFirstRound) {
                          if (isUserPick) return 'selected'; // Синий
                          return 'default'; // Серый
                      }

                      // 2. СЛЕДУЮЩИЕ РАУНДЫ
                      
                      // А. МОЙ ВЫБОР
                      if (isUserPick) {
                          if (slotStatus === 'CORRECT') return 'correct';      // ✅ Угадал (Зеленый)
                          if (slotStatus === 'INCORRECT') return 'incorrect';  // ❌ Выбрал, но вылетел (Красный)
                          return 'selected';                                   // 🔵 Еще играет (Синий)
                      } 
                      
                      // Б. НЕ МОЙ ВЫБОР
                      else {
                          // Если слот CORRECT (Прошел), но я НЕ выбрал -> КРАСНЫЙ (Ошибка)
                          if (slotStatus === 'CORRECT') return 'incorrect';

                          // Если слот INCORRECT (Вылетел) -> КРАСНЫЙ (История)
                          if (slotStatus === 'INCORRECT') return 'incorrect';
                          
                          return 'default'; 
                      }
                  };
                  
                  const p1Stat = getStatus(uP1.name, match.player1_status, p1IsPick);
                  const p2Stat = getStatus(uP2.name, match.player2_status, p2IsPick);

                  const getHint = (status: string, realName?: string) => {
                      if (status === 'incorrect' && realName && clean(realName) !== 'tbd' && clean(realName) !== 'bye') {
                          return realName;
                      }
                      return null;
                  };

                  if (selectedRound === 'Champion') {
                      return (
                          <div key={match.id} className="w-full">
                              <BracketMatchCard 
                                  player1={uP1} 
                                  player2={null} 
                                  p1Status={p1Stat as any} 
                                  p1Hint={getHint(p1Stat, match.real_player1)} 
                                  isChampion={true} 
                                  showChecks={false}
                              />
                          </div>
                      );
                  }

                  return (
                    <div key={match.id} className="w-full">
                      <BracketMatchCard 
                          player1={uP1} 
                          player2={uP2} 
                          scores={scores} 
                          
                          p1Status={p1Stat as any} 
                          p2Status={p2Stat as any} 
                          
                          p1Hint={getHint(p1Stat, match.real_player1)} 
                          p2Hint={getHint(p2Stat, match.real_player2)}
                          
                          showChecks={false} 
                          showConnector={selectedRound !== 'F'}
                      />
                    </div>
                  );
                })
              ) : <div className="flex h-full items-center justify-center py-20"><p className="text-[#5F6067] text-sm">Нет матчей</p></div>}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}