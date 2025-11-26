'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import useAuth from '../../hooks/useAuth';
import { ProfileStats } from '@/types';

// Хелпер для ожидания Telegram InitData
const waitForTelegram = async () => {
    let attempts = 0;
    while (!window.Telegram?.WebApp?.initData && attempts < 20) {
        await new Promise(r => setTimeout(r, 100));
        attempts++;
    }
    return window.Telegram?.WebApp?.initData;
};

export default function Profile() {
  // ИСПРАВЛЕНО: Убрали 'user', так как он не используется. Оставили только isLoading.
  const { isLoading: authLoading } = useAuth();
  
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const initData = await waitForTelegram();
        // Если нет initData, просто выходим (useAuth обработает редирект или состояние, если нужно)
        if (!initData) return;

        const response = await fetch('/api/users/profile/stats', {
          headers: { Authorization: initData },
          cache: 'no-store'
        });

        if (!response.ok) throw new Error('Не удалось загрузить статистику');
        
        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError('Ошибка загрузки профиля');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (authLoading || loading) return <div className="p-8 text-[#5F6067]">Загрузка профиля...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;
  if (!stats) return null;

  return (
    <div className="min-h-screen bg-[#141414] text-white pb-24">
      {/* Header */}
      <div className="px-6 pt-8 mb-8">
        <h1 className="text-2xl font-bold text-[#00B2FF] mb-1">Личный кабинет</h1>
        <p className="text-xl text-white font-semibold">
          Добро пожаловать, <span className="text-[#00B2FF]">{stats.name}</span>!
        </p>
      </div>

      {/* 1. Сводная таблица (Cumulative) */}
      <section className="px-4 mb-10">
        <h2 className="text-lg font-bold mb-4 px-2">Статистика 2025</h2>
        <div className="overflow-x-auto rounded-xl border border-[#333] bg-[#1B1B1B]">
          <table className="w-full text-sm text-left min-w-[600px]">
            <thead className="text-xs text-[#8E8E93] uppercase bg-[#252525] border-b border-[#333]">
              <tr>
                <th className="px-4 py-3">Категория</th>
                <th className="px-4 py-3">Ранг</th>
                <th className="px-4 py-3">Очки</th>
                <th className="px-4 py-3 text-center">Верно</th>
                <th className="px-4 py-3 text-center">Неверно</th>
                <th className="px-4 py-3">%</th>
                <th className="px-4 py-3 text-center">Турниры</th>
              </tr>
            </thead>
            <tbody>
              {stats.cumulative.map((row, idx) => (
                <tr key={idx} className="border-b border-[#333] hover:bg-[#222] transition">
                  <td className="px-4 py-3 font-medium text-white">{row.category}</td>
                  <td className="px-4 py-3 text-[#00B2FF]">#{row.rank} <span className="text-[#5F6067]">/ {row.total_participants}</span></td>
                  <td className="px-4 py-3 font-bold">{row.points}</td>
                  <td className="px-4 py-3 text-center text-green-500">{row.correct_picks}</td>
                  <td className="px-4 py-3 text-center text-red-500">{row.incorrect_picks}</td>
                  <td className="px-4 py-3">{row.percent_correct}</td>
                  <td className="px-4 py-3 text-center">{row.total_brackets}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 2. История турниров */}
      <section className="px-4">
        <h2 className="text-lg font-bold mb-4 px-2">История турниров</h2>
        {stats.history.length === 0 ? (
            <p className="text-[#5F6067] px-2">Вы пока не участвовали в турнирах.</p>
        ) : (
            <div className="overflow-x-auto rounded-xl border border-[#333] bg-[#1B1B1B]">
            <table className="w-full text-sm text-left min-w-[600px]">
                <thead className="text-xs text-[#8E8E93] uppercase bg-[#252525] border-b border-[#333]">
                <tr>
                    <th className="px-4 py-3">Турнир</th>
                    <th className="px-4 py-3">Ранг</th>
                    <th className="px-4 py-3">Очки</th>
                    <th className="px-4 py-3 text-center">Верно</th>
                    <th className="px-4 py-3 text-center">Неверно</th>
                    <th className="px-4 py-3">%</th>
                </tr>
                </thead>
                <tbody>
                {stats.history.map((row) => (
                    <tr key={row.tournament_id} className="border-b border-[#333] hover:bg-[#222] transition">
                    <td className="px-4 py-3 font-medium text-[#00B2FF]">
                        <Link href={`/tournament/${row.tournament_id}`}>{row.name}</Link>
                    </td>
                    <td className="px-4 py-3">#{row.rank} <span className="text-[#5F6067]">/ {row.total_participants}</span></td>
                    <td className="px-4 py-3 font-bold">{row.points}</td>
                    <td className="px-4 py-3 text-center text-green-500">{row.correct_picks}</td>
                    <td className="px-4 py-3 text-center text-red-500">{row.incorrect_picks}</td>
                    <td className="px-4 py-3">{row.percent_correct}</td>
                    </tr>
                ))}
                </tbody>
            </table>
            </div>
        )}
      </section>
    </div>
  );
}