'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, Variants, PanInfo } from 'framer-motion';
import { useRouter } from 'next/navigation';
import styles from './Bracket.module.css'; 
import { BracketMatch } from '@/types';
import { useActiveTournament } from '@/hooks/useActiveTournament';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { BracketMatchCard } from './BracketMatchCard';

const BackIcon = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>);
const CheckIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 6L9 17L4 12" stroke="#00B2FF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>);

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

const clean = (name: string | undefined | null) => {
    if (!name || name === 'TBD' || name.toLowerCase() === 'bye') return "tbd";
    return name;
};

interface ActiveBracketProps {
    id: string;
    tournamentName: string;
}

export default function ActiveBracket({ id, tournamentName }: ActiveBracketProps) {
  const router = useRouter();
  const { bracket, isLoading, selectedRound, setSelectedRound, rounds, handlePick, savePicks, saveStatus } = useActiveTournament(id);
  const { impact, notification, selection } = useHapticFeedback();
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    if (saveStatus === 'success') notification('success');
  }, [saveStatus, notification]);

  if (isLoading) return <div className="flex justify-center pt-20 text-[#5F6067]">Загрузка...</div>;
  if (!selectedRound) return null;

  const changeRound = (newRound: string) => {
    const idx = rounds.indexOf(selectedRound);
    const nIdx = rounds.indexOf(newRound);
    if (idx === nIdx) return;
    selection(); 
    setDirection(nIdx > idx ? 1 : -1);
    setSelectedRound(newRound);
  };

  const handlePickClick = (round: string, matchId: string, player: string) => {
      if (player !== 'TBD' && player !== 'Bye') {
          impact('light');
          handlePick(round, matchId, player);
      }
  };

  const handleSaveClick = () => {
      impact('medium');
      savePicks();
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const idx = rounds.indexOf(selectedRound);
    if (Math.abs(info.offset.y) > Math.abs(info.offset.x)) return;
    if (info.offset.x < -50 && idx < rounds.length - 1) changeRound(rounds[idx + 1]);
    else if (info.offset.x > 50 && idx > 0) changeRound(rounds[idx - 1]);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={() => router.back()} className={styles.backArrow}><BackIcon /></button>
        <h2 className={styles.tournamentTitle}>{tournamentName}</h2>
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
              {bracket[selectedRound]?.length > 0 ? (
                bracket[selectedRound].map((match: BracketMatch) => {
                  
                  const uP1 = match.player1;
                  const uP2 = match.player2;
                  const myPick = match.predicted_winner;
                  const scores = match.scores || [];

                  // --- ЛОГИКА ДЛЯ ACTIVE ---
                  // Только 2 варианта: Selected (голубой) или Default (TBD-серый)
                  const getStatus = (name: string | null | undefined, isPick: boolean) => {
                      if (isPick) return 'selected'; // Голубой
                      return 'default'; // Темный серый
                  };

                  const p1Status = getStatus(uP1.name, clean(myPick) === clean(uP1.name));
                  const p2Status = getStatus(uP2.name, clean(myPick) === clean(uP2.name));

                  if (selectedRound === 'Champion') {
                      return (
                          <div key={match.id} className="w-full">
                              <BracketMatchCard 
                                  player1={uP1} 
                                  player2={null}
                                  p1Status={p1Status as any}
                                  isChampion={true}
                                  showChecks={true}
                              />
                          </div>
                      );
                  }

                  return (
                    <div key={match.id} className="w-full">
                      <BracketMatchCard 
                          player1={uP1}
                          player2={uP2}
                          scores={scores}
                          p1Status={p1Status as any}
                          p2Status={p2Status as any}
                          onP1Click={() => uP1.name !== 'TBD' && handlePickClick(selectedRound!, match.id, uP1.name)}
                          onP2Click={() => uP2.name !== 'TBD' && handlePickClick(selectedRound!, match.id, uP2.name)}
                          showChecks={true} 
                          showConnector={selectedRound !== 'F'}
                      />
                    </div>
                  );
                })
              ) : <div className="flex h-full items-center justify-center py-20"><p className="text-[#5F6067] text-sm">Нет матчей</p></div>}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <div className={styles.footer}><SaveButton onClick={handleSaveClick} status={saveStatus} /></div>
    </div>
  );
}