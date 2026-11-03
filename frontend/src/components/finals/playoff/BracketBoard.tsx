import styles from '../Finals.module.css';

export type SlotState = '' | 'picked' | 'correct' | 'wrong' | 'advanced';

export interface BracketSlot {
  key: string;
  top: number;
  tag: string;
  label: string | null;
  placeholder: string;
  state: SlotState;
  onClick: () => void;
}

export interface BracketLine {
  right: number;
  top: number;
  width: number;
  height: number;
  active: boolean;
}

interface BracketBoardProps {
  slots: BracketSlot[];
  lines: BracketLine[];
  editable: boolean;
  hasChampion: boolean;
}

const STATE_CLASS: Record<SlotState, string> = {
  '': '',
  picked: styles.slotPicked,
  correct: styles.slotCorrect,
  wrong: styles.slotWrong,
  advanced: styles.slotAdvanced,
};

export const BracketBoard = ({ slots, lines, editable, hasChampion }: BracketBoardProps) => (
  <div className={styles.bracket}>
    {slots.map((slot) => (
      <button
        key={slot.key}
        type="button"
        disabled={!editable}
        aria-pressed={slot.state === 'picked'}
        onClick={slot.onClick}
        style={{ top: slot.top }}
        className={`${styles.slot} ${STATE_CLASS[slot.state]}`}
      >
        <span className={styles.slotTag}>{slot.tag}</span>
        <span className={slot.label ? styles.slotName : styles.slotPlaceholder}>
          {slot.label || slot.placeholder}
        </span>
        {slot.state === 'correct' && <b>✓</b>}
        {slot.state === 'wrong' && <b>✕</b>}
      </button>
    ))}
    {lines.map((line, index) => (
      <i
        key={index}
        className={line.active ? styles.lineActive : styles.line}
        style={{ right: line.right, top: line.top, width: line.width, height: line.height }}
      />
    ))}
    <span className={hasChampion ? styles.dotActive : styles.dot}>{hasChampion ? '★' : ''}</span>
  </div>
);
