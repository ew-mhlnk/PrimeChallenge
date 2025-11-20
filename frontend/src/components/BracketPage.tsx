'use client';

// Убрали useEffect из импортов, так как он не использовался
import { useRouter } from 'next/navigation';
import styles from './BracketPage.module.css';
import { useTournamentLogic } from '../hooks/useTournamentLogic';

export default function BracketPage({ id }: { id: string }) {
  const router = useRouter();
  const {
    tournament,
    bracket,
    hasPicks, // Теперь используем эту переменную
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
  // Кнопку показываем только если статус ACTIVE
  const showSaveButton = canEdit;

  return (
    <div className={styles.container}>
      {/* Хедер */}
      <div className={styles.header}>
        <button onClick={() => router.back()} className={styles.backButton}>←</button>
        <h2 className={styles.tournamentTitle}>{tournament.name}</h2>
        <span className={`text-xs px-2 py-1 rounded ${
            tournament.status === 'ACTIVE' ? 'bg-green-600' : 'bg-red-600'
        }`}>
            {tournament.status === 'ACTIVE' ? 'Прием ставок' : 'Турнир идет'}
        </span>
      </div>

      {/* Навигация по раундам */}
      <div className="w-full overflow-x-auto px-4 mb-4 no-scrollbar">
        <div className="flex gap-2 min-w-max mx-auto">
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
      </div>

      {/* Сетка */}
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
                        <p className="truncate">
                            {p1Name} {match.player1?.seed ? `(${match.player1.seed})` : ''}
                        </p>
                      </div>

                      {/* Игрок 2 */}
                      <div
                        className={`${styles.player} 
                          ${p2Selected ? styles.selectedPlayer : ''}
                          ${p2Name === 'TBD' ? 'opacity-50 cursor-default' : ''}
                        `}
                        onClick={() => canEdit && p2Name !== 'TBD' && p2Name !== 'Bye' && handlePick(selectedRound!, match.id, p2Name)}
                      >
                        <p className="truncate">
                            {p2Name} {match.player2?.seed ? `(${match.player2.seed})` : ''}
                        </p>
                      </div>
                    </div>
                  </li>
                )})
              ) : (
                <p className={styles.noMatches}>Нет матчей</p>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Кнопка Сохранить */}
      {showSaveButton && (
        <div className="fixed bottom-20 w-full max-w-[600px] px-8 z-40">
            <button
            onClick={savePicks}
            disabled={!hasPicks} // Используем hasPicks для отключения, если изменений не было
            className={`w-full py-3 text-white font-bold rounded-[10px] shadow-lg transition-transform ${
                hasPicks 
                ? 'bg-[#00B2FF] active:scale-95 cursor-pointer' 
                : 'bg-gray-600 cursor-not-allowed opacity-70'
            }`}
            >
            СОХРАНИТЬ ПРОГНОЗ
            </button>
        </div>
      )}
    </div>
  );
}