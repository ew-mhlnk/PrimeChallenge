'use client';

import { useTournamentLogic } from '@/hooks/useTournamentLogic';
import MatchListActive from './MatchListActive';
import MatchListClosed from './MatchListClosed';
import styles from './BracketPage.module.css';

interface BracketPageProps {
  params: { id: string };
}

export default function BracketPage({ params }: BracketPageProps) {
  const {
    tournament,
    bracket,
    hasPicks,
    handlePick,
    savePicks,
    error,
    isLoading,
    comparison,
    selectedRound,
    setSelectedRound,
    rounds,
  } = useTournamentLogic({ id: params.id });

  if (isLoading) return <div>Загрузка...</div>;
  if (error) return <div>Ошибка: {error}</div>;
  if (!tournament) return <div>Турнир не найден</div>;

  const isActive = tournament.status === 'ACTIVE';

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <a href="/tournaments" className={styles.backArrow}>
          ←
        </a>
        <h1 className={styles.tournamentTitle}>{tournament.name} | Турнирная сетка</h1>
      </div>
      <div className={styles.banner} />
      <div className={styles.rounds}>
        {rounds.map((round) => (
          <button
            key={round}
            className={selectedRound === round ? styles.activeRound : styles.inactiveRound}
            onClick={() => setSelectedRound(round)}
          >
            {round}
          </button>
        ))}
      </div>
      {tournament.status === 'CLOSED' && !hasPicks ? (
        <div className={styles.noPicksMessage}>Вы не принимали участие в турнире</div>
      ) : isActive ? (
        <MatchListActive
          bracket={bracket}
          handlePick={handlePick}
          savePicks={savePicks}
          selectedRound={selectedRound}
        />
      ) : (
        <MatchListClosed
          bracket={bracket}
          comparison={comparison}
          selectedRound={selectedRound}
        />
      )}
    </div>
  );
}