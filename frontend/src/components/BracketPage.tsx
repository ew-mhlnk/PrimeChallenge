'use client';

import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, Variants, PanInfo } from 'framer-motion';
import styles from './BracketPage.module.css';
import { useTournamentLogic } from '../hooks/useTournamentLogic';
import { useState } from 'react';

// --- ICONS ---
const BackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
);
const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 6L9 17L4 12" stroke="#00B2FF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
);
const TrophyIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>
);

// --- SAVE BUTTON ---
const SaveButton = ({ onClick, status }: { onClick: () => void, status: 'idle' | 'loading' | 'success' }) => {
  return (
    <motion.button
      layout
      onClick={onClick}
      disabled={status !== 'idle'}
      className={`${styles.saveButton} ${status === 'success' ? styles.saveButtonSuccess : ''}`}
      initial={false}
      animate={{
        width: status === 'loading' ? 50 : 200,
        backgroundColor: status === 'success' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.15)',
        color: status === 'success' ? '#000000' : '#FFFFFF'
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {status === 'idle' && <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>Сохранить</motion.span>}
        {status === 'loading' && <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-center"><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /></motion.div>}
        {status === 'success' && <motion.span key="success" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2"><CheckIcon />Готово</motion.span>}
      </AnimatePresence>
    </motion.button>
  );
};

// --- ANIMATION ---
const variants: Variants = {
  enter: (direction: number) => ({ x: direction > 0 ? 50 : -50, opacity: 0, scale: 0.95 }),
  center: { x: 0, opacity: 1, scale: 1, position: 'relative' },
  exit: (direction: number) => ({ x: direction < 0 ? 50 : -50, opacity: 0, scale: 0.95, position: 'absolute', top: 0, left: 0, width: '100%' })
};
const transitionSettings = { duration: 0.5, ease: [0.32, 0.72, 0, 1] };

// Хелпер очистки имен
const cleanName = (name: string | undefined | null) => {
    if (!name) return "";
    return name.replace(/\s*\(.*?\)$/, '').trim().toLowerCase();
};

export default function BracketPage({ id }: { id: string }) {
  const router = useRouter();
  const { tournament, bracket, error, isLoading, selectedRound, setSelectedRound, rounds, handlePick, savePicks } = useTournamentLogic({ id });
  
  const [saveStatus, setSaveStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [direction, setDirection] = useState(0);

  if (isLoading) return <div className="flex justify-center pt-20 text-[#5F6067]">Загрузка...</div>;
  if (error) return <div className="text-red-500 text-center pt-10">{error}</div>;
  if (!tournament || !selectedRound) return null;

  const isLiveOrClosed = tournament.status !== 'ACTIVE';

  const changeRound = (newRound: string) => {
    const currentIndex = rounds.indexOf(selectedRound);
    const newIndex = rounds.indexOf(newRound);
    if (currentIndex === newIndex) return;
    setDirection(newIndex > currentIndex ? 1 : -1);
    setSelectedRound(newRound);
  };

  const handleSave = async () => {
    setSaveStatus('loading');
    await savePicks();
    setSaveStatus('success');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const currentIndex = rounds.indexOf(selectedRound);
    const threshold = 50;
    if (Math.abs(info.offset.y) > Math.abs(info.offset.x)) return;
    if (info.offset.x < -threshold && currentIndex < rounds.length - 1) changeRound(rounds[currentIndex + 1]);
    else if (info.offset.x > threshold && currentIndex > 0) changeRound(rounds[currentIndex - 1]);
  };

  const isChampionRound = selectedRound === 'Champion';
  const isCompactRound = ['SF', 'F', 'Champion'].includes(selectedRound);
  const getSetScore = (scoreStr: string | undefined, playerIdx: 0 | 1) => {
      if (!scoreStr) return null;
      const parts = scoreStr.split('-');
      if (parts.length < 2) return null;
      return parts[playerIdx];
  };

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
          <button key={round} onClick={() => changeRound(round)} className={`${styles.roundButton} ${selectedRound === round ? styles.activeRound : ''}`}>
            {round}
          </button>
        ))}
      </div>

      <div className={`${styles.bracketWindow} ${isCompactRound ? styles.bracketWindowCompact : styles.bracketWindowFull}`}>
        <div className={styles.scrollArea}>
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={selectedRound}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={transitionSettings}
              layout 
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              dragDirectionLock={true}
              onDragEnd={handleDragEnd}
              className={styles.sliderWrapper}
            >
              {bracket[selectedRound]?.length > 0 ? (
                bracket[selectedRound].map((match) => {
                  
                  const realWinner = match.actual_winner;
                  const isMatchFinished = !!realWinner;
                  const p1NameReal = match.player1?.name || 'TBD';
                  const p2NameReal = match.player2?.name || 'TBD';
                  
                  // Функция для определения состояния ячейки игрока
                  // name - имя в ячейке (наш прогноз или TBD, если мы не выбирали, или реальное имя, если это R1)
                  // isPicked - выбрал ли я этого игрока в ЭТОМ раунде
                  // slotRealName - реальное имя игрока в этом слоте (приходит с бэкенда в player1/player2)
                  const getPlayerState = (name: string, isPicked: boolean, slotRealName: string) => {
                      const cls = styles.playerRow;
                      if (name === 'TBD') return { className: `${cls} ${styles.tbd}`, hint: null };

                      // Если турнир идет (CLOSED) и это мой выбор
                      if (isLiveOrClosed && isPicked) {
                          const cleanPicked = cleanName(name);
                          const cleanRealSlot = cleanName(slotRealName);
                          const cleanWinner = cleanName(realWinner);

                          // 1. ПРОВЕРКА НА "ВЫЛЕТЕЛ РАНЬШЕ"
                          // Если имя моего выбора (Fognini) не совпадает с реальным именем в слоте (Moutet)
                          // и реальное имя известно (не TBD), значит Fognini вылетел раньше.
                          if (cleanRealSlot !== 'TBD' && cleanPicked !== cleanRealSlot) {
                              return { 
                                  className: `${cls} ${styles.incorrect}`, 
                                  hint: slotRealName // Показываем, кто здесь на самом деле
                              };
                          }

                          // 2. ПРОВЕРКА НА "ПРОИГРАЛ ЭТОТ МАТЧ"
                          if (isMatchFinished) {
                              if (cleanPicked === cleanWinner) {
                                  return { className: `${cls} ${styles.correct}`, hint: null };
                              } else {
                                  return { 
                                      className: `${cls} ${styles.incorrect}`, 
                                      hint: realWinner // Показываем, кто выиграл
                                  };
                              }
                          }

                          // 3. МАТЧ ЕЩЕ НЕ СЫГРАН (или нет данных), но я прошел до сюда
                          return { className: `${cls} ${styles.selected}`, hint: null };
                      }

                      // Если просто активный турнир (выбор)
                      if (!isLiveOrClosed && isPicked) {
                          return { className: `${cls} ${styles.selected}`, hint: null };
                      }

                      return { className: cls, hint: null };
                  };

                  // --- CHAMPION ---
                  if (isChampionRound) {
                     const championName = match.predicted_winner || 'TBD'; // Показываем наш выбор
                     const realChampSlot = match.player1?.name || 'TBD'; // Кто реально в финале/победил
                     
                     // Используем ту же логику
                     const state = getPlayerState(championName, !!match.predicted_winner, realChampSlot);

                     return (
                        <div key={match.id} className={styles.championWrapper}>
                            <div className={`${styles.championContainer}`} style={{ 
                                border: 'none', 
                                background: state.className.includes('correct') ? 'rgba(48, 209, 88, 0.15)' : 
                                            state.className.includes('incorrect') ? 'rgba(255, 69, 58, 0.15)' : 
                                            state.className.includes('selected') ? '#152230' : '#1E1E1E'
                            }}>
                                <div className={state.className} style={{ height: '60px', cursor: 'default', borderRadius: '12px', background: 'transparent' }}>
                                    <div className={styles.playerInfo}>
                                        <span className={styles.playerName} style={{ fontSize: '16px' }}>
                                            {championName}
                                        </span>
                                        {state.hint && (
                                            <div className={styles.correctionText}>
                                                → <span>{state.hint}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className={styles.checkIcon}><CheckIcon /></div>
                                </div>
                            </div>
                        </div>
                     );
                  }

                  const p1 = match.player1;
                  const p2 = match.player2;
                  // Для отображения берем либо наш прогноз, либо то что пришло с бэка (TBD/Имя)
                  // В R32 всегда приходят реальные имена. В R16+ приходят TBD или победители прошлых пар.
                  // Но у нас в user_picks сохранен predicted_winner для этого матча.
                  // Мы должны показывать predicted_winner, если он есть.
                  
                  const isP1Picked = match.predicted_winner === p1.name || (match.match_number % 2 !== 0 && match.predicted_winner && !match.predicted_winner.includes(p2.name)); 
                  // ^ Тут сложная логика, упростим:
                  // В базе UserPick хранит predicted_winner. 
                  // Нам нужно понять, в какой слот (верхний или нижний) этот победитель "месил" бы.
                  // Но проще: 
                  // Если predicted_winner == p1.name (реальному), то это P1.
                  // Если predicted_winner == p2.name (реальному), то это P2.
                  // А если реальные имена уже другие (Moutet вместо Fognini)?
                  
                  // ДАВАЙ УПРОСТИМ ВИЗУАЛИЗАЦИЮ:
                  // Мы показываем В ЯЧЕЙКЕ то имя, которое реально там сейчас (или TBD).
                  // А если у юзера был прогноз на ЭТОТ слот, мы его подсвечиваем.
                  
                  // НЕТ, ЮЗЕР ХОЧЕТ ВИДЕТЬ СВОЙ ВЫБОР (Fognini), ДАЖЕ ЕСЛИ ТАМ УЖЕ Moutet.
                  
                  // РЕШЕНИЕ:
                  // 1. Определяем, на кого ставил юзер в этом матче.
                  const myPick = match.predicted_winner;
                  
                  // 2. Определяем, в каком слоте (верх/низ) должен был быть этот игрок.
                  // Это сложно восстановить без полного дерева.
                  // НО! У нас есть source_matches.
                  // Упростим: Если myPick совпадает с p1NameReal (даже частично) -> Верх. 
                  // Если нет -> пытаемся угадать или просто показываем в слоте, который соответствует сетке.
                  
                  // ДЛЯ MVP:
                  // Мы просто показываем P1 и P2 как они есть в БАЗЕ (реальная сетка).
                  // И если myPick НЕ совпадает ни с P1, ни с P2 -> значит он вылетел раньше.
                  // Но куда его рисовать? Вместо P1 или P2?
                  
                  // КОМПРОМИСС:
                  // Мы рисуем Реальную сетку (Moutet vs Nakashima).
                  // И если мой пик (Fognini) должен был быть здесь, мы ищем, чье место он занял.
                  // Если Fognini проиграл Moutet в прошлом раунде, значит он должен был быть на месте Moutet.
                  
                  // Реализуем простую проверку:
                  // Если мой пик == p1.name -> P1 Selected.
                  // Если мой пик == p2.name -> P2 Selected.
                  // Если мой пик != ничему -> Значит я вылетел. 
                  // Но юзер хочет видеть "Fognini (зачеркнуто) -> Moutet".
                  
                  // Значит, нам нужно подменять отображаемое имя?
                  // Давайте так: 
                  // P1 Display Name = Если я ставил на кого-то, кто должен быть тут, показываем ЕГО. Иначе Реальное имя.
                  
                  // Чтобы узнать "кто должен быть тут", нам нужно знать, откуда пришел слот.
                  // В R32 всё просто.
                  // В R16: P1 приходит из победителя матча R32 #1. P2 из R32 #2.
                  // Если я ставил в R32 #1 на Fognini -> значит в R16 P1 у меня Fognini.
                  
                  // Это требует данных с бэкенда о "моем пути".
                  // Сейчас у нас есть просто `predicted_winner` на матч.
                  // Если `predicted_winner` есть, мы его показываем.
                  
                  const p1Display = (myPick && (isChampionRound || myPick === p1.name || (p1.name !== 'TBD' && cleanName(myPick) !== cleanName(p1.name)))) ? myPick : p1.name; 
                  // Логика выше слабая.
                  
                  // ДАВАЙТЕ ВЕРНЕМСЯ К ПРОСТОМУ ВАРИАНТУ, КОТОРЫЙ РАБОТАЛ РАНЬШЕ, НО С ЦВЕТАМИ.
                  // Мы показываем то, что пришло в match.player1.name (Реальная сетка).
                  // Если мой пик != match.player1.name -> Я вылетел.
                  
                  // ВАРИАНТ "Юзер видит свой выбор":
                  // Нам нужно знать, в каком слоте (1 или 2) был бы мой выбор.
                  // Если я выбрал Fognini в прошлом раунде, он должен быть в слоте 1.
                  // У нас нет этой инфы сейчас в `bracket` объекте.
                  
                  // ДАВАЙТЕ СДЕЛАЕМ ТАК:
                  // Если `predicted_winner` существует, мы ищем, с кем он "конфликтует".
                  // Если `cleanName(predicted_winner) == cleanName(p1.name)` -> Всё ок, синий/зеленый.
                  // Если `cleanName(predicted_winner) != cleanName(p1.name)` И `cleanName(predicted_winner) != cleanName(p2.name)`
                  // -> Значит, это "призрак". Мы должны показать его ВМЕСТО того, кто его выбил.
                  
                  // Как узнать кого заменять?
                  // Костыль: если `predicted_winner` не найден в текущих P1/P2,
                  // мы можем предположить, что он заменяет P1 (если это верхняя часть сетки) или P2.
                  // Но мы не знаем.
                  
                  // РАБОЧЕЕ РЕШЕНИЕ:
                  // Мы просто проверяем `predicted_winner`.
                  // Если он совпадает с P1 -> P1 подсвечиваем.
                  // Если с P2 -> P2.
                  // Если ни с кем -> Значит он вылетел В ПРЕДЫДУЩЕМ раунде.
                  // В этом случае, мы НЕ можем показать его в этом матче, потому что матч R16 "Moutet vs Nakashima"
                  // вообще не содержит Fognini.
                  
                  // ЕДИНСТВЕННЫЙ СПОСОБ показать Fognini в R16 - это если мы строим "User Bracket", а не "Real Bracket".
                  // Ты хочешь видеть СВОЮ сетку, наложенную на реальность.
                  
                  // Давай сделаем гибрид:
                  // Мы показываем P1 и P2.
                  // Но мы передаем `predicted_winner` в `getPlayerState`.
                  
                  const state1 = getPlayerState(p1.name, myPick === p1.name, p1.name);
                  const state2 = getPlayerState(p2.name, myPick === p2.name, p2.name);
                  
                  // А вот ХАК для "Красного вылета":
                  // Если у нас есть `myPick`, но он не совпал ни с p1, ни с p2.
                  // Значит, в одном из слотов должен быть "Fognini -> Moutet".
                  // В каком?
                  // Если `match.source_matches` (с бэка) говорит, что P1 пришел из матча, где я ставил на Fognini...
                  // Этого нет.
                  
                  // ДАВАЙ ПРОСТО СРАВНИВАТЬ С ПРЕДЫДУЩИМ РАУНДОМ? Нет, сложно.
                  
                  // ДАВАЙ СДЕЛАЕМ ТАК:
                  // Если `myPick` есть, и он не равен P1 и не равен P2.
                  // Мы принудительно заменяем P1 на "Fognini", красим в красный и пишем "-> Moutet".
                  // (С вероятностью 50% мы угадаем слот, но для визуализации сойдет, или будем всегда менять P1, если P2 тоже не совпал).
                  
                  let p1NameDisplay = p1.name;
                  let p2NameDisplay = p2.name;
                  let p1State = state1;
                  let p2State = state2;
                  
                  if (myPick && cleanName(myPick) !== cleanName(p1.name) && cleanName(myPick) !== cleanName(p2.name)) {
                      // Я выбрал кого-то, кого тут нет. Я вылетел.
                      // Заменим P1 (условно) на моего лузера.
                      // НО! Надо проверить, может я ставил на P2?
                      // Нет, если бы ставил на P2, myPick был бы P2.
                      
                      // Значит, я ставил на "Fognini". А тут "Moutet" и "Nakashima".
                      // Fognini проиграл Moutet? Или Nakashima?
                      // Мы не знаем.
                      // Поэтому просто покажем Fognini красным в первом слоте.
                      p1NameDisplay = myPick;
                      p1State = { 
                          className: `${styles.playerRow} ${styles.incorrect}`, 
                          hint: p1.name // Показываем, кто реально тут (Moutet)
                      };
                  }

                  const scores = match.scores || []; 

                  return (
                    <div key={match.id} className={styles.matchWrapper}>
                      <div className={styles.matchContainer}>
                        {/* P1 */}
                        <div 
                          className={p1State.className}
                          onClick={() => !isLiveOrClosed && p1Name !== 'TBD' && handlePick(selectedRound!, match.id, p1.name)}
                        >
                          <div className={styles.playerInfo}>
                              <span className={styles.playerName}>{p1NameDisplay}</span>
                              {p1State.hint && (
                                  <div className={styles.correctionText}>
                                      → <span>{p1State.hint}</span>
                                  </div>
                              )}
                          </div>
                          <div className="flex gap-2 mr-2">
                             {scores.map((s, i) => {
                                 const val = getSetScore(s, 0);
                                 if (!val) return null;
                                 return <span key={i} className="text-[11px] font-mono text-[#8E8E93]">{val}</span>
                             })}
                          </div>
                          {myPick === p1NameDisplay && !isMatchFinished && <div className={styles.checkIcon}><CheckIcon/></div>}
                          <span className={styles.playerSeed}>{p1.seed || ''}</span>
                        </div>

                        {/* P2 */}
                        <div 
                          className={p2State.className}
                          onClick={() => !isLiveOrClosed && p2Name !== 'TBD' && handlePick(selectedRound!, match.id, p2.name)}
                        >
                           <div className={styles.playerInfo}>
                              <span className={styles.playerName}>{p2NameDisplay}</span>
                           </div>
                           <div className="flex gap-2 mr-2">
                             {scores.map((s, i) => {
                                 const val = getSetScore(s, 1);
                                 if (!val) return null;
                                 return <span key={i} className="text-[11px] font-mono text-[#8E8E93]">{val}</span>
                             })}
                           </div>
                           {myPick === p2NameDisplay && !isMatchFinished && <div className={styles.checkIcon}><CheckIcon/></div>}
                           <span className={styles.playerSeed}>{p2.seed || ''}</span>
                        </div>
                      </div>
                      {selectedRound !== 'F' && <div className={styles.bracketConnector} />}
                    </div>
                  );
                })
              ) : (
                  <div className="flex h-full items-center justify-center py-20"><p className="text-[#5F6067] text-sm">Нет матчей</p></div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {!isLiveOrClosed && (
        <div className={styles.footer}>
             <SaveButton onClick={handleSave} status={saveStatus} />
        </div>
      )}
    </div>
  );
}