'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation'; // Импорт для кнопки назад
import MatchListActive from './MatchListActive';
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
    console.log('BracketPage useEffect:', { tournament, bracket, selectedRound }); // Отладка
    if (!selectedRound && tournament?.starting_round) {
      console.log('Setting selectedRound to starting_round:', tournament.starting_round);
      setSelectedRound(tournament.starting_round);
    }
  }, [tournament, bracket, selectedRound, setSelectedRound]);

  if (isLoading) return <p>Загрузка...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!tournament || !selectedRound) return <p>Ожидание данных турнира...</p>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={() => router.back()} className={styles.backButton}>←</button> {/* Кнопка назад */}
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
      <div className={styles.bracketWrapper}>
        {rounds.map((round) => (
          <div key={round} className={styles.roundContainer}>
            <div className={styles.roundTitle}>{round}</div>
            {bracket[round]?.length > 0 ? (
              <MatchListActive
                bracket={bracket}
                handlePick={handlePick}
                selectedRound={round}
              />
            ) : (
              <p>Нет матчей для отображения</p>
            )}
          </div>
        ))}
      </div>
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