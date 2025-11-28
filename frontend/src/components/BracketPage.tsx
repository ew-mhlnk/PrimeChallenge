'use client';

import { useRouter } from 'next/navigation';
// 1. Добавляем импорт типа Variants
import { motion, AnimatePresence, Variants } from 'framer-motion';
import styles from './BracketPage.module.css';
import { useTournamentLogic } from '../hooks/useTournamentLogic';
import { useState } from 'react';

const BackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6"/>
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

// 2. Явно указываем тип Variants
const variants: Variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '110%' : '-110%',
    opacity: 1,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? '110%' : '-110%',
    opacity: 1,
    position: 'absolute',
    top: 0,
    width: '100%',
  })
};

const transitionSettings = {
  x: { type: "spring", stiffness: 300, damping: 30 },
  opacity: { duration: 0.2 }
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
    setDirection(newIndex > currentIndex ? 1 : -1);
    setSelectedRound(newRound);
  };

  const onSaveClick = async () => {
    setIsSaving(true);
    await savePicks();
    setTimeout(() => setIsSaving(false), 1000);
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
              // 3. Убираем "as any", теперь типы совпадают
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={transitionSettings}
              className={styles.sliderWrapper}
            >
              {bracket[selectedRound]?.length > 0 ? (
                bracket[selectedRound].map((match) => {
                  
                  // CHAMPION ROUND
                  if (isChampionRound) {
                     const championName = match.actual_winner || match.predicted_winner || match.player1?.name || 'TBD';
                     return (
                        <div key={match.id} className="w-full flex justify-center py-10 px-4">
                            <div className={styles.championContainer}>
                                <TrophyIcon />
                                <span className={styles.championLabel}>Winner</span>
                                <span className={styles.championName}>{championName}</span>
                            </div>
                        </div>
                     );
                  }

                  // REGULAR MATCH
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
                        {/* Игрок 1 */}
                        <div 
                          className={getPlayerClass(p1Name, isP1Picked)}
                          onClick={() => !isLiveOrClosed && p1Name !== 'TBD' && p1Name !== 'Bye' && handlePick(selectedRound!, match.id, p1Name)}
                        >
                          <div className={styles.playerInfo}>
                              <span className={styles.playerName}>{p1Name}</span>
                          </div>
                          <span className={styles.playerSeed}>{p1.seed || ''}</span>
                        </div>

                        {/* Игрок 2 */}
                        <div 
                          className={getPlayerClass(p2Name, isP2Picked)}
                          onClick={() => !isLiveOrClosed && p2Name !== 'TBD' && p2Name !== 'Bye' && handlePick(selectedRound!, match.id, p2Name)}
                        >
                           <div className={styles.playerInfo}>
                              <span className={styles.playerName}>{p2Name}</span>
                           </div>
                           <span className={styles.playerSeed}>{p2.seed || ''}</span>
                        </div>
                      </div>

                      {/* Линия к следующему раунду */}
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
        </div>
      </div>

      {/* Footer */}
      <div className={styles.footer}>
         {!isLiveOrClosed && (
            <motion.button
                onClick={onSaveClick}
                whileTap={{ scale: 0.95 }}
                className={styles.saveButton}
                style={{ backgroundColor: isSaving ? '#32D74B' : '#007AFF' }}
            >
                {isSaving ? 'Сохранено' : 'Сохранить'}
            </motion.button>
         )}
      </div>
    </div>
  );
}