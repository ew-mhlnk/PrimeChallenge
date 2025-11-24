'use client';

import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './BracketPage.module.css';
import { useTournamentLogic } from '../hooks/useTournamentLogic';
import { useState } from 'react';

// Иконка стрелки
const BackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M19 12H5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 19L5 12L12 5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

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

  if (isLoading) return <div className="flex justify-center pt-20 text-[#5F6067]">Загрузка...</div>;
  if (error) return <div className="text-red-500 text-center pt-10">{error}</div>;
  if (!tournament || !selectedRound) return null;

  const isLiveOrClosed = tournament.status !== 'ACTIVE';

  const onSaveClick = async () => {
    setIsSaving(true);
    await savePicks();
    setTimeout(() => setIsSaving(false), 1000);
  };

  // Варианты анимации для списка матчей
  const matchesVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
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

      {/* Баннер-заглушка (серый прямоугольник из скриншота) */}
      <div className="w-full px-6 mb-6">
         <div className="w-full h-[140px] bg-[#D9D9D9] rounded-[29px]"></div>
      </div>

      {/* 2. Rounds Navigation */}
      <div className={styles.roundsContainer}>
        {rounds.map((round) => (
          <button
            key={round}
            onClick={() => setSelectedRound(round)}
            className={selectedRound === round ? styles.activeRound : styles.inactiveRound}
          >
            {round}
          </button>
        ))}
      </div>

      {/* 3. Bracket Container (Окно с сеткой) */}
      <div className={styles.bracketWindow}>
        <div className={styles.scrollArea}>
          
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedRound} // Ключ важен для перезапуска анимации
              variants={matchesVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className={styles.matchList}
            >
              {bracket[selectedRound]?.length > 0 ? (
                bracket[selectedRound].map((match) => {
                  const p1 = match.player1;
                  const p2 = match.player2;
                  
                  const p1Name = p1?.name || 'TBD';
                  const p2Name = p2?.name || 'TBD';
                  
                  // Логика выбора и стилей
                  const isP1Picked = match.predicted_winner === p1Name;
                  const isP2Picked = match.predicted_winner === p2Name;
                  const realWinner = match.actual_winner;
                  
                  let p1StyleClass = styles.playerCard;
                  if (!isLiveOrClosed && isP1Picked) p1StyleClass += ` ${styles.selected}`;
                  if (isLiveOrClosed) {
                      if (isP1Picked && realWinner === p1Name) p1StyleClass += ` ${styles.correct}`;
                      if (isP1Picked && realWinner && realWinner !== p1Name) p1StyleClass += ` ${styles.incorrect}`;
                  }
                  if (p1Name === 'TBD') p1StyleClass += ` ${styles.tbd}`;

                  let p2StyleClass = styles.playerCard;
                  if (!isLiveOrClosed && isP2Picked) p2StyleClass += ` ${styles.selected}`;
                  if (isLiveOrClosed) {
                      if (isP2Picked && realWinner === p2Name) p2StyleClass += ` ${styles.correct}`;
                      if (isP2Picked && realWinner && realWinner !== p2Name) p2StyleClass += ` ${styles.incorrect}`;
                  }
                  if (p2Name === 'TBD') p2StyleClass += ` ${styles.tbd}`;

                  return (
                    <div key={match.id} className={styles.matchWrapper}>
                      <div className={styles.matchContainer}>
                        {/* Игрок 1 */}
                        <motion.div 
                          whileTap={{ scale: !isLiveOrClosed ? 0.98 : 1 }}
                          className={p1StyleClass}
                          onClick={() => !isLiveOrClosed && p1Name !== 'TBD' && p1Name !== 'Bye' && handlePick(selectedRound!, match.id, p1Name)}
                        >
                          <div className={styles.playerInfo}>
                              {p1.seed && <span className={styles.seed}>{p1.seed}</span>}
                              <span className={isLiveOrClosed && isP1Picked && realWinner && realWinner !== p1Name ? styles.strikethrough : "truncate"}>
                                  {p1Name}
                              </span>
                          </div>
                          {isLiveOrClosed && isP1Picked && realWinner && realWinner !== p1Name && (
                              <span className={styles.correctAnswerHint}>Win: {realWinner}</span>
                          )}
                        </motion.div>

                        {/* Игрок 2 */}
                        <motion.div 
                          whileTap={{ scale: !isLiveOrClosed ? 0.98 : 1 }}
                          className={p2StyleClass}
                          onClick={() => !isLiveOrClosed && p2Name !== 'TBD' && p2Name !== 'Bye' && handlePick(selectedRound!, match.id, p2Name)}
                        >
                           <div className={styles.playerInfo}>
                              {p2.seed && <span className={styles.seed}>{p2.seed}</span>}
                              <span className={isLiveOrClosed && isP2Picked && realWinner && realWinner !== p2Name ? styles.strikethrough : "truncate"}>
                                  {p2Name}
                              </span>
                           </div>
                           {isLiveOrClosed && isP2Picked && realWinner && realWinner !== p2Name && (
                              <span className={styles.correctAnswerHint}>Win: {realWinner}</span>
                          )}
                        </motion.div>
                      </div>

                      {/* Скобка (рисуем только если это не финал) */}
                      {selectedRound !== 'F' && selectedRound !== 'Champion' && (
                         <div className={styles.bracketConnector}></div>
                      )}
                    </div>
                  );
                })
              ) : (
                  <p className="text-center text-[#5F6067] mt-10">Нет матчей</p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* 4. Кнопка Сохранить (Фиксирована внизу) */}
      {!isLiveOrClosed && (
        <div className={styles.footer}>
            <motion.button
                onClick={onSaveClick}
                whileTap={{ scale: 0.95 }} // Эффект нажатия без изменения формы
                className={`${styles.saveButton} ${isSaving ? styles.saveButtonSaving : ''}`}
                animate={{
                   backgroundColor: isSaving ? '#00B3FF' : '#1B1B1B',
                   borderColor: isSaving ? '#00B3FF' : 'rgba(255, 255, 255, 0.18)'
                }}
            >
                {isSaving ? 'Сохранено!' : 'Сохранить'}
            </motion.button>
        </div>
      )}
    </div>
  );
}