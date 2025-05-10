'use client';

import { useState, useEffect } from 'react';
import { BracketMatch } from '@/types';
import styles from './MatchListActive.module.css';

interface MatchListActiveProps {
  bracket: { [round: string]: { [matchNumber: number]: BracketMatch } };
  handlePick: (round: string, matchNumber: number, player: string) => void;
  savePicks: () => void;
  selectedRound: string | null;
}

export default function MatchListActive({
  bracket,
  handlePick,
  savePicks,
  selectedRound,
}: MatchListActiveProps) {
  const [displayBracket, setDisplayBracket] = useState<{ round: string; matchNumber: number; match: BracketMatch }[]>([]);

  useEffect(() => {
    if (!selectedRound || !bracket[selectedRound]) return;

    const matches = Object.entries(bracket[selectedRound]).map(([matchNum, match]) => ({
      round: selectedRound,
      matchNumber: parseInt(matchNum),
      match,
    }));
    setDisplayBracket(matches);
  }, [selectedRound, bracket]);

  const renderMatch = (item: { round: string; matchNumber: number; match: BracketMatch }) => {
    const { round, matchNumber, match } = item;
    return (
      <div key={`${round}-${matchNumber}`} className={styles.matchContainer}>
        <div
          className={`${styles.playerCell} ${
            match.predicted_winner === match.player1 ? styles.selectedPlayer : ''
          }`}
          onClick={() => match.player1 && handlePick(round, matchNumber, match.player1)}
        >
          {match.player1 || 'TBD'}
        </div>
        <div className={styles.connector} />
        <div
          className={`${styles.playerCell} ${
            match.predicted_winner === match.player2 ? styles.selectedPlayer : ''
          }`}
          onClick={() => match.player2 && handlePick(round, matchNumber, match.player2)}
        >
          {match.player2 || 'TBD'}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.bracketContainer}>
      {displayBracket.map(renderMatch)}
      <button onClick={savePicks} className={styles.saveButton}>
        Сохранить пики
      </button>
    </div>
  );
}