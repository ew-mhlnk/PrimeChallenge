'use client';

import { useRouter } from 'next/navigation';
import useTournaments from '../../hooks/useTournaments';
import { Tournament } from '@/types';
import { TournamentListItem } from '@/components/tournament/TournamentListItem';

const BackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 19L8 12L15 5"/></svg>
);

// Хелпер для красивого названия месяца
const formatMonth = (monthStr?: string) => {
    if (!monthStr) return 'Предстоящие';
    // Ожидаем формат "01.2025" или "1"
    const months = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    
    // Если пришло "01.2025"
    if (monthStr.includes('.')) {
        const [m, y] = monthStr.split('.');
        const mIdx = parseInt(m) - 1;
        if (months[mIdx]) return `${months[mIdx]} ${y}`;
    }
    
    // Если просто цифра
    const mIdx = parseInt(monthStr) - 1;
    if (months[mIdx]) return months[mIdx];
    
    return monthStr; // Если формат неизвестен, возвращаем как есть
};

export default function TournamentsPage() {
  const router = useRouter();
  const { tournaments, error, isLoading } = useTournaments();
  
  // Группировка турниров по месяцам
  const groupedTournaments = (tournaments || []).reduce((acc, t) => {
      const key = t.month || 'TBA'; // Если месяца нет
      if (!acc[key]) acc[key] = [];
      acc[key].push(t);
      return acc;
  }, {} as Record<string, Tournament[]>);

  // Сортируем ключи месяцев
  const sortedMonths = Object.keys(groupedTournaments).sort((a, b) => {
      if (a === 'TBA') return 1;
      if (b === 'TBA') return -1;
      
      // Парсим "01.2025" -> Date
      const [m1, y1] = a.split('.').map(Number);
      const [m2, y2] = b.split('.').map(Number);
      
      if (y1 !== y2) return y1 - y2;
      return m1 - m2;
  });

  return (
    <div className="min-h-screen bg-[#141414] text-white flex flex-col pb-32">
      
      {/* Header */}
      <header className="px-6 pt-8 pb-4 flex items-center gap-4 bg-[#141414]/80 backdrop-blur-md sticky top-0 z-20">
        <button 
          onClick={() => router.back()} 
          className="w-8 h-8 flex items-center justify-center rounded-full bg-[#1C1C1E] border border-white/10 active:scale-90 transition-transform"
        >
          <BackIcon />
        </button>
        <h1 className="text-[22px] font-bold text-white">Календарь</h1>
      </header>

      <main className="px-4 flex flex-col gap-6 mt-2">
        {isLoading ? (
            <p className="text-[#5F6067] text-center mt-10">Загрузка календаря...</p>
        ) : error ? (
            <p className="text-red-500 text-center mt-10">Ошибка: {error}</p>
        ) : sortedMonths.length === 0 ? (
            <div className="text-center py-20 opacity-50">Нет турниров</div>
        ) : (
            sortedMonths.map(monthKey => (
                <section key={monthKey}>
                    <h2 className="text-[18px] font-bold text-white mb-3 ml-2 sticky top-[70px] z-10 drop-shadow-md">
                        {formatMonth(monthKey)}
                    </h2>
                    <div className="flex flex-col">
                        {groupedTournaments[monthKey].map(t => (
                            <TournamentListItem key={t.id} tournament={t} />
                        ))}
                    </div>
                </section>
            ))
        )}
      </main>
    </div>
  );
}