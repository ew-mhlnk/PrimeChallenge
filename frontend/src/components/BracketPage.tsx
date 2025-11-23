'use client';

import { useRouter } from 'next/navigation';
import styles from './BracketPage.module.css'; // Используем styles здесь
import { useTournamentLogic } from '../hooks/useTournamentLogic';

export default function BracketPage({ id }: { id: string }) {
  const router = useRouter();
  const {
    tournament,
    bracket,
    hasPicks,
    error,
    isLoading,
    selectedRound,
    setSelectedRound,
    rounds,
    handlePick,
    savePicks,
  } = useTournamentLogic({ id });

  if (isLoading) return <div className="flex justify-center pt-20 text-white">Загрузка...</div>;
  if (error) return <div className="text-red-500 text-center pt-10">{error}</div>;
  if (!tournament || !selectedRound) return null;

  const canEdit = tournament.status === 'ACTIVE';
  // Показываем кнопку только если есть изменения (hasPicks) ИЛИ турнир активен (чтобы можно было начать выбирать)
  const showSaveButton = canEdit; 

  return (
    // Используем styles.container
    <div className={styles.container}>
      
      {/* Хедер: styles.header, styles.backButton, styles.tournamentTitle */}
      <div className={styles.header}>
        <button onClick={() => router.back()} className={styles.backButton}>←</button>
        <h2 className={styles.tournamentTitle}>{tournament.name}</h2>
        <span className={`text-xs px-2 py-1 rounded font-medium ${
            tournament.status === 'ACTIVE' ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
        }`}>
            {tournament.status === 'ACTIVE' ? 'LIVE' : 'CLOSED'}
        </span>
      </div>

      {/* Навигация по раундам: styles.rounds, styles.activeRound */}
      <div className={styles.rounds}>
        {rounds.map((round) => (
          <button
            key={round}
            onClick={() => setSelectedRound(round)}
            className={selectedRound === round ? styles.activeRound : styles.inactiveRound}
          >
            {round}
          </button>
        ))}
      </div>

      {/* Сетка: styles.box, styles.rectangle */}
      <div className={styles.box}>
        <div className={styles.rectangle}>
          <div className={styles.roundContainer}>
            <div className={styles.roundTitle}>{selectedRound}</div>
            <ul className={styles.matchList}>
              {bracket[selectedRound]?.length > 0 ? (
                bracket[selectedRound].map((match) => {
                  const p1Name = match.player1?.name || 'TBD';
                  const p2Name = match.player2?.name || 'TBD';
                  const p1Selected = match.predicted_winner === p1Name && p1Name !== 'TBD';
                  const p2Selected = match.predicted_winner === p2Name && p2Name !== 'TBD';
                  
                  return (
                  <li key={match.id} className={styles.matchItem}>
                    <div className={styles.matchCard}>
                      {/* Игрок 1 */}
                      <div
                        className={`${styles.player} 
                          ${p1Selected ? styles.selectedPlayer : ''}
                          ${p1Name === 'TBD' ? 'opacity-50 cursor-default' : ''}
                        `}
                        onClick={() => canEdit && p1Name !== 'TBD' && p1Name !== 'Bye' && handlePick(selectedRound!, match.id, p1Name)}
                      >
                        <p className="truncate font-medium">
                            {p1Name} {match.player1?.seed ? <span className="text-xs opacity-70">({match.player1.seed})</span> : ''}
                        </p>
                      </div>

                      {/* Разделитель (опционально, можно убрать если есть отступы в CSS) */}
                      {/* <div className="h-[1px] bg-[#2C2C2E] w-full my-[2px]"></div> */}

                      {/* Игрок 2 */}
                      <div
                        className={`${styles.player} 
                          ${p2Selected ? styles.selectedPlayer : ''}
                          ${p2Name === 'TBD' ? 'opacity-50 cursor-default' : ''}
                        `}
                        onClick={() => canEdit && p2Name !== 'TBD' && p2Name !== 'Bye' && handlePick(selectedRound!, match.id, p2Name)}
                      >
                        <p className="truncate font-medium">
                            {p2Name} {match.player2?.seed ? <span className="text-xs opacity-70">({match.player2.seed})</span> : ''}
                        </p>
                      </div>
                    </div>
                  </li>
                )})
              ) : (
                <p className={styles.noMatches}>Нет матчей в этом раунде</p>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Кнопка Сохранить */}
      {showSaveButton && (
        <div className="fixed bottom-[100px] w-full max-w-[600px] px-8 z-40 flex justify-center pointer-events-none">
            <button
            onClick={savePicks}
            disabled={!hasPicks}
            className={`
                pointer-events-auto
                w-full py-3.5 
                font-bold rounded-[14px] shadow-lg active:scale-95 transition-all duration-200
                ${hasPicks ? 'bg-[#00B2FF] text-white hover:bg-[#0099DD]' : 'bg-[#2C2C2E] text-[#5F6067] cursor-not-allowed'}
            `}
            >
            СОХРАНИТЬ
            </button>
        </div>
      )}
    </div>
  );
}