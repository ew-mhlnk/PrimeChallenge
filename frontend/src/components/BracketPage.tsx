'use client';

import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, Variants, PanInfo } from 'framer-motion';
import styles from './BracketPage.module.css';
import { useTournamentLogic } from '../hooks/useTournamentLogic';
import { useState } from 'react';

// --- ICONS ---
const BackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 6L9 17L4 12" stroke="#00B2FF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const TrophyIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
);

// --- SAVE BUTTON ---
const SaveButton = ({ onClick, status }: { onClick: () => void, status: 'idle' | 'loading' | 'success' }) => {
  return (
    <motion.button
      layout
      onClick={onClick}
      disabled={status !== 'idle'}
      className={`${styles.saveButton} ${status === 'success' ? styles.saveButtonSuccess : ''}`}
      initial={false}
      animate={{
        width: status === 'loading' ? 50 : 200,
        backgroundColor: status === 'success' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.15)',
        color: status === 'success' ? '#000000' : '#FFFFFF'
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {status === 'idle' && (
          <motion.span
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            Сохранить
          </motion.span>
        )}
        {status === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center"
          >
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </motion.div>
        )}
        {status === 'success' && (
          <motion.span
            key="success"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2"
          >
            <CheckIcon />
            Готово
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

// --- ANIMATION ---
const variants: Variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 50 : -50,
    opacity: 0,
    scale: 0.95,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    position: 'relative',
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 50 : -50,
    opacity: 0,
    scale: 0.95,
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
  })
};

const transitionSettings = {
  duration: 0.5,
  ease: [0.32, 0.72, 0, 1]
};

// Хелпер очистки имен
const cleanName = (name: string | undefined | null) => {
    if (!name) return "";
    return name.replace(/\s*\(.*?\)$/, '').trim().toLowerCase();
};

export default function BracketPage({ id }: { id: string }) {
  const router = useRouter();
  const {
    tournament,
    bracket,
    error,
    isLoading,
    selectedRound,
    setSelectedRound,
    rounds,
    handlePick,
    savePicks,
    hasPicks
  } = useTournamentLogic({ id });
  
  const [saveStatus, setSaveStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [direction, setDirection] = useState(0);

  if (isLoading) return <div className="flex justify-center pt-20 text-[#5F6067]">Загрузка...</div>;
  if (error) return <div className="text-red-500 text-center pt-10">{error}</div>;
  if (!tournament || !selectedRound) return null;

  const isLiveOrClosed = tournament.status !== 'ACTIVE';
  const isFirstRound = selectedRound === rounds[0];

  const changeRound = (newRound: string) => {
    const currentIndex = rounds.indexOf(selectedRound);
    const newIndex = rounds.indexOf(newRound);
    if (currentIndex === newIndex) return;
    setDirection(newIndex > currentIndex ? 1 : -1);
    setSelectedRound(newRound);
  };

  const handleSave = async () => {
    setSaveStatus('loading');
    await savePicks();
    setSaveStatus('success');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const currentIndex = rounds.indexOf(selectedRound);
    const threshold = 50;
    if (Math.abs(info.offset.y) > Math.abs(info.offset.x)) return;

    if (info.offset.x < -threshold && currentIndex < rounds.length - 1) {
      changeRound(rounds[currentIndex + 1]);
    } else if (info.offset.x > threshold && currentIndex > 0) {
      changeRound(rounds[currentIndex - 1]);
    }
  };

  const isChampionRound = selectedRound === 'Champion';
  const isCompactRound = ['SF', 'F', 'Champion'].includes(selectedRound);

  const getSetScore = (scoreStr: string | undefined, playerIdx: 0 | 1) => {
      if (!scoreStr) return null;
      const parts = scoreStr.split('-');
      if (parts.length < 2) return null;
      return parts[playerIdx];
  };

  return (
    <div className={styles.container}>
      
      <div className={styles.header}>
        <button onClick={() => router.back()} className={styles.backArrow}>
          <BackIcon />
        </button>
        <h2 className={styles.tournamentTitle}>{tournament.name}</h2>
      </div>

      <div className={styles.bannerWrapper}>
         <div className="w-full h-[80px] bg-[#D9D9D9] rounded-[16px] opacity-90"></div>
      </div>

      <div className={styles.roundsContainer}>
        {rounds.map((round) => (
          <button
            key={round}
            onClick={() => changeRound(round)}
            className={`${styles.roundButton} ${selectedRound === round ? styles.activeRound : ''}`}
          >
            {round}
          </button>
        ))}
      </div>

      <div className={`${styles.bracketWindow} ${isCompactRound ? styles.bracketWindowCompact : styles.bracketWindowFull}`}>
        <div className={styles.scrollArea}>
          
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={selectedRound}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={transitionSettings}
              layout 
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              dragDirectionLock={true}
              onDragEnd={handleDragEnd}
              className={styles.sliderWrapper}
            >
              {bracket[selectedRound]?.length > 0 ? (
                bracket[selectedRound].map((match) => {
                  
                  // === ОБЪЯВЛЯЕМ ПЕРЕМЕННЫЕ ЗДЕСЬ (В НАЧАЛЕ ЦИКЛА) ===
                  // Чтобы они были доступны везде внутри map
                  const p1 = match.player1;
                  const p2 = match.player2;
                  const p1Name = p1?.name || 'TBD';
                  const p2Name = p2?.name || 'TBD';
                  const myPick = match.predicted_winner;
                  const realWinner = match.actual_winner;
                  const isMatchFinished = !!realWinner;
                  const scores = match.scores || []; 

                  // Функция стиля ячейки
                  const getPlayerState = (name: string, isPicked: boolean, slotRealName: string) => {
                      const cls = styles.playerRow;
                      if (name === 'TBD') return { className: `${cls} ${styles.tbd}`, hint: null };

                      // Если я не участвую
                      if (!hasPicks && isLiveOrClosed) {
                          return { className: cls, hint: null };
                      }

                      // Первый раунд - болванка (только выбор)
                      if (isFirstRound) {
                          if (isPicked) return { className: `${cls} ${styles.selected}`, hint: null };
                          return { className: cls, hint: null };
                      }

                      // Турнир идет (R16+)
                      if (isLiveOrClosed && isPicked) {
                          const cleanPicked = cleanName(name);
                          const cleanRealSlot = cleanName(slotRealName);
                          const cleanWinner = cleanName(realWinner);

                          // 1. Вылетел раньше (Призрак)
                          if (cleanRealSlot !== 'tbd' && cleanPicked !== cleanRealSlot) {
                              return { 
                                  className: `${cls} ${styles.incorrect}`, 
                                  hint: slotRealName 
                              };
                          }

                          // 2. Проиграл этот матч
                          if (isMatchFinished) {
                              if (cleanPicked === cleanWinner) {
                                  return { className: `${cls} ${styles.correct}`, hint: null };
                              } else {
                                  return { 
                                      className: `${cls} ${styles.incorrect}`, 
                                      hint: realWinner 
                                  };
                              }
                          }

                          // 3. Активный (ждет игры)
                          return { className: `${cls} ${styles.selected}`, hint: null };
                      }

                      // Просто выбор (до начала)
                      if (!isLiveOrClosed && isPicked) {
                          return { className: `${cls} ${styles.selected}`, hint: null };
                      }

                      return { className: cls, hint: null };
                  };

                  // --- CHAMPION ---
                  if (isChampionRound) {
                     // Если я не участвую, показываем реального победителя или TBD
                     const championName = (!hasPicks && isLiveOrClosed) ? (match.actual_winner || 'TBD') : (match.predicted_winner || 'TBD');
                     const realChampSlot = match.player1?.name || 'TBD';
                     
                     const state = getPlayerState(championName, !!match.predicted_winner, realChampSlot);

                     return (
                        <div key={match.id} className={styles.championWrapper}>
                            <div className={`${styles.championContainer}`} style={{ 
                                border: 'none', 
                                background: state.className.includes('correct') ? 'rgba(48, 209, 88, 0.15)' : 
                                            state.className.includes('incorrect') ? 'rgba(255, 69, 58, 0.15)' : 
                                            state.className.includes('selected') ? '#152230' : '#1E1E1E'
                            }}>
                                <div className={state.className} style={{ height: '60px', cursor: 'default', borderRadius: '12px', background: 'transparent' }}>
                                    <div className={styles.playerInfo}>
                                        <span className={styles.playerName} style={{ fontSize: '16px' }}>
                                            {championName}
                                        </span>
                                        {state.hint && (
                                            <div className={styles.correctionText}>
                                                → <span>{state.hint}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className={styles.checkIcon}><TrophyIcon /></div>
                                </div>
                            </div>
                        </div>
                     );
                  }

                  // --- REGULAR MATCH ---
                  
                  // Определяем отображаемое имя (может быть "призрак")
                  let p1NameDisplay = p1Name;
                  const p2NameDisplay = p2Name;
                  
                  let p1State = getPlayerState(p1Name, myPick === p1Name, p1Name);
                  const p2State = getPlayerState(p2Name, myPick === p2Name, p2Name);

                  // Логика "Призрака": Мой игрок вылетел раньше, показываем его вместо реального P1 (условно)
                  if (!isFirstRound && hasPicks && myPick && 
                      cleanName(myPick) !== cleanName(p1Name) && 
                      cleanName(myPick) !== cleanName(p2Name) &&
                      p1Name !== 'TBD' && p2Name !== 'TBD'
                  ) {
                      p1NameDisplay = myPick;
                      p1State = { 
                          className: `${styles.playerRow} ${styles.incorrect}`, 
                          hint: p1Name // Подсказка: "Тут на самом деле P1"
                      };
                  }

                  return (
                    <div key={match.id} className={styles.matchWrapper}>
                      <div className={styles.matchContainer}>
                        {/* P1 */}
                        <div 
                          className={p1State.className}
                          onClick={() => !isLiveOrClosed && p1Name !== 'TBD' && handlePick(selectedRound!, match.id, p1.name)}
                        >
                          <div className={styles.playerInfo}>
                              <span className={styles.playerName}>{p1NameDisplay}</span>
                              {/* Seed только если это реальный игрок */}
                              {p1NameDisplay === p1Name && <span className={styles.playerSeed}>{p1.seed ? `[${p1.seed}]` : ''}</span>}
                              
                              {p1State.hint && (
                                  <div className={styles.correctionText}>
                                      → <span>{p1State.hint}</span>
                                  </div>
                              )}
                          </div>
                          <div className="flex gap-2 mr-2">
                             {scores.map((s, i) => {
                                 const val = getSetScore(s, 0);
                                 if (!val) return null;
                                 return <span key={i} className="text-[11px] font-mono text-[#8E8E93]">{val}</span>
                             })}
                          </div>
                          {/* Галочка только для моего пика */}
                          {myPick === p1NameDisplay && !isMatchFinished && <div className={styles.checkIcon}><CheckIcon/></div>}
                        </div>

                        {/* P2 */}
                        <div 
                          className={p2State.className}
                          onClick={() => !isLiveOrClosed && p2Name !== 'TBD' && handlePick(selectedRound!, match.id, p2.name)}
                        >
                           <div className={styles.playerInfo}>
                              <span className={styles.playerName}>{p2NameDisplay}</span>
                              <span className={styles.playerSeed}>{p2.seed ? `[${p2.seed}]` : ''}</span>
                           </div>
                           <div className="flex gap-2 mr-2">
                             {scores.map((s, i) => {
                                 const val = getSetScore(s, 1);
                                 if (!val) return null;
                                 return <span key={i} className="text-[11px] font-mono text-[#8E8E93]">{val}</span>
                             })}
                           </div>
                           {myPick === p2NameDisplay && !isMatchFinished && <div className={styles.checkIcon}><CheckIcon/></div>}
                        </div>
                      </div>
                      {selectedRound !== 'F' && <div className={styles.bracketConnector} />}
                    </div>
                  );
                })
              ) : (
                  <div className="flex h-full items-center justify-center py-20"><p className="text-[#5F6067] text-sm">Нет матчей</p></div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {!isLiveOrClosed && (
        <div className={styles.footer}>
             <SaveButton onClick={handleSave} status={saveStatus} />
        </div>
      )}
    </div>
  );
}