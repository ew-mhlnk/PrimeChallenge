'use client';

import { useRouter } from 'next/navigation';
import { useTournamentLogic } from '../hooks/useTournamentLogic';

export default function BracketPage({ id }: { id: string }) {
  const router = useRouter();
  const {
    tournament,
    bracket,
    // hasPicks, <--- Удалено, чтобы не было ошибки
    error,
    isLoading,
    selectedRound,
    setSelectedRound,
    rounds,
    handlePick,
    savePicks,
  } = useTournamentLogic({ id });

  if (isLoading) return <div className="flex justify-center pt-20 text-white">Загрузка турнира...</div>;
  if (error) return <div className="text-red-500 text-center pt-10">Ошибка: {error}</div>;
  if (!tournament) return <div className="text-center pt-10 text-white">Турнир не найден</div>;

  // Проверка статуса (Приводим к Boolean для надежности)
  const isTournamentActive = tournament.status === 'ACTIVE';
  
  // Получаем матчи текущего раунда
  const currentMatches = selectedRound ? bracket[selectedRound] : [];

  console.log('Render BracketPage:', { 
      status: tournament.status, 
      isActive: isTournamentActive, 
      round: selectedRound, 
      matches: currentMatches?.length 
  });

  return (
    <div className="flex flex-col min-h-screen bg-[#141414] text-white pb-24">
      
      {/* --- HEADER --- */}
      <div className="sticky top-0 z-20 bg-[#1B1A1F] border-b border-gray-800 shadow-md">
        <div className="flex items-center justify-between p-4">
            <button onClick={() => router.back()} className="text-2xl text-white w-8">←</button>
            <div className="text-center">
                <h2 className="text-lg font-bold leading-tight max-w-[200px] truncate mx-auto">
                    {tournament.name}
                </h2>
                <div className="mt-1">
                     <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${
                        isTournamentActive ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                    }`}>
                        {isTournamentActive ? 'ПРИЕМ СТАВОК' : tournament.status}
                    </span>
                </div>
            </div>
            <div className="w-8"></div> 
        </div>

        {/* --- ROUND TABS (Вкладки) --- */}
        <div className="w-full overflow-x-auto no-scrollbar border-t border-[#2A2A2A]">
            <div className="flex p-2 min-w-max gap-2">
                {rounds.map((round) => {
                    const isActive = selectedRound === round;
                    return (
                        <button
                            key={round}
                            onClick={() => setSelectedRound(round)}
                            className={`
                                px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap
                                ${isActive 
                                    ? 'bg-[#00B2FF] text-white shadow-lg' 
                                    : 'bg-[#2A2A2A] text-gray-400 hover:bg-[#333]'}
                            `}
                        >
                            {round}
                        </button>
                    );
                })}
            </div>
        </div>
      </div>

      {/* --- MATCH LIST (Список матчей) --- */}
      <div className="flex-1 p-4 overflow-y-auto">
        {!currentMatches || currentMatches.length === 0 ? (
            <div className="text-center text-gray-500 mt-10">
                Загрузка матчей или раунд пуст... <br/>
                (Round: {selectedRound})
            </div>
        ) : (
            <div className="flex flex-col gap-3">
                {currentMatches.map((match) => {
                    const p1Name = match.player1?.name || 'TBD';
                    const p1Seed = match.player1?.seed;
                    // Проверяем, выбран ли игрок
                    const p1Selected = match.predicted_winner === p1Name && p1Name !== 'TBD';
                    
                    const p2Name = match.player2?.name || 'TBD';
                    const p2Seed = match.player2?.seed;
                    const p2Selected = match.predicted_winner === p2Name && p2Name !== 'TBD';

                    // Кликабельно только если турнир активен И имя игрока известно
                    const canClickP1 = isTournamentActive && p1Name !== 'TBD' && p1Name !== 'Bye';
                    const canClickP2 = isTournamentActive && p2Name !== 'TBD' && p2Name !== 'Bye';

                    return (
                        <div key={match.id} className="bg-[#1E1E1E] border border-[#333] rounded-xl overflow-hidden shadow-sm">
                            {/* Верхний слот */}
                            <div
                                onClick={() => {
                                    if (canClickP1) handlePick(selectedRound!, match.id, p1Name);
                                }}
                                className={`
                                    flex justify-between items-center p-3 border-b border-[#2A2A2A] transition-colors
                                    ${p1Selected ? 'bg-[#00B2FF] text-white' : ''}
                                    ${canClickP1 ? 'cursor-pointer active:bg-[#2A2A2A]' : 'cursor-default opacity-70'}
                                `}
                            >
                                <span className="font-medium truncate max-w-[80%]">
                                    {p1Name}
                                </span>
                                {p1Seed && <span className="text-[10px] opacity-60">({p1Seed})</span>}
                            </div>

                            {/* Нижний слот */}
                            <div
                                onClick={() => {
                                    if (canClickP2) handlePick(selectedRound!, match.id, p2Name);
                                }}
                                className={`
                                    flex justify-between items-center p-3 transition-colors
                                    ${p2Selected ? 'bg-[#00B2FF] text-white' : ''}
                                    ${canClickP2 ? 'cursor-pointer active:bg-[#2A2A2A]' : 'cursor-default opacity-70'}
                                `}
                            >
                                <span className="font-medium truncate max-w-[80%]">
                                    {p2Name}
                                </span>
                                {p2Seed && <span className="text-[10px] opacity-60">({p2Seed})</span>}
                            </div>
                        </div>
                    );
                })}
            </div>
        )}
      </div>

      {/* --- SAVE BUTTON --- */}
      {/* Показываем кнопку, если турнир активен. */}
      {isTournamentActive && (
        <div className="fixed bottom-20 left-0 right-0 px-4 z-30 flex justify-center">
            <button
                onClick={savePicks}
                className={`
                    w-full max-w-md py-3.5 rounded-xl font-bold text-white shadow-xl transition-all bg-[#00B2FF] active:scale-95 hover:bg-[#0095D6] cursor-pointer
                `}
            >
                СОХРАНИТЬ ПРОГНОЗ
            </button>
        </div>
      )}
    </div>
  );
}