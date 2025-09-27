'use client';

import MatchListActive from './MatchListActive';
import MatchListClosed from './MatchListClosed';
import styles from './BracketPage.module.css';
import { useTournamentLogic } from '../hooks/useTournamentLogic';

export default function BracketPage({ id }: { id: string }) {
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
    comparison,
  } = useTournamentLogic({ id });

  if (isLoading) return <p>Загрузка...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!tournament) return <p>Турнир не найден</p>;

  console.log('Bracket data:', bracket); // Отладка

  return (
    <div className={styles.container}>
      <h2 className={styles.tournamentTitle}>{tournament.name}</h2>
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
            {tournament.status === 'ACTIVE' ? (
              <MatchListActive
                bracket={bracket}
                handlePick={handlePick}
                selectedRound={round}
              />
            ) : (
              <MatchListClosed
                bracket={bracket}
                comparison={comparison || []}
                selectedRound={round}
              />
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