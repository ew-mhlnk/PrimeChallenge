'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import Link from 'next/link';
import useSWR from 'swr';

interface TournamentRanked {
    id: number;
    name: string;
    dates: string;
    status: string;
    type: string;
    tag: string;
    my_rank: number | null;
    total_participants: number;
    isGroup?: boolean;
    atpId?: number;
    wtaId?: number;
}

const fetcher = async (url: string) => {
    let attempts = 0;
    while (typeof window !== 'undefined' && !window.Telegram?.WebApp?.initData && attempts < 20) {
        await new Promise(r => setTimeout(r, 100));
        attempts++;
    }
    const initData = typeof window !== 'undefined' ? window.Telegram?.WebApp?.initData : '';
    const res = await fetch(url, { headers: { Authorization: initData || '' } });
    if (!res.ok) throw new Error('Failed to load');
    return res.json();
};

const getTagColor = (tag?: string) => {
    const t = tag?.toUpperCase() || '';
    if (t === 'WTA') return 'bg-[#7B00FF]/20 text-[#D0bcff] border-[#7B00FF]/30';
    if (t === 'ATP') return 'bg-[#002BFF]/20 text-[#8E8E93] border-[#002BFF]/30';
    if (t === 'ТБШ' || t.includes('SLAM')) return 'bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/20';
    return 'bg-white/10 text-white/70 border-white/5';
};

const LeaderboardTournamentCard = ({ item }: { item: TournamentRanked }) => {
    const { impact } = useHapticFeedback();
    
    // ЛОГИКА ССЫЛКИ
    // Если это группа (ТБШ) -> ведем на страницу GrandSlam с параметрами
    // Если обычный -> ведем на страницу [id]
    const href = item.isGroup 
        ? `/leaderboard/grandslam?atp=${item.atpId}&wta=${item.wtaId}&name=${encodeURIComponent(item.name)}`
        : `/leaderboard/tournaments/${item.id}`;

    const badgeStyle = getTagColor(item.tag);
    
    const rankText = item.my_rank 
        ? <><span className="text-[#00B2FF] font-bold">{item.my_rank}</span><span className="text-[#5F6067]">/{item.total_participants}</span></>
        : <span className="text-[#5F6067] text-[10px]">нет участия</span>;

    return (
        <Link href={href} onClick={() => impact('light')}>
            <motion.div 
                whileTap={{ scale: 0.98 }} 
                className="bg-[#1C1C1E] p-4 rounded-[24px] border border-white/5 flex justify-between items-center mb-3 transition-colors active:bg-[#2C2C2E]"
            >
                <div>
                    <h3 className="font-bold text-white text-[15px] leading-tight mb-1.5">
                        {item.name}
                    </h3>
                    <div className="flex gap-2 text-xs items-center">
                        <span className={`px-1.5 py-0.5 rounded-[6px] text-[10px] font-bold uppercase border ${badgeStyle}`}>
                            {item.tag || 'ATP'}
                        </span>
                        {item.isGroup && <span className="text-[10px] text-[#8E8E93] border border-white/10 px-1.5 py-0.5 rounded">M + W</span>}
                        <span className="text-[#8E8E93] text-[11px]">{item.dates}</span>
                    </div>
                </div>

                <div className="flex flex-col items-end justify-center pl-4">
                    {!item.isGroup ? (
                        <>
                            <div className="bg-[#141414] rounded-[12px] px-3 py-1.5 border border-white/5 flex items-center gap-1 text-sm font-mono">
                                {rankText}
                            </div>
                            <span className="text-[9px] text-[#5F6067] mt-1 pr-1">ваше место</span>
                        </>
                    ) : (
                        <div className="bg-[#FFD700]/10 rounded-full w-8 h-8 flex items-center justify-center border border-[#FFD700]/30">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                        </div>
                    )}
                </div>
            </motion.div>
        </Link>
    );
}

export default function TournamentListLeaderboard() {
  const router = useRouter();
  const { impact } = useHapticFeedback();
  
  const { data, isLoading } = useSWR<TournamentRanked[]>(
      '/api/leaderboard/list', 
      fetcher,
      { dedupingInterval: 300000, revalidateOnFocus: false, keepPreviousData: true }
  );

  // === ГРУППИРОВКА ДЛЯ ТБШ (ROLAND GARROS НАВЕРХУ) ===
  const processedTournaments = (() => {
      if (!data) return [];
      const result: TournamentRanked[] = [];
      const usedIds = new Set<number>();

      // 1. Сначала ищем Roland Garros (Ролан Гаррос) для закрепления сверху
      const rgATP = data.find(t => !usedIds.has(t.id) && (t.name.toLowerCase().includes('roland') || t.name.toLowerCase().includes('ролан')) && t.name.toUpperCase().includes('ATP'));
      const rgWTA = data.find(t => !usedIds.has(t.id) && (t.name.toLowerCase().includes('roland') || t.name.toLowerCase().includes('ролан')) && t.name.toUpperCase().includes('WTA'));
      
      if (rgATP && rgWTA) {
          result.push({
              id: 0, 
              name: "Roland Garros",
              dates: rgATP.dates,
              status: rgATP.status,
              type: 'Combined',
              tag: 'ТБШ',
              my_rank: null, 
              total_participants: 0,
              isGroup: true,
              atpId: rgATP.id,
              wtaId: rgWTA.id
          });
          usedIds.add(rgATP.id);
          usedIds.add(rgWTA.id);
      }

      // 2. Ищем Australian Open (динамически по имени или ID)
      const aoMen = data.find(t => !usedIds.has(t.id) && (t.id === 11 || t.name.toLowerCase().includes('australian') || t.name.toLowerCase().includes('австрали')) && t.name.toUpperCase().includes('ATP'));
      const aoWomen = data.find(t => !usedIds.has(t.id) && (t.id === 10 || t.name.toLowerCase().includes('australian') || t.name.toLowerCase().includes('австрали')) && t.name.toUpperCase().includes('WTA'));
      
      if (aoMen && aoWomen) {
          result.push({
              id: 0, 
              name: "Australian Open",
              dates: aoMen.dates,
              status: aoMen.status,
              type: 'Combined',
              tag: 'ТБШ',
              my_rank: null, 
              total_participants: 0,
              isGroup: true,
              atpId: aoMen.id,
              wtaId: aoWomen.id
          });
          usedIds.add(aoMen.id);
          usedIds.add(aoWomen.id);
      }

      // 3. Обрабатываем остальные турниры (по стандартной логике)
      data.forEach(t => {
          if (usedIds.has(t.id)) return;
          const isSlam = t.tag && (t.tag.includes('ТБШ') || t.tag.includes('Grand Slam'));
          if (isSlam) {
              const baseName = t.name.split(' ').slice(0, 2).join(' '); 
              const pair = data.find(p => p.id !== t.id && !usedIds.has(p.id) && p.name.includes(baseName));
              if (pair) {
                  const atp = t.name.includes('ATP') ? t : pair;
                  const wta = t.name.includes('ATP') ? pair : t;
                  result.push({
                      id: 0, 
                      name: baseName,
                      dates: t.dates,
                      status: t.status,
                      type: 'Combined',
                      tag: 'ТБШ',
                      my_rank: null,
                      total_participants: 0,
                      isGroup: true,
                      atpId: atp.id,
                      wtaId: wta.id
                  });
                  usedIds.add(t.id);
                  usedIds.add(pair.id);
              } else {
                  result.push(t);
                  usedIds.add(t.id);
              }
          } else {
              result.push(t);
              usedIds.add(t.id);
          }
      });
      return result;
  })();

  return (
    <div className="min-h-screen bg-[#141414] text-white pb-32">
      <header className="px-6 pt-8 pb-4 flex items-center gap-4 sticky top-0 bg-[#141414]/95 backdrop-blur z-20 border-b border-white/5">
        <button onClick={() => { impact('light'); router.back(); }} className="w-10 h-10 flex items-center justify-center rounded-full bg-[#1C1C1E] border border-white/10 active:scale-90 transition-transform">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 19L8 12L15 5"/></svg>
        </button>
        <h1 className="text-[20px] font-bold">Выберите турнир</h1>
      </header>

      <main className="px-4 mt-4 animate-fade-in">
        {isLoading && !data ? (
            <div className="flex justify-center mt-20"><div className="w-6 h-6 border-2 border-[#00B2FF] border-t-transparent rounded-full animate-spin" /></div>
        ) : (
            <div className="flex flex-col">
                {processedTournaments.length > 0 ? (
                    processedTournaments.map((item, i) => (
                        <LeaderboardTournamentCard key={item.id || i} item={item} />
                    ))
                ) : (
                    <div className="text-center mt-20 opacity-50 text-sm">Нет турниров</div>
                )}
            </div>
        )}
      </main>
    </div>
  );
}