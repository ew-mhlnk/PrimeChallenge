import styles from '../Finals.module.css';
import { Legend } from '../shared/Legend';
import { StageHint } from '../shared/StageHint';
import { includesPlayer, pointsWord } from '../shared/helpers';
import { FinalsData } from '../shared/types';
import { BracketBoard, BracketLine, BracketSlot } from './BracketBoard';
import { slotState } from './slotState';

interface SemifinalPanelProps {
  data: FinalsData;
  finalists: (string | null)[];
  droppedPick: boolean;
  hasChampion: boolean;
  onSelect: (pairIndex: number, player: string) => void;
}

const TOPS = [[0, 69], [203, 272]];

const buildLines = (first: boolean, second: boolean): BracketLine[] => {
  const line = (right: number, top: number, width: number, height: number, active: boolean) => (
    { right, top, width, height, active }
  );
  return [
    line(75, 27, 19, 1, first), line(75, 96, 19, 1, first), line(75, 27, 1, 70, first), line(50, 61, 25, 1, first),
    line(75, 230, 19, 1, second), line(75, 299, 19, 1, second), line(75, 230, 1, 70, second), line(50, 264, 25, 1, second),
    line(50, 61, 1, 204, false), line(25, 163, 25, 1, false),
  ];
};

export const SemifinalPanel = ({ data, finalists, droppedPick, hasChampion, onSelect }: SemifinalPanelProps) => {
  const { playoff, playoff_stage: stage, scoring } = data;
  const editable = stage.state === 'open';
  const ready = playoff.pairs.flat().every(Boolean);
  const winners = playoff.pairs.map(
    (pair) => playoff.finalists.find((player) => includesPlayer(pair, player)) || null,
  );
  const hasResults = playoff.finalists.length > 0;
  const hits = playoff.finalist_points / scoring.SF;

  const slots: BracketSlot[] = playoff.pairs.flatMap((pair, pairIndex) =>
    pair.map((player, slotIndex) => ({
      key: `${pairIndex}-${slotIndex}`,
      top: TOPS[pairIndex][slotIndex],
      tag: `П${pairIndex + 1}`,
      label: player || null,
      placeholder: 'Определится в группе',
      state: slotState(player, finalists[pairIndex], winners[pairIndex]),
      onClick: () => onSelect(pairIndex, player),
    })),
  );

  let hint = '';
  if (hasResults) hint = `Угадано финалистов: ${hits} из 2 · по ${scoring.SF} ${pointsWord(scoring.SF)}`;
  else if (editable) hint = 'Выберите победителя каждого полуфинала';
  else if (stage.state === 'closed') hint = 'Прогноз принят. Результаты появятся после матчей';

  const missed = finalists.filter((player) => player && playoff.finalists.length === 2 && !includesPlayer(playoff.finalists, player));

  return (
    <section className={styles.panel}>
      <StageHint stage={stage} hint={hint} points={hasResults ? playoff.finalist_points : null} />
      {droppedPick && editable && (
        <p className={styles.warning}>Один из выбранных игроков снялся. Выберите заново и сохраните.</p>
      )}
      <BracketBoard
        slots={slots}
        lines={buildLines(Boolean(finalists[0] || winners[0]), Boolean(finalists[1] || winners[1]))}
        editable={editable && ready}
        hasChampion={hasChampion}
      />
      {hasResults && (
        <p className={styles.summary}>
          Ваш прогноз на финалистов: {finalists.map((player) => player || '—').join(', ')}.
          {missed.length > 0 && ` Не прошли дальше: ${missed.join(', ')}.`}
        </p>
      )}
      {ready && <Legend results={hasResults} />}
    </section>
  );
};
