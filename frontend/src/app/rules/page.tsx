'use client';

import { useRouter } from 'next/navigation';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

const BackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 19L8 12L15 5"/></svg>
);

export default function RulesPage() {
  const router = useRouter();
  const { impact } = useHapticFeedback();

  // Данные для таблицы (строго как в твоем конфиге)
  const rows = [
      { round: 'R128', slam: 1,  m1000: 1,  m500: '-', m250: '-' },
      { round: 'R64',  slam: 2,  m1000: 1,  m500: 1,   m250: 1 },
      { round: 'R32',  slam: 4,  m1000: 2,  m500: 1,   m250: 1 },
      { round: 'R16',  slam: 8,  m1000: 4,  m500: 2,   m250: 2 },
      { round: 'QF',   slam: 12, m1000: 8,  m500: 4,   m250: 3 },
      { round: 'SF',   slam: 16, m1000: 12, m500: 8,   m250: 4 },
      { round: 'Final',slam: 20, m1000: 16, m500: 12,  m250: 6 },
  ];

  return (
    <div className="min-h-screen bg-[#141414] text-white pb-32">
      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-[#141414]/95 backdrop-blur-md pt-6 pb-4 px-6 border-b border-white/5">
        <div className="relative flex items-center justify-center min-h-[40px]">
            <button 
                onClick={() => { impact('light'); router.back(); }} 
                className="absolute left-0 w-10 h-10 flex items-center justify-center rounded-full bg-[#1C1C1E] border border-white/5 active:scale-90 transition-transform"
            >
                <BackIcon />
            </button>
            <h1 className="text-[20px] font-bold text-white tracking-tight leading-none">
                Правила
            </h1>
        </div>
      </header>

      {/* CONTENT */}
      <main className="px-5 mt-6 flex flex-col gap-8 text-[#EBEBF5]">
        
        {/* Вступление */}
        <section>
            <h2 className="text-[17px] font-black text-white mb-2 uppercase tracking-wide">Об игре</h2>
            <p className="text-[13px] leading-relaxed text-[#8E8E93]">
                Prime Bracket — это фэнтези-игра по теннису. Ваша задача — предсказать победителей всех матчей в турнирной сетке до начала турнира.
            </p>
        </section>

        {/* Таблица очков */}
        <section>
            <h2 className="text-[17px] font-black text-white mb-3 uppercase tracking-wide">Система очков</h2>
            
            <div className="overflow-hidden rounded-[16px] border border-white/10 bg-[#1C1C1E]">
                <table className="w-full text-[11px] text-center">
                    <thead>
                        <tr className="bg-white/5 border-b border-white/10 text-[#8E8E93]">
                            <th className="py-3 px-1 font-bold text-left pl-4">Раунд</th>
                            <th className="py-3 px-1 font-bold text-[#FFD700]">ТБШ</th>
                            <th className="py-3 px-1 font-bold">1000</th>
                            <th className="py-3 px-1 font-bold">500</th>
                            <th className="py-3 px-1 font-bold">250</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {rows.map((row, i) => (
                            <tr key={i} className="hover:bg-white/5 transition-colors">
                                <td className="py-2.5 px-1 font-bold text-left pl-4 text-white">{row.round}</td>
                                <td className="py-2.5 px-1 font-bold text-[#FFD700]">{row.slam}</td>
                                <td className="py-2.5 px-1 font-medium text-[#EBEBF5]">{row.m1000}</td>
                                <td className="py-2.5 px-1 font-medium text-[#8E8E93]">{row.m500}</td>
                                <td className="py-2.5 px-1 font-medium text-[#5F6067]">{row.m250}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="text-[10px] text-[#5F6067] mt-2 italic">
                * Очки начисляются за каждый угаданный исход в соответствующем раунде.
            </p>
        </section>

        {/* Дейли Челлендж */}
        <section>
            <h2 className="text-[17px] font-black text-white mb-2 uppercase tracking-wide">Дейли Челлендж</h2>
            <p className="text-[13px] leading-relaxed text-[#8E8E93]">
                В ежедневном режиме вы выбираете победителей конкретных матчей игрового дня. 
                <br/><br/>
                <span className="text-white font-bold">• 1 верный прогноз = 1 балл</span> в ежедневный рейтинг.
            </p>
        </section>

      </main>
    </div>
  );
}