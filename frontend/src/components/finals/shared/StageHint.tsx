import styles from '../Finals.module.css';
import { FinalsStage } from './types';
import { stageLabel } from './helpers';

interface StageHintProps {
  stage: FinalsStage;
  hint: string;
  points?: number | null;
}

export const StageHint = ({ stage, hint, points = null }: StageHintProps) => (
  <div className={styles.hintRow}>
    <div>
      <p className={styles.status}>{stageLabel(stage)}</p>
      {hint && <p className={styles.hint}>{hint}</p>}
    </div>
    {points !== null && <span className={styles.stageScore}>+{points}</span>}
  </div>
);
