'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollMenu, VisibilityContext } from 'react-horizontal-scrolling-menu';
import 'react-horizontal-scrolling-menu/dist/styles.css';
import styles from './BracketPage.module.css';
import { useTournamentLogic } from '../hooks/useTournamentLogic';

export default function BracketPage({ id }: { id: string }) {
  const router = useRouter();
  const {
    tournament,
    bracket,
    hasPicks,
    error,
    isLoading,
    selectedRound,
    setSelectedRound,
    rounds,
    handlePick,
    savePicks,
  } = useTournamentLogic({ id });

  useEffect(() => {
    console.log('BracketPage useEffect:', { tournament, bracket, selectedRound });
    if (!selectedRound && tournament?.starting_round) {
      console.log('Setting selectedRound to starting_round:', tournament.starting_round);
      setSelectedRound(tournament.starting_round);
    }
  }, [tournament, bracket, selectedRound, setSelectedRound]);

  if (isLoading) return <p>Загрузка...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!tournament || !selectedRound) return <p>Ожидание данных турнира...</p>;

  const onWheel = (apiObj: typeof VisibilityContext, ev: WheelEvent): void => {
    const isThrottled = !apiObj.visibleElementsWithSeparators.length;
    if (isThrottled) return;
    ev.preventDefault();

    if (ev.deltaY < 0) {
      apiObj.scrollPrev();
    } else if (ev.deltaY > 0) {
      apiObj.scrollNext();
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={() => router.back()} className={styles.backButton}>←</button>
        <h2 className={styles.tournamentTitle}>{tournament.name}</h2>
      </div>
      <div className={styles.rounds}>
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
      <ScrollMenu onWheel={onWheel}>
        <div className={styles.bracketWrapper}>
          {rounds.map((round, index) => (
            <motion.div
              key={round}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className={styles.roundColumn}
            >
              <div className={styles.roundTitle}>{round}</div>
              <AnimatePresence>
                {selectedRound === round && bracket[round]?.length > 0 ? (
                  bracket[round].map((match) => (
                    <motion.li
                      key={match.id}
                      className={styles.matchItem}
                      initial={{ scale: 1 }}
                      animate={{ scale: match.predicted_winner ? 1.02 : 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className={styles.matchCard}>
                        <div
                          className={styles.player}
                          onClick={() => handlePick(round, match.id, match.player1.name)}
                          style={{
                            backgroundColor: match.predicted_winner === match.player1.name ? '#00B2FF' : '#333',
                          }}
                        >
                          <p>{match.player1.name} {match.player1.seed ? `(${match.player1.seed})` : ''}</p>
                        </div>
                        <div
                          className={styles.player}
                          onClick={() => handlePick(round, match.id, match.player2.name)}
                          style={{
                            backgroundColor: match.predicted_winner === match.player2.name ? '#00B2FF' : '#333',
                          }}
                        >
                          <p>{match.player2.name} {match.player2.seed ? `(${match.player2.seed})` : ''}</p>
                        </div>
                      </div>
                    </motion.li>
                  ))
                ) : (
                  selectedRound === round && <p>Нет матчей для отображения</p>
                )}
              </AnimatePresence>
              {index < rounds.length - 1 && (
                <svg className={styles.connectorLine}>
                  <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#4C4C4C" strokeWidth="2" />
                </svg>
              )}
            </motion.div>
          ))}
        </div>
      </ScrollMenu>
      {tournament.status === 'ACTIVE' && (
        <button
          onClick={savePicks}
          disabled={!hasPicks}
          className={hasPicks ? styles.saveButton : `${styles.saveButton} ${styles.disabled}`}
        >
          Сохранить пики
        </button>
      )}
    </div>
  );
}