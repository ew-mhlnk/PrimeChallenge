'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import styles from './Finals.module.css';
import { GroupsPanel } from './groups/GroupsPanel';
import { useFinals } from './hooks/useFinals';
import { useFinalsSelection } from './hooks/useFinalsSelection';
import { FinalPanel } from './playoff/FinalPanel';
import { SemifinalPanel } from './playoff/SemifinalPanel';
import { PointsCounter } from './shared/PointsCounter';
import { finalsFont } from './shared/font';
import { finalsLogo, finalsTag } from './shared/helpers';
import { FinalsData, FinalsSavePayload } from './shared/types';

const TABS = ['Групповая стадия', 'Полуфинал', 'Финал'];

const initialTab = (data: FinalsData) => {
  if (data.playoff_stage.state === 'waiting') return 0;
  return data.playoff_stage.state === 'finished' ? 2 : 1;
};

interface ContentProps {
  data: FinalsData;
  saving: boolean;
  save: (payload: FinalsSavePayload) => Promise<boolean>;
}

const FinalsContent = ({ data, saving, save }: ContentProps) => {
  const router = useRouter();
  const { impact, selection: tapFeedback } = useHapticFeedback();
  const panelsRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLElement>(null);
  const [activeTab, setActiveTab] = useState(() => initialTab(data));
  const picks = useFinalsSelection(data);

  const { group_stage: groupStage, playoff_stage: playoffStage, scoring, playoff, groups } = data;
  const [logoFailed, setLogoFailed] = useState(false);
  const logo = logoFailed ? null : finalsLogo(data.tag, data.image_url);
  const hasAnyResults = groups.some((group) => group.winners.length > 0) || playoff.finalists.length > 0;
  const groupsEditable = groupStage.state === 'open';
  const playoffEditable = playoffStage.state === 'open';
  const tabDone = [picks.groupsComplete, picks.chosenFinalists.length === 2, Boolean(picks.champion)];

  useEffect(() => {
    const panels = panelsRef.current;
    if (panels) panels.scrollTo({ left: panels.clientWidth * activeTab });
    // Начальная вкладка выставляется один раз
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const strip = tabsRef.current;
    const tab = strip?.children[activeTab] as HTMLElement | undefined;
    if (strip && tab) strip.scrollTo({ left: tab.offsetLeft - strip.offsetLeft - 16, behavior: 'smooth' });
  }, [activeTab]);

  const goToTab = (index: number) => {
    tapFeedback();
    panelsRef.current?.scrollTo({ left: panelsRef.current.clientWidth * index, behavior: 'smooth' });
  };

  const handleScroll = () => {
    const panels = panelsRef.current;
    if (!panels || !panels.clientWidth) return;
    setActiveTab(Math.round(panels.scrollLeft / panels.clientWidth));
  };

  const submit = (payload: FinalsSavePayload) => {
    impact('medium');
    void save(payload);
  };

  const renderCta = () => {
    if (activeTab === 0 && groupsEditable && groups.length > 0) {
      if (!picks.groupsComplete) {
        return <button type="button" className={styles.cta} disabled>Осталось выбрать: {4 - picks.groupsCount}</button>;
      }
      return (
        <button type="button" className={styles.cta} disabled={saving || picks.groupsSaved} onClick={() => submit(picks.groupsPayload())}>
          {saving ? 'Сохраняем...' : picks.groupsSaved ? 'Прогноз сохранен' : 'Подтвердить прогноз'}
        </button>
      );
    }
    if (activeTab > 0 && playoffEditable) {
      if (picks.playoffComplete) {
        return (
          <button type="button" className={styles.cta} disabled={saving || picks.playoffSaved} onClick={() => submit(picks.playoffPayload())}>
            {saving ? 'Сохраняем...' : picks.playoffSaved ? 'Прогноз сохранен' : 'Подтвердить прогноз'}
          </button>
        );
      }
      if (picks.chosenFinalists.length === 2) {
        return activeTab === 1
          ? <button type="button" className={styles.cta} onClick={() => goToTab(2)}>Далее: финал</button>
          : <button type="button" className={styles.cta} disabled>Осталось выбрать: 1</button>;
      }
      return <button type="button" className={styles.cta} disabled>Осталось выбрать: {3 - picks.chosenFinalists.length}</button>;
    }
    return null;
  };

  const cta = renderCta();

  return (
    <div className={`${styles.page} ${finalsFont.className}`} data-tag={finalsTag(data.tag)}>
      <div className={styles.column}>
        <button type="button" aria-label="Назад" className={styles.back} onClick={() => { impact('light'); router.back(); }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 19L8 12L15 5" /></svg>
        </button>

        <header className={styles.header}>
          {logo
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={logo} alt={data.name} className={styles.logo} onError={() => setLogoFailed(true)} />
            : <h1 className={styles.title}>{data.name}</h1>}
          <PointsCounter
            points={data.score}
            maxPoints={scoring.GROUP * 4 + scoring.SF * 2 + scoring.F}
            showMax={hasAnyResults}
            href={`/leaderboard/tournaments/${data.id}`}
          />
        </header>

        <nav ref={tabsRef} className={`${styles.tabs} scrollbar-hide`} aria-label="Этапы турнира">
          {TABS.map((tab, index) => (
            <button
              key={tab}
              type="button"
              aria-current={activeTab === index ? 'step' : undefined}
              onClick={() => goToTab(index)}
              className={`${styles.tab} ${activeTab === index ? styles.tabActive : ''}`}
            >
              {tab}
              {tabDone[index] && !hasAnyResults && <span className={styles.tabDone}>✓</span>}
            </button>
          ))}
        </nav>

        <div ref={panelsRef} className={`${styles.panels} scrollbar-hide`} onScroll={handleScroll}>
          <GroupsPanel
            data={data}
            groupPicks={picks.groupPicks}
            droppedPick={picks.droppedGroupPick}
            onToggle={picks.toggleGroupPick}
          />
          <SemifinalPanel
            data={data}
            finalists={picks.finalists}
            droppedPick={picks.droppedPlayoffPick}
            hasChampion={Boolean(picks.champion || playoff.champion)}
            onSelect={picks.selectFinalist}
          />
          <FinalPanel
            data={data}
            finalists={picks.finalists}
            champion={picks.champion}
            onSelect={picks.selectChampion}
          />
        </div>

        {cta && <div className={styles.ctaBar}><div>{cta}</div></div>}
      </div>
    </div>
  );
};

export default function FinalsTournament({ tournamentId }: { tournamentId: string }) {
  const { data, error, saving, save } = useFinals(tournamentId);

  if (!data) {
    return (
      <div className={styles.loading}>
        {error ? <p className={styles.empty}>Не удалось загрузить турнир</p> : <div className={styles.spinner} />}
      </div>
    );
  }
  return <FinalsContent data={data} saving={saving} save={save} />;
}
