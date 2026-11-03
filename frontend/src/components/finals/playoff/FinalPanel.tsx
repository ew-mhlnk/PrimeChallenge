import styles from '../Finals.module.css';
import { Legend } from '../shared/Legend';
import { StageHint } from '../shared/StageHint';
import { championWord, pointsWord, samePlayer, stageLabel } from '../shared/helpers';
import { finalsToast } from '../shared/toast';
import { FinalsData } from '../shared/types';
import { BracketBoard, BracketLine, BracketSlot } from './BracketBoard';
import { slotState } from './slotState';

interface FinalPanelProps {
  data: FinalsData;
  finalists: (string | null)[];
  champion: string | null;
  onSelect: (player: string) => void;
}

const TOPS = [90, 182];

const buildLines = (active: boolean): BracketLine[] => [
  { right: 75, top: 117, width: 19, height: 1, active },
  { right: 75, top: 209, width: 19, height: 1, active },
  { right: 75, top: 117, width: 1, height: 93, active },
  { right: 25, top: 163, width: 50, height: 1, active },
];

export const FinalPanel = ({ data, finalists, champion, onSelect }: FinalPanelProps) => {
  const { playoff, playoff_stage: stage, scoring, tag } = data;
  const editable = stage.state === 'open';
  const word = championWord(tag);
  const results = Boolean(playoff.champion);
  const shown = playoff.finalists.length === 2 ? playoff.finalists : finalists;
  const guessed = results && samePlayer(playoff.champion, playoff.picked_champion);
  const displayedChampion = playoff.champion || champion;

  const slots: BracketSlot[] = [0, 1].map((index) => {
    const player = shown[index] || null;
    return {
      key: `final-${index}`,
      top: TOPS[index],
      tag: `Ф${index + 1}`,
      label: player,
      placeholder: `Победитель полуфинала ${index + 1}`,
      state: slotState(player, champion, playoff.champion),
      onClick: () => {
        if (player) onSelect(player);
        else finalsToast('Сначала выберите победителей полуфиналов');
      },
    };
  });

  let hint = '';
  if (results) hint = `${word === 'чемпиона' ? 'Чемпион' : 'Чемпионка'}: ${guessed ? 'угадано' : 'не угадано'} · ${scoring.F} ${pointsWord(scoring.F)}`;
  else if (editable) hint = `Выберите ${word} турнира`;
  else if (stage.state === 'closed') hint = 'Прогноз принят. Результаты появятся после матчей';

  return (
    <section className={styles.panel}>
      <StageHint stage={stage} hint={hint} points={results ? playoff.champion_points : null} />
      <BracketBoard
        slots={slots}
        lines={buildLines(Boolean(displayedChampion))}
        editable={editable}
        hasChampion={Boolean(displayedChampion)}
        onLocked={() => finalsToast(stageLabel(stage))}
      />
      {displayedChampion && (
        <div className={`${styles.championCard} ${results ? '' : styles.championCardPicked} ${guessed ? styles.championCardCorrect : ''}`}>
          <i>★</i>
          <div>
            <span>{results ? `${word === 'чемпиона' ? 'Чемпион' : 'Чемпионка'} турнира` : `Ваш выбор: ${word}`}</span>
            <strong>{displayedChampion}</strong>
          </div>
        </div>
      )}
      {results && (
        <p className={styles.summary}>
          {guessed
            ? `Вы угадали — +${playoff.champion_points} ${pointsWord(playoff.champion_points)}.`
            : `Ваш выбор: ${playoff.picked_champion || '—'} — не угадано.`}
        </p>
      )}
      {shown.every(Boolean) && <Legend results={results} />}
    </section>
  );
};
