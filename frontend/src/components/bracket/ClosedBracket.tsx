'use client';

import { motion, AnimatePresence, Variants, PanInfo } from 'framer-motion';
import styles from './Bracket.module.css';
import { BracketMatch } from '@/types';
import { useState } from 'react';
import { useClosedTournament } from '@/hooks/useClosedTournament';
import { useRouter } from 'next/navigation';

const BackIcon = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>);
const CheckIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 6L9 17L4 12" stroke="#00B2FF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>);
const TrophyIcon = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>);

const variants: Variants = {
  enter: (direction: number) => ({ x: direction > 0 ? 50 : -50, opacity: 0, scale: 0.95 }),
  center: { x: 0, opacity: 1, scale: 1, position: 'relative' },
  exit: (direction: number) => ({ x: direction < 0 ? 50 : -50, opacity: 0, scale: 0.95, position: 'absolute', top: 0, left: 0, width: '100%' })
};

// Функция очистки для сравнения
const clean = (name: string | undefined | null) => {
    if (!name || name === 'TBD' || name.toLowerCase() === 'bye') return "tbd";
    let n = name.replace(/\s*\(.*?\)/g, '');
    n = n.replace(/[^a-zA-Z]/g, '').toLowerCase();
    return n || "tbd";
};

export default function ClosedBracket({ id, tournamentName }: { id: string, tournamentName: string }) {
  const router = useRouter();
  const { userBracket, trueBracket, hasPicks, isLoading, selectedRound, setSelectedRound, rounds } = useClosedTournament(id);
  const [direction, setDirection] = useState(0);

  if (isLoading) return <div className="flex justify-center pt-20 text-[#5F6067]">Загрузка...</div>;
  if (!selectedRound) return null;

  const isFirstRound = selectedRound === rounds[0];

  const changeRound = (newRound: string) => {
    const idx = rounds.indexOf(selectedRound);
    const nIdx = rounds.indexOf(newRound);
    if (idx === nIdx) return;
    setDirection(nIdx > idx ? 1 : -1);
    setSelectedRound(newRound);
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const idx = rounds.indexOf(selectedRound);
    if (Math.abs(info.offset.y) > Math.abs(info.offset.x)) return;
    if (info.offset.x < -50 && idx < rounds.length - 1) changeRound(rounds[idx + 1]);
    else if (info.offset.x > 50 && idx > 0) changeRound(rounds[idx - 1]);
  };

  // Если юзер не играл, показываем TrueBracket (реальность), иначе UserBracket (фантазия)
  const displayBracket = hasPicks ? userBracket : trueBracket;

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
                  
                  // Сравниваем Фантазию (match) с Реальностью (trueMatch)
                  const trueMatch = trueBracket[selectedRound]?.[index];
                  const trueWinner = trueMatch?.actual_winner; 
                  const isMatchFinished = clean(trueWinner) !== 'tbd';

                  const uP1 = match.player1;
                  const uP2 = match.player2;
                  const myPick = match.predicted_winner;
                  const scores = match.scores || [];

                  // === ЛОГИКА ЦВЕТОВ ===
                  const getStyle = (userP: string | null | undefined, realP: string | null | undefined, isPick: boolean) => {
                      const cls = styles.playerRow;
                      const safeUser = userP || 'TBD';
                      const safeReal = realP || 'TBD';
                      const cUser = clean(safeUser);
                      const cReal = clean(safeReal);
                      const cTrueWinner = clean(trueWinner);

                      // Если мы просто зрители (без пиков) - нейтральный
                      if (!hasPicks) return { className: cls, display: safeReal, hint: null };

                      // 0. База
                      if (cUser === 'tbd') return { className: `${cls} ${styles.tbd}`, display: 'TBD', hint: null };
                      if (cUser === 'bye') return { className: `${cls} ${styles.tbd}`, display: safeUser, hint: null };

                      // 1. R32 (Первый круг) - Всегда нейтральный синий (выбор)
                      if (isFirstRound) {
                         if (isPick) return { className: `${cls} ${styles.selected}`, display: safeUser, hint: null };
                         return { className: cls, display: safeUser, hint: null };
                      }

                      // 2. R16+ (Сравнение)
                      // Если реальность еще не определена (TBD) -> Синий (Ждем)
                      if (cReal === 'tbd') {
                          if (isPick) return { className: `${cls} ${styles.selected}`, display: safeUser, hint: null };
                          return { className: cls, display: safeUser, hint: null };
                      }

                      // КЕЙС 1: MISMATCH (Я выбрала Фонини, а в реальности Муте) -> КРАСНЫЙ
                      if (cUser !== cReal) {
                          return { 
                              className: `${cls} ${styles.incorrect}`, 
                              display: safeUser, 
                              hint: safeReal // "Фонини -> Муте"
                          };
                      }

                      // КЕЙС 2: MATCH (Зверев = Зверев). Проверяем исход.
                      if (cUser === cReal) {
                          if (isPick) {
                              if (isMatchFinished) {
                                  // Зверев выиграл -> ЗЕЛЕНЫЙ
                                  if (cTrueWinner === cUser) {
                                      return { className: `${cls} ${styles.correct}`, display: safeUser, hint: null };
                                  } 
                                  // Зверев проиграл -> КРАСНЫЙ
                                  else {
                                      return { 
                                          className: `${cls} ${styles.incorrect}`, 
                                          display: safeUser, 
                                          hint: trueWinner // "Зверев -> Муте"
                                      };
                                  }
                              } else {
                                  // Матч идет -> СИНИЙ
                                  return { className: `${cls} ${styles.selected}`, display: safeUser, hint: null };
                              }
                          }
                          // Не ставила на него -> просто серый
                          return { className: cls, display: safeUser, hint: null };
                      }
                      
                      return { className: cls, display: safeUser, hint: null };
                  };

                  if (selectedRound === 'Champion') {
                     const state = getStyle(match.player1?.name, trueMatch?.player1?.name, !!myPick);
                     let bgStyle = '#1E1E1E';
                     if (state.className.includes('correct')) bgStyle = 'rgba(48, 209, 88, 0.15)';
                     else if (state.className.includes('incorrect')) bgStyle = 'rgba(255, 69, 58, 0.15)';
                     else if (state.className.includes('selected')) bgStyle = '#152230';

                     return (
                        <div key={match.id} className={styles.championWrapper}>
                            <div className={styles.championContainer} style={{ border: 'none', background: bgStyle }}>
                                <div className={state.className} style={{ height: '60px', cursor: 'default', borderRadius: '12px', background: 'transparent', border: 'none' }}>
                                    <div className={styles.playerInfo} style={{ justifyContent: 'center' }}>
                                        <span className={styles.playerName} style={{ fontSize: '16px' }}>{state.display}</span>
                                        {state.hint && (<div className={styles.correctionText}><span className={styles.correctionArrow}>→</span> {state.hint}</div>)}
                                    </div>
                                    {(state.className.includes('selected') || state.className.includes('correct')) && <div className={styles.checkIcon}><TrophyIcon /></div>}
                                </div>
                            </div>
                        </div>
                     );
                  }

                  const p1S = getStyle(uP1.name, trueMatch?.player1?.name, clean(myPick) === clean(uP1.name));
                  const p2S = getStyle(uP2.name, trueMatch?.player2?.name, clean(myPick) === clean(uP2.name));

                  return (
                    <div key={match.id} className={styles.matchWrapper}>
                      <div className={styles.matchContainer}>
                        <div className={p1S.className}>
                          <div className={styles.playerInfo}>
                              <span className={styles.playerName}>{p1S.display}</span>
                              {p1S.display !== 'TBD' && !p1S.className.includes('incorrect') && <span className={styles.playerSeed}>{uP1.seed ? `[${uP1.seed}]` : ''}</span>}
                              {p1S.hint && (<div className={styles.correctionText}><span className={styles.correctionArrow}>→</span> {p1S.hint}</div>)}
                          </div>
                          <div className="flex gap-2 mr-2">{scores.map((s: string, i: number) => <span key={i} className="text-[11px] font-mono text-[#8E8E93]">{s.split('-')[0]}</span>)}</div>
                          {hasPicks && clean(myPick) === clean(p1S.display) && !p1S.className.includes('incorrect') && <div className={styles.checkIcon}><CheckIcon/></div>}
                        </div>
                        <div className={p2S.className}>
                           <div className={styles.playerInfo}>
                              <span className={styles.playerName}>{p2S.display}</span>
                              <span className={styles.playerSeed}>{uP2.seed ? `[${uP2.seed}]` : ''}</span>
                              {p2S.hint && (<div className={styles.correctionText}><span className={styles.correctionArrow}>→</span> {p2S.hint}</div>)}
                           </div>
                           <div className="flex gap-2 mr-2">{scores.map((s: string, i: number) => <span key={i} className="text-[11px] font-mono text-[#8E8E93]">{s.split('-')[1]}</span>)}</div>
                           {hasPicks && clean(myPick) === clean(p2S.display) && !p2S.className.includes('incorrect') && <div className={styles.checkIcon}><CheckIcon/></div>}
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