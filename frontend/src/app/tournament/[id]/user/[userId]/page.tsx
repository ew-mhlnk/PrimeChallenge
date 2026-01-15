'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ClosedBracket from '@/components/bracket/ClosedBracket';
import { Tournament } from '@/types';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

// Хелпер авторизации
const waitForTelegram = async () => {
    let attempts = 0;
    while (typeof window !== 'undefined' && !window.Telegram?.WebApp?.initData && attempts < 20) {
        await new Promise(r => setTimeout(r, 100));
        attempts++;
    }
    return typeof window !== 'undefined' ? window.Telegram?.WebApp?.initData : '';
};

export default function UserBracketPage({ params }: { params: Promise<{ id: string; userId: string }> }) {
  const resolvedParams = use(params);
  const { id, userId } = resolvedParams;
  const router = useRouter();
  const { impact } = useHapticFeedback();
  
  const [data, setData] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
      const load = async () => {
          try {
              const initData = await waitForTelegram();
              const res = await fetch(`/api/tournament/${id}/user/${userId}`, {
                  headers: { Authorization: initData || '' }
              });
              
              if (res.status === 403) {
                  setError("Сетка скрыта, пока турнир идет");
                  return;
              }
              if (!res.ok) throw new Error('Ошибка загрузки');
              
              const json = await res.json();
              if (json.viewing_user_name) setUserName(json.viewing_user_name);
              setData(json);
          } catch (e) {
              console.error(e);
              setError("Не удалось загрузить сетку");
          } finally {
              setLoading(false);
          }
      };
      load();
  }, [id, userId]);

  if (loading) return <div className="min-h-screen bg-[#141414] flex items-center justify-center text-[#5F6067]">Загрузка сетки...</div>;
  if (error) return <div className="min-h-screen bg-[#141414] flex items-center justify-center text-red-500">{error}</div>;
  if (!data) return null;

  return (
    <div className="relative">
        {/* Плашка сверху, чтобы было понятно, чью сетку мы смотрим */}
        <div className="fixed top-[15px] left-0 right-0 z-50 flex justify-center pointer-events-none">
            <div className="bg-[#00B2FF]/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20 shadow-xl pointer-events-auto flex items-center gap-2">
                <span className="text-[12px] font-bold text-white">Сетка игрока: {userName}</span>
                <button 
                    onClick={() => { impact('light'); router.back(); }}
                    className="w-5 h-5 flex items-center justify-center bg-white/20 rounded-full ml-1"
                >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
        </div>

        {/* Рендерим сетку */}
        <ClosedBracket tournament={data} />
    </div>
  );
}