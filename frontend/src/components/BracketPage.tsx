'use client';

import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, Variants, PanInfo } from 'framer-motion';
import styles from './BracketPage.module.css';
import { useTournamentLogic } from '../hooks/useTournamentLogic';
import { useState } from 'react';

// --- ИКОНКИ ---
const BackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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

// --- АНИМАЦИЯ ---
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
  type: "spring",
  stiffness: 400,
  damping: 30,
  mass: 1
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
  } = useTournamentLogic({ id });
  
  const [isSaving, setIsSaving] = useState(false);
  const [direction, setDirection] = useState(0);

  if (isLoading) return <div className="flex justify-center pt-20 text-[#5F6067]">Загрузка...</div>;
  if (error) return <div className="text-red-500 text-center pt-10">{error}</div>;
  if (!tournament || !selectedRound) return null;

  const isLiveOrClosed = tournament.status !== 'ACTIVE';

  const changeRound = (newRound: string) => {
    const currentIndex = rounds.indexOf(selectedRound);
    const newIndex = rounds.indexOf(newRound);
    if (currentIndex === newIndex) return;
    
    setDirection(newIndex > currentIndex ? 1 : -1);
    setSelectedRound(newRound);
  };

  const onSaveClick = async () => {
    setIsSaving(true);
    await savePicks();
    setTimeout(() => setIsSaving(false), 1000);
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const currentIndex = rounds.indexOf(selectedRound);
    const threshold = 50;

    if (info.offset.x < -threshold && currentIndex < rounds.length - 1) {
      changeRound(rounds[currentIndex + 1]);
    } else if (info.offset.x > threshold && currentIndex > 0) {
      changeRound(rounds[currentIndex - 1]);
    }
  };

  const isChampionRound = selectedRound === 'Champion';

  return (
    <div className={styles.container}>
      
      {/* Header */}
      <div className={styles.header}>
        <button onClick={() => router.back()} className={styles.backArrow}>
          <BackIcon />
        </button>
        <h2 className={styles.tournamentTitle}>{tournament.name}</h2>
      </div>

      {/* Banner */}
      <div className="w-full px-6 mb-4 shrink-0">
         <div className="w-full h-[80px] bg-[#D9D9D9] rounded-[16px] opacity-90"></div>
      </div>

      {/* Rounds Navigation */}
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

      {/* Bracket Window */}
      <div className={styles.bracketWindow}>
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
              dragElastic={0.1}
              onDragEnd={handleDragEnd}
              className={styles.sliderWrapper}
            >
              {bracket[selectedRound]?.length > 0 ? (
                bracket[selectedRound].map((match) => {
                  
                  // --- CHAMPION ROUND ---
                  if (isChampionRound) {
                     const championName = match.actual_winner || match.predicted_winner || match.player1?.name || 'TBD';
                     return (
                        <div key={match.id} className="w-full flex justify-center py-10">
                            <div className={styles.championContainer}>
                                <div className="mr-2 text-[#FFD700]"><TrophyIcon /></div>
                                <div className="flex flex-col items-center">
                                    <span className={styles.championLabel}>Winner</span>
                                    <span className={styles.championName}>{championName}</span>
                                </div>
                            </div>
                        </div>
                     );
                  }

                  // --- REGULAR MATCH ---
                  const p1 = match.player1;
                  const p2 = match.player2;
                  const p1Name = p1?.name || 'TBD';
                  const p2Name = p2?.name || 'TBD';
                  const isP1Picked = match.predicted_winner === p1Name;
                  const isP2Picked = match.predicted_winner === p2Name;
                  const realWinner = match.actual_winner;
                  
                  const getPlayerClass = (name: string, isPicked: boolean) => {
                      let cls = styles.playerRow;
                      if (name === 'TBD') return `${cls} ${styles.tbd}`;
                      if (!isLiveOrClosed && isPicked) cls += ` ${styles.selected}`;
                      if (isLiveOrClosed) {
                          if (isPicked && realWinner === name) cls += ` ${styles.correct}`;
                          if (isPicked && realWinner && realWinner !== name) cls += ` ${styles.incorrect}`;
                      }
                      return cls;
                  };

                  return (
                    <div key={match.id} className={styles.matchWrapper}>
                      <div className={styles.matchContainer}>
                        {/* Player 1 */}
                        <div 
                          className={getPlayerClass(p1Name, isP1Picked)}
                          onClick={() => !isLiveOrClosed && p1Name !== 'TBD' && p1Name !== 'Bye' && handlePick(selectedRound!, match.id, p1Name)}
                        >
                          <div className={styles.playerInfo}>
                              <span className={styles.playerName}>{p1Name}</span>
                              {!isLiveOrClosed && isP1Picked && <div className={styles.checkIcon}><CheckIcon/></div>}
                          </div>
                          <span className={styles.playerSeed}>{p1.seed || ''}</span>
                        </div>

                        {/* Player 2 */}
                        <div 
                          className={getPlayerClass(p2Name, isP2Picked)}
                          onClick={() => !isLiveOrClosed && p2Name !== 'TBD' && p2Name !== 'Bye' && handlePick(selectedRound!, match.id, p2Name)}
                        >
                           <div className={styles.playerInfo}>
                              <span className={styles.playerName}>{p2Name}</span>
                              {!isLiveOrClosed && isP2Picked && <div className={styles.checkIcon}><CheckIcon/></div>}
                           </div>
                           <span className={styles.playerSeed}>{p2.seed || ''}</span>
                        </div>
                      </div>

                      {/* Connector Line */}
                      {selectedRound !== 'F' && <div className={styles.connectorLine} />}
                    </div>
                  );
                })
              ) : (
                  <div className="flex h-full items-center justify-center py-20">
                    <p className="text-[#5F6067] text-sm">Нет матчей</p>
                  </div>
              )}
            </motion.div>
          </AnimatePresence>
          
          <div style={{ height: '80px' }} />
        </div>
      </div>

      {/* Footer */}
      {!isLiveOrClosed && (
        <div className={styles.footer}>
            <motion.button
                onClick={onSaveClick}
                whileTap={{ scale: 0.95 }}
                className={styles.saveButton}
                style={{ backgroundColor: isSaving ? '#32D74B' : '#007AFF' }}
            >
                {isSaving ? 'Сохранено' : 'Сохранить'}
            </motion.button>
        </div>
      )}
    </div>
  );
}