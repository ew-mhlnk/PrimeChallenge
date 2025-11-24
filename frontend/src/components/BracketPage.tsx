'use client';

import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './BracketPage.module.css';
import { useTournamentLogic } from '../hooks/useTournamentLogic';
import { useState } from 'react';

// Иконки
const BackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M19 12H5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 19L5 12L12 5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 6L9 17L4 12" stroke="#00B3FF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 50 : -50, // Уменьшил амплитуду для большей плавности
    opacity: 0
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 50 : -50,
    opacity: 0
  })
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

  return (
    <div className={styles.container}>
      
      {/* 1. Header */}
      <div className={styles.header}>
        <button onClick={() => router.back()} className={styles.backArrow}>
          <BackIcon />
        </button>
        <h2 className={styles.tournamentTitle}>
           {tournament.name} | Сетка
        </h2>
      </div>

      {/* Banner */}
      <div className="w-full px-6 mb-4 shrink-0">
         <div className="w-full h-[100px] bg-[#D9D9D9] rounded-[20px]"></div>
      </div>

      {/* 2. Rounds Navigation */}
      <div className={styles.roundsContainer}>
        {rounds.map((round) => (
          <button
            key={round}
            onClick={() => changeRound(round)}
            className={selectedRound === round ? styles.activeRound : styles.inactiveRound}
          >
            {round}
          </button>
        ))}
      </div>

      {/* 3. Bracket Container */}
      <div className={styles.bracketWindow}>
        <div className={styles.scrollArea}>
          
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={selectedRound}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 }
              }}
              layout // Магия: этот проп заставляет контейнер плавно менять высоту
              className={styles.matchList}
            >
              {bracket[selectedRound]?.length > 0 ? (
                bracket[selectedRound].map((match) => {
                  const p1 = match.player1;
                  const p2 = match.player2;
                  const p1Name = p1?.name || 'TBD';
                  const p2Name = p2?.name || 'TBD';
                  
                  const isP1Picked = match.predicted_winner === p1Name;
                  const isP2Picked = match.predicted_winner === p2Name;
                  const realWinner = match.actual_winner;
                  
                  // Функция для генерации классов
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
                    <div key={match.id} className={styles.battleWrapper}>
                      <div className={styles.matchContainer}>
                        
                        {/* Игрок 1 */}
                        <div 
                          className={getPlayerClass(p1Name, isP1Picked)}
                          onClick={() => !isLiveOrClosed && p1Name !== 'TBD' && p1Name !== 'Bye' && handlePick(selectedRound!, match.id, p1Name)}
                        >
                          <div className={styles.playerInfo}>
                              {/* Здесь можно добавить флаг, если он появится в базе */}
                              <span className={isLiveOrClosed && isP1Picked && realWinner && realWinner !== p1Name ? styles.strikethrough : styles.playerName}>
                                  {p1Name}
                              </span>
                              {/* Показываем галочку выбора */}
                              {!isLiveOrClosed && isP1Picked && <div className={styles.checkIcon}><CheckIcon/></div>}
                          </div>
                          <span className={styles.playerSeed}>{p1.seed ? p1.seed : ''}</span>
                        </div>

                        {/* Игрок 2 */}
                        <div 
                          className={getPlayerClass(p2Name, isP2Picked)}
                          onClick={() => !isLiveOrClosed && p2Name !== 'TBD' && p2Name !== 'Bye' && handlePick(selectedRound!, match.id, p2Name)}
                        >
                           <div className={styles.playerInfo}>
                              <span className={isLiveOrClosed && isP2Picked && realWinner && realWinner !== p2Name ? styles.strikethrough : styles.playerName}>
                                  {p2Name}
                              </span>
                              {!isLiveOrClosed && isP2Picked && <div className={styles.checkIcon}><CheckIcon/></div>}
                           </div>
                           <span className={styles.playerSeed}>{p2.seed ? p2.seed : ''}</span>
                        </div>

                      </div>

                      {/* Соединительная скобка */}
                      {selectedRound !== 'F' && selectedRound !== 'Champion' && (
                         <div className={styles.bracketConnector}></div>
                      )}
                    </div>
                  );
                })
              ) : (
                  <div className="flex h-full items-center justify-center py-10">
                    <p className="text-[#5F6067]">Нет матчей</p>
                  </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* 4. Footer */}
      <div className={styles.footer}>
         {!isLiveOrClosed && (
            <motion.button
                onClick={onSaveClick}
                whileTap={{ scale: 0.95 }}
                className={`${styles.saveButton} ${isSaving ? styles.saveButtonSaving : ''}`}
                animate={{
                   backgroundColor: isSaving ? '#00B3FF' : '#1B1B1B',
                   borderColor: isSaving ? '#00B3FF' : 'rgba(255, 255, 255, 0.18)'
                }}
            >
                {isSaving ? 'Сохранено!' : 'Сохранить'}
            </motion.button>
         )}
      </div>
    </div>
  );
}