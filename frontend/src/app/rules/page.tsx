'use client';

import { useRouter } from 'next/navigation';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

const BackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 19L8 12L15 5"/></svg>
);

export default function RulesPage() {
  const router = useRouter();
  const { impact } = useHapticFeedback();

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
      <main className="px-6 mt-6 flex flex-col gap-6 text-[#EBEBF5]">
        <section>
            <h2 className="text-lg font-bold text-white mb-2">Об игре</h2>
            <p className="text-sm leading-relaxed opacity-80">
                Prime Bracket — это фэнтези-игра по теннису. Ваша задача — предсказать победителей матчей в турнирной сетке.
            </p>
        </section>

        <section>
            <h2 className="text-lg font-bold text-white mb-2">Начисление очков</h2>
            <ul className="text-sm space-y-2 opacity-80 list-disc pl-4">
                <li><span className="text-[#00B2FF] font-bold">R128 / R64:</span> 1 очко</li>
                <li><span className="text-[#00B2FF] font-bold">R32:</span> 2 очка</li>
                <li><span className="text-[#00B2FF] font-bold">R16:</span> 4 очка</li>
                <li><span className="text-[#00B2FF] font-bold">QF:</span> 8 очков</li>
                <li><span className="text-[#00B2FF] font-bold">SF:</span> 16 очков</li>
                <li><span className="text-[#00B2FF] font-bold">Final:</span> 32 очка</li>
            </ul>
        </section>

        <section>
            <h2 className="text-lg font-bold text-white mb-2">Дейли Челлендж</h2>
            <p className="text-sm leading-relaxed opacity-80">
                Каждый день выбирайте победителей конкретных матчей. За каждый верный прогноз вы получаете +1 балл в ежедневный рейтинг.
            </p>
        </section>
      </main>
    </div>
  );
}