'use client';

import { useState } from 'react';
import Link from 'next/link';
import useTournaments from '../hooks/useTournaments';
import { Tournament } from '@/types';
import TagSelector from '../components/TagSelector';

export default function Home() {
  const { tournaments, error } = useTournaments();
  const [selectedTag, setSelectedTag] = useState<string>('ВСЕ');

  if (error) return <p className="text-red-500 px-8 pt-8">Ошибка: {error}</p>;
  if (!tournaments) return <p className="text-[#FFFFFF] px-8 pt-8">Загрузка турниров...</p>;

  const activeTournaments = tournaments.filter((tournament: Tournament) => {
    if (!['ACTIVE', 'CLOSED'].includes(tournament.status)) return false;
    if (selectedTag === 'ВСЕ') return true;
    return tournament.tag === selectedTag;
  });

  return (
    <div className="min-h-screen bg-[#141414] text-white flex flex-col pb-24"> {/* Добавил pb-24 чтобы контент не перекрывался меню */}
      
      {/* Header */}
      <header className="flex justify-between items-start px-8 pt-8 mb-8"> {/* Добавил mb-8 вместо пустых дивов */}
        <div>
          <h1 className="text-[25px] font-bold text-[#00B2FF] text-left leading-none">
            BRACKET CHALLENGE
          </h1>
          <p className="text-[12px] font-normal text-[#FFFFFF] text-left leading-none mt-0">
            BY ПРАЙМСПОРТ
          </p>
        </div>
        <Link href="/profile">
          <div data-svg-wrapper data-layer="Rectangle 533" className="cursor-pointer">
            <svg width="50" height="50" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="1" width="48" height="48" rx="24" fill="url(#paint0_linear_1613_3)" fillOpacity="0.26" stroke="#00B3FF" strokeWidth="2"/>
              <defs>
                <linearGradient id="paint0_linear_1613_3" x1="0.570776" y1="50" x2="48.4078" y2="48.7622" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#008CFF"/>
                  <stop offset="1" stopColor="#0077FF"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
        </Link>
      </header>

      {/* УДАЛИЛ БАННЕР И ОТСТУПЫ */}

      <main className="flex-1 px-8">
        <div className="flex justify-between items-center mb-[15px]">
          <h2 className="text-[20px] font-semibold text-[#FFFFFF] text-left">
            ТУРНИРЫ ЭТОЙ НЕДЕЛИ
          </h2>
          <Link href="/archive">
            <span className="text-[#00B2FF] text-[14px]">Архив</span>
          </Link>
        </div>

        <TagSelector selectedTag={selectedTag} setSelectedTag={setSelectedTag} />

        <div className="space-y-[20px] flex flex-col items-center w-full"> {/* w-full важно для адаптива */}
          {activeTournaments.length === 0 ? (
            <p className="text-[#FFFFFF]">Нет активных турниров</p>
          ) : (
            activeTournaments.map((tournament: Tournament) => (
              <Link href={`/tournament/${tournament.id}`} key={tournament.id} className="w-full max-w-[500px]"> {/* Ограничил ширину карточки, но разрешил растягиваться */}
                <div
                  className="w-full h-[93px] bg-gradient-to-r from-[#1B1A1F] to-[#161616] rounded-[10px] border border-[rgba(255,255,255,0.18)] relative transition-transform active:scale-95"
                >
                  <h3 className="absolute top-[10px] left-[10px] text-[20px] font-semibold text-[#FFFFFF]">
                    {tournament.name}
                  </h3>
                  <p className="absolute top-[35px] left-[10px] text-[10px] font-normal text-[#5F6067]">
                    {tournament.dates || 'Даты не указаны'}
                  </p>
                  {/* Теги... (код тегов тот же) */}
                  <div className="absolute top-[10px] right-[10px] flex items-center justify-center">
                    {/* ... вставьте код SVG тегов обратно, если нужно, он не менялся ... */}
                    {tournament.tag && (
                        <span className="text-xs font-bold text-white px-2 py-1 rounded border border-white/10">
                            {tournament.tag}
                        </span>
                    )}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </main>
    </div>
  );
}