'use client';

import { useState } from 'react';
import { motion, AnimatePresence, Variants, PanInfo } from 'framer-motion';
import styles from './Bracket.module.css';
import { BracketMatch } from '@/types';
import { useClosedTournament } from '@/hooks/useClosedTournament';
import { useRouter } from 'next/navigation';
import { useHapticFeedback } from '@/hooks/useHapticFeedback'; // <--- Импорт

const BackIcon = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>);
const TrophyIcon = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>);

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
  const { selection } = useHapticFeedback(); // <--- Hook
  
  const [direction, setDirection] = useState(0);

  if (isLoading) return <div className="flex justify-center pt-20 text-[#5F6067]">Загрузка...</div>;
  if (!selectedRound) return null;

  const changeRound = (newRound: string) => {
    const idx = rounds.indexOf(selectedRound);
    const nIdx = rounds.indexOf(newRound);
    if (idx === nIdx) return;
    
    selection(); // <--- Вибрация (щелчок)
    
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
                  
                  const trueMatch = trueBracket[selectedRound]?.[index];
                  const uP1 = match.player1;
                  const uP2 = match.player2;
                  const scores = trueMatch?.scores || []; 

                  const getStyle = (
                      playerName: string | null | undefined, 
                      slotStatus: string | undefined, 
                      realPlayerName: string | undefined,
                      isUserPick: boolean
                  ) => {
                      const cls = styles.playerRow;
                      const safeName = playerName || 'TBD';
                      const cleanName = clean(safeName);
                      
                      // 1. ЗРИТЕЛИ
                      if (!hasPicks) {
                          if (cleanName === 'bye') return { className: `${cls} ${styles.tbd}`, display: 'Bye', hint: null };
                          if (cleanName === 'tbd') return { className: `${cls} ${styles.tbd}`, display: 'TBD', hint: null };
                          return { className: cls, display: safeName, hint: null };
                      }

                      // 2. ПЕРВЫЙ РАУНД
                      if (isFirstRound) {
                           if (cleanName === 'tbd') return { className: `${cls} ${styles.tbd}`, display: 'TBD', hint: null };
                           if (cleanName === 'bye') return { className: `${cls} ${styles.tbd}`, display: 'Bye', hint: null };
                           if (isUserPick) return { className: `${cls}`, display: safeName, hint: null, style: { fontWeight: 'bold' } };
                           return { className: cls, display: safeName, hint: null };
                      }

                      // 3. СЛЕДУЮЩИЕ РАУНДЫ
                      if (cleanName === 'tbd') return { className: `${cls} ${styles.tbd}`, display: 'TBD', hint: null };
                      if (cleanName === 'bye') return { className: `${cls} ${styles.tbd}`, display: 'Bye', hint: null };

                      if (slotStatus === 'CORRECT') {
                          return { className: `${cls} ${styles.correct}`, display: safeName, hint: null };
                      }
                      
                      if (slotStatus === 'INCORRECT') {
                          // ЛОГИКА ПОДСКАЗКИ: Скрываем если TBD
                          let hintToShow = realPlayerName;
                          if (clean(hintToShow) === 'tbd') hintToShow = undefined; 

                          return { 
                              className: `${cls} ${styles.incorrect}`, 
                              display: safeName, 
                              hint: hintToShow, 
                              style: { opacity: 0.5, textDecoration: 'line-through' } 
                          };
                      }
                      
                      if (isUserPick) return { className: `${cls} ${styles.selected}`, display: safeName, hint: null };
                      return { className: cls, display: safeName, hint: null };
                  };

                  if (selectedRound === 'Champion') {
                     const isPick = match.predicted_winner === match.player1?.name;
                     const state = getStyle(match.player1?.name, match.player1_status, match.real_player1, isPick);
                     
                     let bgStyle = '#1E1E1E';
                     if (hasPicks && !isFirstRound) {
                        if (state.className.includes(styles.correct)) bgStyle = 'rgba(48, 209, 88, 0.15)';
                        else if (state.className.includes(styles.incorrect)) bgStyle = 'rgba(255, 69, 58, 0.15)';
                        else if (state.className.includes(styles.selected)) bgStyle = '#152230';
                     }

                     return (
                        <div key={match.id} className={styles.championWrapper}>
                            <div className={styles.championContainer} style={{ border: 'none', background: bgStyle }}>
                                <div className={state.className} style={{ height: '60px', borderRadius: '12px', background: 'transparent', border: 'none', ...state.style }}>
                                    <div className={styles.playerInfo} style={{ justifyContent: 'center' }}>
                                        <span className={styles.playerName} style={{ fontSize: '16px' }}>{state.display}</span>
                                        {state.hint && (<div className={styles.correctionText}><span className={styles.correctionArrow}>→</span> {state.hint}</div>)}
                                    </div>
                                    {(hasPicks && state.className.includes(styles.correct)) && <div className={styles.checkIcon}><TrophyIcon /></div>}
                                </div>
                            </div>
                        </div>
                     );
                  }

                  const myPick = match.predicted_winner;
                  const p1IsPick = clean(myPick) === clean(uP1.name);
                  const p2IsPick = clean(myPick) === clean(uP2.name);

                  const p1S = getStyle(uP1.name, match.player1_status, match.real_player1, p1IsPick);
                  const p2S = getStyle(uP2.name, match.player2_status, match.real_player2, p2IsPick);

                  return (
                    <div key={match.id} className={styles.matchWrapper}>
                      <div className={styles.matchContainer}>
                        {/* PLAYER 1 */}
                        <div className={p1S.className} style={p1S.style}>
                          <div className={styles.playerInfo}>
                              <span className={styles.playerName}>{p1S.display}</span>
                              {p1S.display !== 'TBD' && !p1S.className.includes('incorrect') && <span className={styles.playerSeed}>{uP1.seed ? `[${uP1.seed}]` : ''}</span>}
                              {p1S.hint && (<div className={styles.correctionText}><span className={styles.correctionArrow}>→</span> {p1S.hint}</div>)}
                          </div>
                          <div className="flex gap-2 mr-2">{scores.map((s: string, i: number) => <span key={i} className="text-[11px] font-mono text-[#8E8E93]">{s.split('-')[0]}</span>)}</div>
                        </div>
                        
                        {/* PLAYER 2 */}
                        <div className={p2S.className} style={p2S.style}>
                           <div className={styles.playerInfo}>
                              <span className={styles.playerName}>{p2S.display}</span>
                              <span className={styles.playerSeed}>{uP2.seed ? `[${uP2.seed}]` : ''}</span>
                              {p2S.hint && (<div className={styles.correctionText}><span className={styles.correctionArrow}>→</span> {p2S.hint}</div>)}
                           </div>
                           <div className="flex gap-2 mr-2">{scores.map((s: string, i: number) => <span key={i} className="text-[11px] font-mono text-[#8E8E93]">{s.split('-')[1]}</span>)}</div>
                        </div>
                      </div>
                      {selectedRound !== 'F' && <div className={styles.bracketConnector} />}
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