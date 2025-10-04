'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
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

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log('BracketPage useEffect:', { tournament, bracket, selectedRound }); // Отладка
    if (!selectedRound && tournament?.starting_round) {
      console.log('Setting selectedRound to starting_round:', tournament.starting_round);
      setSelectedRound(tournament.starting_round);
    }
  }, [tournament, bracket, selectedRound, setSelectedRound]);

  useEffect(() => {
    if (scrollContainerRef.current && selectedRound) {
      const roundIndex = rounds.indexOf(selectedRound);
      if (roundIndex !== -1) {
        const roundElement = scrollContainerRef.current.children[roundIndex] as HTMLElement;
        if (roundElement) {
          roundElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
        }
      }
    }
  }, [selectedRound, rounds]);

  if (isLoading) return <p>Загрузка...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!tournament || !selectedRound) return <p>Ожидание данных турнира...</p>;

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
      <div className={styles.box}>
        <div className={styles.rectangle}>
          <div className={styles.scrollContainer} ref={scrollContainerRef}>
            {rounds.map((round, index) => (
              <div key={round} className={styles.roundContainer}>
                <div className={styles.roundTitle}>{round}</div>
                <ul className={styles.matchList}>
                  {bracket[round]?.length > 0 ? (
                    bracket[round].map((match) => (
                      <li key={match.id} className={styles.matchItem}>
                        <div className={styles.matchCard}>
                          <div
                            className={`${styles.player} ${match.predicted_winner === match.player1?.name ? styles.selectedPlayer : ''}`}
                            onClick={() => tournament.status === 'ACTIVE' && match.player1?.name && match.player1.name !== 'Bye' && handlePick(round, match.id, match.player1.name)}
                          >
                            <p>{match.player1?.name || 'TBD'} {match.player1?.seed ? `(${match.player1.seed})` : ''}</p>
                          </div>
                          <div
                            className={`${styles.player} ${match.predicted_winner === match.player2?.name ? styles.selectedPlayer : ''}`}
                            onClick={() => tournament.status === 'ACTIVE' && match.player2?.name && match.player2.name !== 'Bye' && handlePick(round, match.id, match.player2.name)}
                          >
                            <p>{match.player2?.name || 'TBD'} {match.player2?.seed ? `(${match.player2.seed})` : ''}</p>
                          </div>
                        </div>
                      </li>
                    ))
                  ) : (
                    <p className={styles.noMatches}>Нет матчей для отображения</p>
                  )}
                </ul>
                {index < rounds.length - 1 && <div className={styles.connectorLine}></div>}
              </div>
            ))}
          </div>
        </div>
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