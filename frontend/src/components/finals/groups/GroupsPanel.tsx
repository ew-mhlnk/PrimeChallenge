import styles from '../Finals.module.css';
import { Legend } from '../shared/Legend';
import { StageHint } from '../shared/StageHint';
import { pointsWord, stageLabel } from '../shared/helpers';
import { finalsToast } from '../shared/toast';
import { FinalsData } from '../shared/types';
import { GroupTable } from './GroupTable';

interface GroupsPanelProps {
  data: FinalsData;
  groupPicks: Record<string, string[]>;
  droppedPick: boolean;
  onToggle: (stage: string, player: string) => void;
}

export const GroupsPanel = ({ data, groupPicks, droppedPick, onToggle }: GroupsPanelProps) => {
  const { groups, group_stage: stage, scoring } = data;
  const editable = stage.state === 'open';
  const hasResults = groups.some((group) => group.winners.length > 0);
  const points = groups.reduce((sum, group) => sum + group.points, 0);
  const hits = points / scoring.GROUP;
  const closedWithPicks = !editable && groups.some((group) => group.picks.length > 0);

  let hint = '';
  if (hasResults) hint = `Угадано ${hits} из 4 · по ${scoring.GROUP} ${pointsWord(scoring.GROUP)} за игрока`;
  else if (editable) hint = 'Нажмите на строку, чтобы выбрать 2 игроков, которые выйдут из группы';
  else if (stage.state === 'closed') hint = 'Прогноз принят. Результаты появятся после матчей';

  return (
    <section className={styles.panel}>
      <StageHint stage={stage} hint={hint} points={hasResults ? points : null} />
      {droppedPick && editable && (
        <p className={styles.warning}>Один из выбранных игроков снялся. Выберите заново и сохраните.</p>
      )}
      {groups.length === 0 ? (
        <p className={styles.empty}>Группы появятся совсем скоро</p>
      ) : (
        <>
          <div className={styles.groups}>
            {groups.map((group) => (
              <GroupTable
                key={group.stage}
                group={group}
                selected={editable ? groupPicks[group.stage] || [] : group.picks}
                editable={editable}
                onToggle={(player) => onToggle(group.stage, player)}
                onLocked={() => finalsToast(stageLabel(stage))}
              />
            ))}
          </div>
          {closedWithPicks && (
            <div className={styles.summary}>
              {groups.map((group) => (
                <p key={group.stage}>{group.title}: {group.picks.join(', ')}</p>
              ))}
            </div>
          )}
          <Legend results={hasResults} />
        </>
      )}
    </section>
  );
};
