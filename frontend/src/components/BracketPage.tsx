'use client';

import { useRouter } from 'next/navigation';
import { useTournamentLogic } from '../hooks/useTournamentLogic';

export default function BracketPage({ id }: { id: string }) {
  const router = useRouter();
  const {
    tournament,
    bracket,
    hasPicks,
    error,
    isLoading,
    rounds,
    handlePick,
    savePicks,
  } = useTournamentLogic({ id });

  if (isLoading) return <div className="flex justify-center pt-20 text-white">Загрузка...</div>;
  if (error) return <div className="text-red-500 text-center pt-10">{error}</div>;
  if (!tournament) return null;

  const canEdit = tournament.status === 'ACTIVE';

  return (
    <div className="flex flex-col h-screen bg-[#141414] text-white overflow-hidden">
      {/* Хедер */}
      <div className="flex items-center justify-between p-4 bg-[#1B1A1F] border-b border-gray-800 z-20 shadow-md">
        <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="text-2xl text-white">←</button>
            <div>
                <h2 className="text-lg font-bold leading-tight">{tournament.name}</h2>
                <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${
                    canEdit ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                }`}>
                    {canEdit ? 'ACTIVE' : tournament.status}
                </span>
            </div>
        </div>
        
        {/* Кнопка Сохранить в хедере (для удобства) */}
        {canEdit && (
            <button
                onClick={savePicks}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                    hasPicks 
                    ? 'bg-[#00B2FF] hover:bg-[#0099DB] text-white' 
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
                // Разрешаем жать всегда, если статус активен (перезапись пустых)
            >
                Сохранить
            </button>
        )}
      </div>

      {/* Область сетки с горизонтальным скроллом */}
      <div className="flex-1 overflow-auto bg-[#131313] cursor-grab active:cursor-grabbing">
        <div className="inline-flex p-8 min-h-full">
          {rounds.map((round) => {
            const matches = bracket[round] || [];
            if (matches.length === 0) return null;

            return (
              <div key={round} className="flex flex-col min-w-[260px] mr-8">
                {/* Заголовок раунда */}
                <div className="text-center text-[#00B2FF] font-bold mb-4 sticky top-0 bg-[#131313] py-2 z-10">
                  {round}
                </div>

                {/* Колонка матчей с justify-around для выравнивания */}
                <div className="flex flex-col justify-around flex-1 gap-4">
                  {matches.map((match) => {
                    const p1Name = match.player1?.name || 'TBD';
                    const p2Name = match.player2?.name || 'TBD';
                    const isP1Selected = match.predicted_winner === p1Name && p1Name !== 'TBD';
                    const isP2Selected = match.predicted_winner === p2Name && p2Name !== 'TBD';

                    // Определяем, кликабелен ли слот
                    // Если это первый раунд - всегда кликабельно (если не TBD)
                    // Если не первый - кликабельно, если имя игрока известно (пронесено)
                    const isP1Clickable = canEdit && p1Name !== 'TBD' && p1Name !== 'Bye';
                    const isP2Clickable = canEdit && p2Name !== 'TBD' && p2Name !== 'Bye';

                    return (
                      <div 
                        key={match.id} 
                        className="relative bg-[#1E1E1E] border border-[#333] rounded-lg overflow-hidden shadow-lg flex flex-col"
                      >
                        {/* Игрок 1 */}
                        <div
                          onClick={() => isP1Clickable && handlePick(round, match.id, p1Name)}
                          className={`
                            p-3 flex justify-between items-center cursor-pointer transition-colors border-b border-[#333]
                            ${isP1Selected ? 'bg-[#00B2FF] text-white' : 'hover:bg-[#2A2A2A] text-gray-300'}
                            ${!isP1Clickable ? 'cursor-default opacity-60' : ''}
                          `}
                        >
                          <span className="truncate font-medium text-sm max-w-[160px]">
                            {p1Name}
                          </span>
                          {match.player1?.seed && (
                             <span className="text-[10px] opacity-70 ml-2">({match.player1.seed})</span>
                          )}
                        </div>

                        {/* Игрок 2 */}
                        <div
                          onClick={() => isP2Clickable && handlePick(round, match.id, p2Name)}
                          className={`
                            p-3 flex justify-between items-center cursor-pointer transition-colors
                            ${isP2Selected ? 'bg-[#00B2FF] text-white' : 'hover:bg-[#2A2A2A] text-gray-300'}
                            ${!isP2Clickable ? 'cursor-default opacity-60' : ''}
                          `}
                        >
                           <span className="truncate font-medium text-sm max-w-[160px]">
                            {p2Name}
                          </span>
                          {match.player2?.seed && (
                             <span className="text-[10px] opacity-70 ml-2">({match.player2.seed})</span>
                          )}
                        </div>
                        
                        {/* Коннектор (декоративная линия справа) */}
                        <div className="absolute -right-4 top-1/2 w-4 h-px bg-gray-700 hidden md:block"></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Мобильная плашка "Сохранить" (дублируем вниз, если на мобильном) */}
      {canEdit && (
        <div className="md:hidden fixed bottom-[70px] right-4 left-4 z-30">
             <button
                onClick={savePicks}
                className="w-full py-3 bg-[#00B2FF] text-white font-bold rounded-xl shadow-xl active:scale-95 transition-transform"
            >
                СОХРАНИТЬ ({rounds.length > 0 ? 'ACTIVE' : 'LOADING'})
            </button>
        </div>
      )}
    </div>
  );
}