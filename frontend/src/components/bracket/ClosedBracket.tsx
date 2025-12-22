'use client';

import { useState } from 'react';
import { motion, AnimatePresence, Variants, PanInfo } from 'framer-motion';
import { useRouter } from 'next/navigation';
import styles from './Bracket.module.css';
import { BracketMatch } from '@/types';
import { useClosedTournament } from '@/hooks/useClosedTournament';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { BracketMatchCard } from './BracketMatchCard';

const BackIcon = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>);

const variants: Variants = {
  enter: (direction: number) => ({ x: direction > 0 ? 50 : -50, opacity: 0, scale: 0.95 }),
  center: { x: 0, opacity: 1, scale: 1, position: 'relative' },
  exit: (direction: number) => ({ x: direction < 0 ? 50 : -50, opacity: 0, scale: 0.95, position: 'absolute', top: 0, left: 0, width: '100%' })
};

const clean = (name: string | undefined | null) => {
    if (!name || name === 'TBD') return "tbd";
    if (name.toLowerCase() === 'bye') return "bye";
    let n = name.replace(/\s*\(.*?\)/g, '');
    n = n.replace(/[^a-zA-Z]/g, '').toLowerCase();
    return n || "tbd";
};

export default function ClosedBracket({ id, tournamentName }: { id: string, tournamentName: string }) {
  const router = useRouter();
  const { userBracket, trueBracket, hasPicks, isLoading, selectedRound, setSelectedRound, rounds } = useClosedTournament(id);
  const { selection } = useHapticFeedback();
  const [direction, setDirection] = useState(0);

  if (isLoading) return <div className="flex justify-center pt-20 text-[#5F6067]">Загрузка...</div>;
  if (!selectedRound) return null;

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
  const isFirstRound = selectedRound === rounds[0];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={() => router.back()} className={styles.backArrow}><BackIcon /></button>
        <h2 className={styles.tournamentTitle}>{tournamentName}</h2>
      </div>
      <div className={styles.bannerWrapper}>
         <div className="w-full h-[80px] bg-[#D9D9D9] rounded-[16px] opacity-90"></div>
      </div>
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
                displayBracket[selectedRound].map((match: BracketMatch, index: number) => {
                  
                  const trueMatch = trueBracket[selectedRound]?.find(m => m.match_number === match.match_number);
                  const uP1 = match.player1;
                  const uP2 = match.player2;
                  const scores = trueMatch?.scores || []; 

                  const myPick = match.predicted_winner;
                  const p1IsPick = clean(myPick) === clean(uP1.name);
                  const p2IsPick = clean(myPick) === clean(uP2.name);

                  // --- 1. ОПРЕДЕЛЯЕМ СТАТУС (ЦВЕТ) ---
                  const resolveStatus = (playerName: string | undefined, slotStatus: string | undefined, isPick: boolean) => {
                      const safeName = playerName || 'TBD';
                      const cleanName = clean(safeName);

                      // Зритель или Первый раунд -> Серый
                      if (!hasPicks || isFirstRound) {
                          if (cleanName === 'bye' || cleanName === 'tbd') return 'tbd';
                          return 'default';
                      }

                      // Пустые ячейки
                      if (cleanName === 'bye' || cleanName === 'tbd') return 'tbd';

                      // Статусы от Бэкенда (Зеленый / Красный)
                      if (slotStatus === 'CORRECT') return 'correct';
                      if (slotStatus === 'INCORRECT') return 'incorrect';
                      
                      // Синий (если выбран, но еще не сыгран/не решен)
                      if (isPick) return 'selected';
                      
                      return 'default';
                  };

                  const p1Status = resolveStatus(uP1.name, match.player1_status, p1IsPick);
                  const p2Status = resolveStatus(uP2.name, match.player2_status, p2IsPick);

                  // --- 2. ОПРЕДЕЛЯЕМ ПОДСКАЗКУ (СТРЕЛКУ) ---
                  const resolveHint = (status: string, realName?: string) => {
                      if (status === 'incorrect' && realName && clean(realName) !== 'tbd') {
                          return realName;
                      }
                      return null;
                  };

                  const p1Hint = resolveHint(p1Status, match.real_player1);
                  const p2Hint = resolveHint(p2Status, match.real_player2);

                  // --- 3. ОПРЕДЕЛЯЕМ ВЫЛЕТ (ПРОЗРАЧНОСТЬ) ---
                  // Если игрок вылетел ранее (is_eliminated=true) И текущий статус incorrect
                  const p1Eliminated = match.is_eliminated && p1Status === 'incorrect';
                  const p2Eliminated = match.is_eliminated && p2Status === 'incorrect';


                  // --- РЕНДЕР ЧЕМПИОНА ---
                  if (selectedRound === 'Champion') {
                      return (
                          <div key={match.id} className="w-full">
                              <BracketMatchCard 
                                  player1={uP1} 
                                  player2={null}
                                  p1Status={p1Status as any}
                                  p1Hint={p1Hint}
                                  isChampion={true}
                              />
                          </div>
                      );
                  }

                  // --- РЕНДЕР ОБЫЧНОГО МАТЧА ---
                  return (
                    <div key={match.id} className="w-full">
                      <BracketMatchCard 
                          player1={uP1}
                          player2={uP2}
                          scores={scores}
                          
                          // Передаем рассчитанные строки статусов
                          p1Status={p1Status as any}
                          p2Status={p2Status as any}
                          
                          p1Hint={p1Hint}
                          p2Hint={p2Hint}
                          
                          p1Eliminated={p1Eliminated}
                          p2Eliminated={p2Eliminated}

                          showChecks={false} // Галочки выключены в Closed
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