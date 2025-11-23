'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion'; // Убрали AnimatePresence
// Убрали import toast
import styles from './BracketPage.module.css';
import { useTournamentLogic } from '../hooks/useTournamentLogic';
import { useState } from 'react';

// Иконка стрелки (SVG)
const BackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M19 12H5" stroke="#5F6067" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 19L5 12L12 5" stroke="#5F6067" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function BracketPage({ id }: { id: string }) {
  const router = useRouter();
  const {
    tournament,
    bracket,
    // hasPicks, // Убрали, так как не используем
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

  // Функция обработки сохранения с визуальным эффектом
  const onSaveClick = async () => {
    setIsSaving(true);
    await savePicks();
    // Имитация задержки для красоты
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
           {tournament.name} | Турнирная сетка
        </h2>
      </div>

      {/* Баннер-заглушка */}
      <div className="w-full px-6 mb-6">
         <div className="w-full h-[120px] bg-[#1E1E1E] rounded-[20px] animate-pulse border border-white/5"></div>
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

      {/* 3. Bracket Grid (Vertical Scroll) */}
      <div className={styles.matchList}>
        {bracket[selectedRound]?.length > 0 ? (
          // Убрали index из аргументов map
          bracket[selectedRound].map((match) => {
            const p1 = match.player1;
            const p2 = match.player2;
            
            const p1Name = p1?.name || 'TBD';
            const p2Name = p2?.name || 'TBD';
            
            // Логика выбора (Пользователь нажал)
            const isP1Picked = match.predicted_winner === p1Name;
            const isP2Picked = match.predicted_winner === p2Name;

            // Логика правильного ответа
            const realWinner = match.actual_winner;
            
            // P1 Styles
            let p1StyleClass = styles.playerCard;
            if (!isLiveOrClosed && isP1Picked) p1StyleClass += ` ${styles.selected}`;
            if (isLiveOrClosed) {
                if (isP1Picked && realWinner === p1Name) p1StyleClass += ` ${styles.correct}`;
                if (isP1Picked && realWinner && realWinner !== p1Name) p1StyleClass += ` ${styles.incorrect}`;
            }
            if (p1Name === 'TBD') p1StyleClass += ` ${styles.tbd}`;

            // P2 Styles
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
                    <div className="flex items-center overflow-hidden">
                        {/* Если ответ неверный и это был наш выбор -> зачеркиваем */}
                        <span className={isLiveOrClosed && isP1Picked && realWinner && realWinner !== p1Name ? styles.strikethrough : "truncate"}>
                             {p1Name}
                        </span>
                        {/* Подсказка правильного, если мы ошиблись */}
                        {isLiveOrClosed && isP1Picked && realWinner && realWinner !== p1Name && (
                            <span className={styles.correctAnswerHint}>{realWinner}</span>
                        )}
                    </div>
                    {/* Seed можно добавить здесь, если он есть в player1.seed */}
                  </motion.div>

                  {/* Игрок 2 */}
                  <motion.div 
                    whileTap={{ scale: !isLiveOrClosed ? 0.98 : 1 }}
                    className={p2StyleClass}
                    onClick={() => !isLiveOrClosed && p2Name !== 'TBD' && p2Name !== 'Bye' && handlePick(selectedRound!, match.id, p2Name)}
                  >
                     <div className="flex items-center overflow-hidden">
                        <span className={isLiveOrClosed && isP2Picked && realWinner && realWinner !== p2Name ? styles.strikethrough : "truncate"}>
                             {p2Name}
                        </span>
                        {isLiveOrClosed && isP2Picked && realWinner && realWinner !== p2Name && (
                            <span className={styles.correctAnswerHint}>{realWinner}</span>
                        )}
                     </div>
                  </motion.div>
                </div>

                {/* Визуальная скобка (соединитель) */}
                {selectedRound !== 'F' && selectedRound !== 'Champion' && (
                   <div className={styles.bracketConnector}></div>
                )}
              </div>
            );
          })
        ) : (
            <p className="text-center text-[#5F6067] mt-10">Матчи этого раунда еще не определены</p>
        )}
      </div>

      {/* 4. Кнопка Сохранить */}
      {!isLiveOrClosed && (
        <div className={styles.footer}>
            <motion.button
                onClick={onSaveClick}
                whileTap={{ scale: 1.05 }}
                initial={{ scale: 1 }}
                animate={{ scale: isSaving ? 1.05 : 1 }}
                className={isSaving ? styles.saveButtonActive : styles.saveButton}
            >
                {isSaving ? 'СОХРАНЕНО!' : 'Сохранить'}
            </motion.button>
        </div>
      )}
    </div>
  );
}