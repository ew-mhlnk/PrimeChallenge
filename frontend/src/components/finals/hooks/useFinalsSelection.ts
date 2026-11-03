'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { includesPlayer, samePlayer } from '../shared/helpers';
import { finalsToast } from '../shared/toast';
import { FinalsData, FinalsGroup, FinalsSavePayload } from '../shared/types';

const validPicks = (group: FinalsGroup) =>
  group.players.filter((player) => includesPlayer(group.picks, player)).slice(0, 2);

export function useFinalsSelection(data: FinalsData) {
  const { selection } = useHapticFeedback();
  const { groups, playoff } = data;

  const [groupPicks, setGroupPicks] = useState<Record<string, string[]>>({});
  const [finalists, setFinalists] = useState<(string | null)[]>([null, null]);
  const [champion, setChampion] = useState<string | null>(null);

  // Выбор берем с сервера: снявшиеся игроки из него автоматически выпадают
  useEffect(() => {
    setGroupPicks(Object.fromEntries(groups.map((group) => [group.stage, validPicks(group)])));
    const picked = playoff.pairs.map(
      (pair) => pair.find((player) => player && includesPlayer(playoff.picked_finalists, player)) || null,
    );
    setFinalists(picked);
    setChampion(picked.find((player) => samePlayer(player, playoff.picked_champion)) || null);
  }, [groups, playoff]);

  const toggleGroupPick = useCallback((stage: string, player: string) => {
    selection();
    const current = groupPicks[stage] || [];
    if (includesPlayer(current, player)) {
      setGroupPicks({ ...groupPicks, [stage]: current.filter((item) => !samePlayer(item, player)) });
    } else if (current.length === 2) {
      finalsToast('Из группы выходят 2 игрока — заменили последний выбор');
      setGroupPicks({ ...groupPicks, [stage]: [current[0], player] });
    } else {
      setGroupPicks({ ...groupPicks, [stage]: [...current, player] });
    }
  }, [groupPicks, selection]);

  const selectFinalist = useCallback((pairIndex: number, player: string) => {
    selection();
    const next = [...finalists];
    next[pairIndex] = samePlayer(next[pairIndex], player) ? null : player;
    setFinalists(next);
    if (!next.some((item) => samePlayer(item, champion))) setChampion(null);
  }, [champion, finalists, selection]);

  const selectChampion = useCallback((player: string) => {
    selection();
    setChampion(samePlayer(champion, player) ? null : player);
  }, [champion, selection]);

  const derived = useMemo(() => {
    const chosenFinalists = finalists.filter(Boolean) as string[];
    const groupsCount = groups.reduce((sum, group) => sum + (groupPicks[group.stage]?.length || 0), 0);
    const groupsComplete = groups.length === 2 && groupsCount === 4;
    const groupsSaved = groupsComplete && groups.every((group) =>
      group.picks.length === 2 && group.picks.every((pick) => includesPlayer(groupPicks[group.stage] || [], pick)));
    const playoffComplete = chosenFinalists.length === 2 && Boolean(champion);
    const playoffSaved = playoffComplete && samePlayer(champion, playoff.picked_champion)
      && chosenFinalists.every((player) => includesPlayer(playoff.picked_finalists, player));
    return {
      chosenFinalists,
      groupsCount,
      groupsComplete,
      groupsSaved,
      playoffComplete,
      playoffSaved,
      droppedGroupPick: groups.some((group) => validPicks(group).length < group.picks.length),
      droppedPlayoffPick: chosenFinalists.length < playoff.picked_finalists.length,
    };
  }, [champion, finalists, groupPicks, groups, playoff]);

  const groupsPayload = (): FinalsSavePayload => ({
    phase: 'groups',
    group_a: groupPicks.GROUP_A,
    group_b: groupPicks.GROUP_B,
  });

  const playoffPayload = (): FinalsSavePayload => ({
    phase: 'playoff',
    finalists: derived.chosenFinalists,
    champion: champion || '',
  });

  return {
    groupPicks,
    finalists,
    champion,
    toggleGroupPick,
    selectFinalist,
    selectChampion,
    groupsPayload,
    playoffPayload,
    ...derived,
  };
}
