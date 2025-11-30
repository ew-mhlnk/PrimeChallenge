'use client';

import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, Variants, PanInfo } from 'framer-motion';
import styles from './BracketPage.module.css';
import { useTournamentLogic } from '../hooks/useTournamentLogic';
import { useState } from 'react';
import { BracketMatch } from '@/types';

const BackIcon = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>);
const CheckIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 6L9 17L4 12" stroke="#00B2FF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>);
const TrophyIcon = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>);

const SaveButton = ({ onClick, status }: { onClick: () => void, status: 'idle' | 'loading' | 'success' }) => (
    <motion.button layout onClick={onClick} disabled={status !== 'idle'} className={`${styles.saveButton} ${status === 'success' ? styles.saveButtonSuccess : ''}`} initial={false} animate={{ width: status === 'loading' ? 50 : 200, backgroundColor: status === 'success' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.15)', color: status === 'success' ? '#000000' : '#FFFFFF' }}>
      <AnimatePresence mode="wait" initial={false}>
        {status === 'idle' && <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>Сохранить</motion.span>}
        {status === 'loading' && <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-center"><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /></motion.div>}
        {status === 'success' && <motion.span key="success" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2"><CheckIcon />Готово</motion.span>}
      </AnimatePresence>
    </motion.button>
);

const variants: Variants = {
  enter: (direction: number) => ({ x: direction > 0 ? 50 : -50, opacity: 0, scale: 0.95 }),
  center: { x: 0, opacity: 1, scale: 1, position: 'relative' },
  exit: (direction: number) => ({ x: direction < 0 ? 50 : -50, opacity: 0, scale: 0.95, position: 'absolute', top: 0, left: 0, width: '100%' })
};

// Функция очистки (A. Zverev (1) -> azverev)
const clean = (name: string | undefined | null) => {
    if (!name || name === 'TBD' || name.toLowerCase() === 'bye') return "tbd";
    let n = name.replace(/\s*\(.*?\)/g, ''); // Убираем скобки
    n = n.replace(/[^a-zA-Z]/g, '').toLowerCase(); // Убираем точки и пробелы
    return n || "tbd";
};

export default function BracketPage({ id }: { id: string }) {
  const router = useRouter();
  const { tournament, bracket, trueBracket, error, isLoading, selectedRound, setSelectedRound, rounds, handlePick, savePicks, hasPicks } = useTournamentLogic({ id });
  
  const [saveStatus, setSaveStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [direction, setDirection] = useState(0);

  if (isLoading) return <div className="flex justify-center pt-20 text-[#5F6067]">Загрузка...</div>;
  if (error) return <div className="text-red-500 text-center pt-10">{error}</div>;
  if (!tournament || !selectedRound) return null;

  const isLiveOrClosed = tournament.status !== 'ACTIVE';
  const isFirstRound = selectedRound === rounds[0];

  const changeRound = (newRound: string) => {
    const idx = rounds.indexOf(selectedRound);
    const nIdx = rounds.indexOf(newRound);
    if (idx === nIdx) return;
    setDirection(nIdx > idx ? 1 : -1);
    setSelectedRound(newRound);
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const idx = rounds.indexOf(selectedRound);
    if (Math.abs(info.offset.y) > Math.abs(info.offset.x)) return;
    if (info.offset.x < -50 && idx < rounds.length - 1) changeRound(rounds[idx + 1]);
    else if (info.offset.x > 50 && idx > 0) changeRound(rounds[idx - 1]);
  };

  const handleSave = async () => {
    setSaveStatus('loading');
    await savePicks();
    setSaveStatus('success');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const displayBracket = (hasPicks || tournament.status === 'ACTIVE') ? bracket : trueBracket;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={() => router.back()} className={styles.backArrow}><BackIcon /></button>
        <h2 className={styles.tournamentTitle}>{tournament.name}</h2>
      </div>
      <div className={styles.bannerWrapper}>
         <div className="w-full h-[80px] bg-[#D9D9D9] rounded-[16px] opacity-90"></div>
      </div>
      <div className={styles.roundsContainer}>
        {rounds.map((round) => (
          <button key={round} onClick={() => changeRound(round)} className={`${styles.roundButton} ${selectedRound === round ? styles.activeRound : ''}`}>{round}</button>
        ))}
      </div>

      <div className={`${styles.bracketWindow} ${['SF', 'F', 'Champion'].includes(selectedRound) ? styles.bracketWindowCompact : styles.bracketWindowFull}`}>
        <div className={styles.scrollArea}>
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={selectedRound} custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
              layout drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.2} dragDirectionLock={true} onDragEnd={handleDragEnd}
              className={styles.sliderWrapper}
            >
              {displayBracket[selectedRound]?.length > 0 ? (
                displayBracket[selectedRound].map((match: BracketMatch, index: number) => {
                  
                  const realMatch = trueBracket[selectedRound]?.[index];
                  const realWinner = realMatch?.actual_winner; 
                  const isMatchFinished = clean(realWinner) !== 'tbd';

                  const uP1 = match.player1;
                  const uP2 = match.player2;
                  const myPick = match.predicted_winner;
                  const scores = match.scores || [];

                  const getPlayerState = (userPlayerName: string | null | undefined, realPlayerName: string | null | undefined, isPick: boolean) => {
                      const cls = styles.playerRow;
                      const safeUser = userPlayerName || 'TBD';
                      const safeReal = realPlayerName || 'TBD';
                      
                      const cUser = clean(safeUser);
                      const cReal = clean(safeReal);
                      const cRealWinner = clean(realWinner);

                      // 0. База
                      if (cUser === 'tbd') return { className: `${cls} ${styles.tbd}`, display: 'TBD', hint: null };
                      if (cUser === 'bye') return { className: `${cls} ${styles.tbd}`, display: safeUser, hint: null };
                      
                      if (!hasPicks && isLiveOrClosed) return { className: cls, display: safeReal, hint: null };

                      // 1. R32 - СИНИЙ
                      if (isFirstRound) {
                         if (isPick) return { className: `${cls} ${styles.selected}`, display: safeUser, hint: null };
                         return { className: cls, display: safeUser, hint: null };
                      }

                      // 2. R16+ (LIVE)
                      if (isLiveOrClosed) {
                          if (cReal === 'tbd') {
                              if (isPick) return { className: `${cls} ${styles.selected}`, display: safeUser, hint: null };
                              return { className: cls, display: safeUser, hint: null };
                          }

                          // Mismatch (У меня Зверев, в реале Муте) -> Красный
                          if (cUser !== cReal) {
                              return { className: `${cls} ${styles.incorrect}`, display: safeUser, hint: safeReal };
                          }

                          // Match (Зверев == Зверев)
                          if (cUser === cReal) {
                              if (isPick) {
                                  if (isMatchFinished) {
                                      if (cRealWinner === cUser) {
                                          return { className: `${cls} ${styles.correct}`, display: safeUser, hint: null };
                                      } else {
                                          return { className: `${cls} ${styles.incorrect}`, display: safeUser, hint: realWinner };
                                      }
                                  } else {
                                      return { className: `${cls} ${styles.selected}`, display: safeUser, hint: null };
                                  }
                              }
                              return { className: cls, display: safeUser, hint: null };
                          }
                      }

                      // 3. ACTIVE
                      if (isPick) return { className: `${cls} ${styles.selected}`, display: safeUser, hint: null };
                      return { className: cls, display: safeUser, hint: null };
                  };

                  if (selectedRound === 'Champion') {
                     const uChamp = match.player1?.name;
                     const rChamp = realMatch?.player1?.name;
                     const state = getPlayerState(uChamp, rChamp, !!myPick);
                     let bgStyle = '#1E1E1E';
                     if (state.className.includes('correct')) bgStyle = 'rgba(48, 209, 88, 0.15)';
                     else if (state.className.includes('incorrect')) bgStyle = 'rgba(255, 69, 58, 0.15)';
                     else if (state.className.includes('selected')) bgStyle = '#152230';

                     return (
                        <div key={match.id} className={styles.championWrapper}>
                            <div className={styles.championContainer} style={{ border: 'none', background: bgStyle }}>
                                <div className={state.className} style={{ height: '60px', cursor: 'default', borderRadius: '12px', background: 'transparent', border: 'none' }}>
                                    <div className={styles.playerInfo} style={{ justifyContent: 'center' }}>
                                        <span className={styles.playerName} style={{ fontSize: '16px' }}>{state.display}</span>
                                        {state.hint && (<div className={styles.correctionText}><span className={styles.correctionArrow}>→</span> {state.hint}</div>)}
                                    </div>
                                    {(state.className.includes('selected') || state.className.includes('correct')) && <div className={styles.checkIcon}><TrophyIcon /></div>}
                                </div>
                            </div>
                        </div>
                     );
                  }

                  const rP1 = realMatch?.player1?.name;
                  const rP2 = realMatch?.player2?.name;
                  const p1S = getPlayerState(uP1.name, rP1, clean(myPick) === clean(uP1.name));
                  const p2S = getPlayerState(uP2.name, rP2, clean(myPick) === clean(uP2.name));

                  return (
                    <div key={match.id} className={styles.matchWrapper}>
                      <div className={styles.matchContainer}>
                        <div className={p1S.className} onClick={() => !isLiveOrClosed && uP1.name !== 'TBD' && handlePick(selectedRound!, match.id, uP1.name)}>
                          <div className={styles.playerInfo}>
                              <span className={styles.playerName}>{p1S.display}</span>
                              {p1S.display !== 'TBD' && !p1S.className.includes('incorrect') && <span className={styles.playerSeed}>{uP1.seed ? `[${uP1.seed}]` : ''}</span>}
                              {p1S.hint && (<div className={styles.correctionText}><span className={styles.correctionArrow}>→</span> {p1S.hint}</div>)}
                          </div>
                          <div className="flex gap-2 mr-2">{scores.map((s: string, i: number) => <span key={i} className="text-[11px] font-mono text-[#8E8E93]">{s.split('-')[0]}</span>)}</div>
                          {hasPicks && clean(myPick) === clean(p1S.display) && !p1S.className.includes('incorrect') && <div className={styles.checkIcon}><CheckIcon/></div>}
                        </div>
                        <div className={p2S.className} onClick={() => !isLiveOrClosed && uP2.name !== 'TBD' && handlePick(selectedRound!, match.id, uP2.name)}>
                           <div className={styles.playerInfo}>
                              <span className={styles.playerName}>{p2S.display}</span>
                              <span className={styles.playerSeed}>{uP2.seed ? `[${uP2.seed}]` : ''}</span>
                              {p2S.hint && (<div className={styles.correctionText}><span className={styles.correctionArrow}>→</span> {p2S.hint}</div>)}
                           </div>
                           <div className="flex gap-2 mr-2">{scores.map((s: string, i: number) => <span key={i} className="text-[11px] font-mono text-[#8E8E93]">{s.split('-')[1]}</span>)}</div>
                           {hasPicks && clean(myPick) === clean(p2S.display) && !p2S.className.includes('incorrect') && <div className={styles.checkIcon}><CheckIcon/></div>}
                        </div>
                      </div>
                      {selectedRound !== 'F' && <div className={styles.bracketConnector} />}
                    </div>
                  );
                })
              ) : <div className="flex h-full items-center justify-center py-20"><p className="text-[#5F6067] text-sm">Нет матчей</p></div>}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      {!isLiveOrClosed && <div className={styles.footer}><SaveButton onClick={handleSave} status={saveStatus} /></div>}
    </div>
  );
}