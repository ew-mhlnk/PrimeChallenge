'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import useAuth from '../../hooks/useAuth';
import { ProfileStats, TournamentHistoryRow } from '@/types';

// --- ИСПРАВЛЕНИЕ: Добавлен интерфейс ---
interface FilterPillProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

// Компонент тега (встроенный)
const FilterPill = ({ label, isActive, onClick }: FilterPillProps) => (
  <button
    onClick={onClick}
    className={`
      px-5 py-2 rounded-full text-[13px] font-bold tracking-wide transition-all duration-300
      ${isActive ? 'bg-[#00B2FF] text-white shadow-[0_0_15px_rgba(0,178,255,0.4)]' : 'bg-[#1C1C1E] text-[#8E8E93] border border-white/5'}
    `}
  >
    {label}
  </button>
);

const waitForTelegram = async () => {
    let attempts = 0;
    while (!window.Telegram?.WebApp?.initData && attempts < 20) {
        await new Promise(r => setTimeout(r, 100));
        attempts++;
    }
    return window.Telegram?.WebApp?.initData;
};

export default function Profile() {
  const { isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string>('ВСЕ');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const initData = await waitForTelegram();
        if (!initData) return;

        const response = await fetch('/api/users/profile/stats', {
          headers: { Authorization: initData },
          cache: 'no-store'
        });

        if (!response.ok) throw new Error('Не удалось загрузить статистику');
        const data = await response.json();
        setStats(data);
      } catch (err) {
        // --- ИСПРАВЛЕНИЕ: Используем переменную err ---
        console.error(err);
        setError('Ошибка загрузки профиля');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const filteredHistory = stats?.history.filter((item: TournamentHistoryRow) => {
      if (selectedTag === 'ВСЕ') return true;
      return item.tag === selectedTag;
  }) || [];

  if (authLoading || loading) return <div className="p-8 text-[#5F6067] flex justify-center mt-20">Загрузка...</div>;
  if (error) return <div className="p-8 text-red-500 text-center mt-20">{error}</div>;
  if (!stats) return null;

  return (
    <div className="min-h-screen bg-[#141414] text-white flex flex-col relative overflow-x-hidden pb-32">
      
      {/* --- BACKGROUND BLUR --- */}
      <div 
        className="fixed top-[-100px] left-[-100px] w-[453px] h-[453px] rounded-full pointer-events-none"
        style={{
          background: '#0B80B3',
          filter: 'blur(90px)',
          opacity: 0.5,
          transform: 'rotate(-60deg)',
          zIndex: 0
        }}
      />

      <main className="relative z-10 px-6 pt-10 flex flex-col gap-8">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white leading-tight">Профиль</h1>
          <p className="text-[15px] text-[#8E8E93] mt-1 font-medium">
            Статистика <span className="text-[#00B2FF]">@{stats.name}</span>
          </p>
        </div>

        {/* 1. Сводная таблица (Стекло) */}
        <section>
          <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[#1C1C1E]/80 backdrop-blur-xl shadow-2xl">
            <table className="w-full text-sm text-left">
              <thead className="text-[11px] text-[#8E8E93] uppercase bg-white/5 border-b border-white/5">
                <tr>
                  <th className="px-4 py-3 font-semibold">Категория</th>
                  <th className="px-4 py-3 font-semibold text-center">Ранг</th>
                  <th className="px-4 py-3 font-semibold text-center">Очки</th>
                  <th className="px-4 py-3 font-semibold text-right">%</th>
                </tr>
              </thead>
              <tbody>
                {stats.cumulative.map((row, idx) => (
                  <tr key={idx} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition">
                    <td className="px-4 py-3 font-medium text-white">{row.category}</td>
                    <td className="px-4 py-3 text-center">
                        <span className="text-[#00B2FF] font-bold">#{row.rank}</span>
                        <span className="text-[#5F6067] text-[10px] block">/ {row.total_participants}</span>
                    </td>
                    <td className="px-4 py-3 text-center font-bold">{row.points}</td>
                    <td className="px-4 py-3 text-right text-[#32D74B] font-medium">{row.percent_correct}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 2. История турниров */}
        <section>
          <div className="flex justify-between items-center mb-4">
             <h2 className="text-xl font-bold text-white">История</h2>
          </div>
          
          {/* Фильтры */}
          <div className="flex gap-2 overflow-x-auto pb-4 -mx-6 px-6 scrollbar-hide mb-2">
            {['ВСЕ', 'ATP', 'WTA', 'ТБШ'].map(tag => (
                <FilterPill key={tag} label={tag} isActive={selectedTag === tag} onClick={() => setSelectedTag(tag)} />
            ))}
          </div>

          {filteredHistory.length === 0 ? (
              <div className="text-center py-10 rounded-[24px] bg-[#1C1C1E] border border-white/5">
                  <p className="text-[#5F6067]">История пуста</p>
              </div>
          ) : (
              <div className="flex flex-col gap-3">
                {filteredHistory.map((row) => (
                    <Link href={`/tournament/${row.tournament_id}`} key={row.tournament_id}>
                        <div className="bg-[#1C1C1E] rounded-[20px] p-4 border border-white/5 flex justify-between items-center active:scale-[0.98] transition-transform">
                            <div>
                                <h3 className="font-bold text-[15px] text-white mb-1">{row.name}</h3>
                                <div className="flex gap-3 text-[12px] text-[#8E8E93]">
                                    <span>#{row.rank} место</span>
                                    <span className="text-[#00B2FF]">{row.points} pts</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="block text-[14px] font-bold text-[#32D74B]">{row.percent_correct}</span>
                                <span className="text-[10px] text-[#5F6067]">точность</span>
                            </div>
                        </div>
                    </Link>
                ))}
              </div>
          )}
        </section>

      </main>
    </div>
  );
}