'use client';

import styles from '../Finals.module.css';
import { FinalsGroup } from '../shared/types';
import { includesPlayer } from '../shared/helpers';

interface GroupTableProps {
  group: FinalsGroup;
  selected: string[];
  editable: boolean;
  onToggle: (player: string) => void;
  onLocked: () => void;
}

const rowState = (group: FinalsGroup, player: string, selected: string[]) => {
  const isPicked = includesPlayer(selected, player);
  const isWinner = includesPlayer(group.winners, player);
  if (isPicked && isWinner) return { className: styles.rowCorrect, mark: '✓' };
  if (isPicked && group.winners.length === 2) return { className: styles.rowWrong, mark: '✕' };
  if (isPicked) return { className: styles.rowPicked, mark: '' };
  if (isWinner) return { className: styles.rowAdvanced, mark: '' };
  return { className: '', mark: '' };
};

export const GroupTable = ({ group, selected, editable, onToggle, onLocked }: GroupTableProps) => (
  <section>
    <div className={styles.groupHeader}>
      <div className={styles.groupTitle}>
        {group.title}
        <span className={selected.length === 2 ? styles.countDone : styles.count}>{selected.length}/2</span>
      </div>
      {group.columns.map((column, index) => (
        <div key={index} className={styles.columnCell}><span>{column}</span></div>
      ))}
      <div className={styles.wlTitle}>W-L</div>
    </div>

    <div className={styles.groupBody}>
      {group.players.map((player, rowIndex) => {
        const state = rowState(group, player, selected);
        return (
          <button
            key={player}
            type="button"
            aria-disabled={!editable}
            aria-pressed={includesPlayer(selected, player)}
            onClick={() => (editable ? onToggle(player) : onLocked())}
            className={`${styles.groupRow} ${state.className}`}
          >
            <span className={styles.playerName}>
              <span>{player}</span>
              {state.mark && <b>{state.mark}</b>}
            </span>
            {group.rows[rowIndex]?.cells.map((cell, cellIndex) => (
              <span
                key={cellIndex}
                className={`${styles.scoreCell} ${cellIndex === rowIndex ? styles.scoreCellEmpty : ''}`}
              >
                {cellIndex === rowIndex ? '' : cell}
              </span>
            ))}
            <span className={styles.wlCell}>{group.rows[rowIndex]?.wl}</span>
          </button>
        );
      })}
    </div>
  </section>
);
