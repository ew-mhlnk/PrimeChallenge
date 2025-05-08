'use client';

import { useTournamentLogic } from '@/hooks/useTournamentLogic';
import { Match } from '@/types'; // Импорт интерфейса Match
import styles from './BracketPage.module.css';

interface BracketPageProps {
  params: { id: string };
}

export default function BracketPage({ params }: BracketPageProps) {
  const {
    tournament,
    matches,
    picks,
    handlePick,
    savePicks,
    error,
    isLoading,
    comparison,
    selectedRound,
    setSelectedRound,
    rounds,
  } = useTournamentLogic({
    id: params.id,
  });

  if (isLoading) return <div>Загрузка...</div>;
  if (error) return <div>Ошибка: {error}</div>;
  if (!tournament) return <div>Турнир не найден</div>;

  const renderMatch = (match: Match, index: number) => {
    const userPick = picks.find(
      (p) => p.round === match.round && p.match_number === match.match_number
    );
    const compResult = comparison.find(
      (c) => c.round === match.round && c.match_number === match.match_number
    );

    const isSelected = userPick?.predicted_winner;
    const isCorrect = compResult?.correct;
    const isIncorrect = compResult && !compResult.correct;

    return (
      <div key={index} className={styles.matchContainer}>
        <div
          className={`${styles.playerCell} ${isSelected && userPick?.predicted_winner === match.player1 ? styles.selectedPlayer : ''} ${isCorrect && compResult?.actual_winner === match.player1 ? styles.correctPick : ''} ${isIncorrect && compResult?.actual_winner === match.player1 ? styles.incorrectPick : ''}`}
          onClick={() => handlePick(match, match.player1)}
        >
          {match.player1 || 'TBD'}
        </div>
        <div
          className={`${styles.playerCell} ${isSelected && userPick?.predicted_winner === match.player2 ? styles.selectedPlayer : ''} ${isCorrect && compResult?.actual_winner === match.player2 ? styles.correctPick : ''} ${isIncorrect && compResult?.actual_winner === match.player2 ? styles.incorrectPick : ''}`}
          onClick={() => handlePick(match, match.player2)}
        >
          {match.player2 || 'TBD'}
        </div>
        {isIncorrect && compResult?.actual_winner && (
          <div className={styles.actualWinner}>
            Фактический победитель: {compResult.actual_winner}
          </div>
        )}
      </div>
    );
  };

  const renderRound = (round: string) => {
    const roundMatches = matches.filter((m) => m.round === round).sort((a, b) => a.match_number - b.match_number);
    return (
      <div key={round} className={`${styles.round} ${selectedRound === round ? styles.activeRound : styles.inactiveRound}`}>
        <h3 onClick={() => setSelectedRound(round)}>{round}</h3>
        {roundMatches.map((match, index) => renderMatch(match, index))}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <a href="/tournaments" className={styles.backArrow}>
          ←
        </a>
        <h1>{tournament.name}</h1>
      </div>
      <div className={styles.banner} />
      <div className={styles.rounds}>
        {rounds.map(renderRound)}
      </div>
      {tournament.status === 'ACTIVE' && (
        <button onClick={savePicks} className={styles.saveButton}>
          Сохранить пики
        </button>
      )}
    </div>
  );
}