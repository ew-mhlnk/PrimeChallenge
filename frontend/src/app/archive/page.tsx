'use client';

import { useState } from 'react';
import Link from 'next/link';
import useTournaments from '../../hooks/useTournaments';
import { Tournament } from '@/types';
import TagSelector from '../../components/TagSelector';

export default function Archive() {
  const { tournaments, error } = useTournaments();
  const [selectedTag, setSelectedTag] = useState<string>('ВСЕ');

  if (error) {
    return <p className="text-red-500 px-8">Ошибка: {error}</p>;
  }

  if (!tournaments) {
    return <p className="text-[#FFFFFF] px-8">Загрузка турниров...</p>;
  }

  const completedTournaments = tournaments.filter((tournament: Tournament) => {
    // Показываем только турниры со статусом COMPLETED
    if (tournament.status !== 'COMPLETED') return false;
    if (selectedTag === 'ВСЕ') return true;
    return tournament.tag === selectedTag;
  });

  return (
    <div className="min-h-screen bg-[#141414] text-white flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-start px-8 pt-8">
        <div>
          <h1 className="text-[25px] font-bold text-[#00B2FF] text-left leading-none">
            BRACKET CHALLENGE
          </h1>
          <p className="text-[12px] font-normal text-[#FFFFFF] text-left leading-none mt-0">
            BY ПРАЙМСПОРТ
          </p>
        </div>
        <Link href="/profile">
          <div data-svg-wrapper data-layer="Rectangle 533" className="Rectangle533">
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

      <div className="h-[50px]"></div>

      <div className="flex justify-center">
        <div data-layer="Rectangle 541" className="Rectangle541 w-[330px] max-w-[90vw] h-[124px] bg-[#D9D9D9] rounded-[29px]"></div>
      </div>

      <div className="h-[75px]"></div>

      <main className="flex-1 px-8">
        <div className="flex justify-between items-center mb-[15px]">
          <h2 className="text-[20px] font-semibold text-[#FFFFFF] text-left">
            АРХИВ ТУРНИРОВ
          </h2>
          <Link href="/">
            <span className="text-[#00B2FF] text-[14px]">На главную</span>
          </Link>
        </div>

        {/* TagSelector */}
        <TagSelector selectedTag={selectedTag} setSelectedTag={setSelectedTag} />

        <div className="space-y-[20px] flex flex-col items-center">
          {completedTournaments.length === 0 ? (
            <p className="text-[#FFFFFF]">Нет завершённых турниров</p>
          ) : (
            completedTournaments.map((tournament: Tournament) => (
              <Link href={`/tournament/${tournament.id}`} key={tournament.id}>
                <div
                  data-layer="Rectangle 549"
                  className="Rectangle549 w-[330px] max-w-[90vw] h-[93px] bg-gradient-to-r from-[#1B1A1F] to-[#161616] rounded-[10px] border border-[rgba(255,255,255,0.18)] relative"
                >
                  <h3 className="absolute top-[10px] left-[10px] text-[20px] font-semibold text-[#FFFFFF]">
                    {tournament.name}
                  </h3>
                  <p className="absolute top-[35px] left-[10px] text-[10px] font-normal text-[#5F6067]">
                    {tournament.dates || 'Даты не указаны'}
                  </p>
                  <div className="absolute top-[10px] right-[10px] flex items-center justify-center">
                    {tournament.tag === 'ATP' && (
                      <div data-svg-wrapper data-layer="Rectangle 545" className="Rectangle545">
                        <svg width="40" height="20" viewBox="0 0 40 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect width="40" height="20" rx="3.58491" fill="#002BFF"/>
                          <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill="#FFFFFF" fontSize="10" className="font-black">ATP</text>
                        </svg>
                      </div>
                    )}
                    {tournament.tag === 'WTA' && (
                      <div data-svg-wrapper data-layer="Rectangle 545" className="Rectangle545">
                        <svg width="40" height="20" viewBox="0 0 40 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect width="40" height="20" rx="3.58491" fill="#7B00FF"/>
                          <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill="#FFFFFF" fontSize="10" className="font-black">WTA</text>
                        </svg>
                      </div>
                    )}
                    {tournament.tag === 'ТБШ' && (
                      <div data-svg-wrapper data-layer="Rectangle 545" className="Rectangle545">
                        <svg width="40" height="20" viewBox="0 0 40 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect width="40" height="20" rx="3.58491" fill="url(#paint0_linear_1872_30)"/>
                          <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill="#FFFFFF" fontSize="10" className="font-black">ТБШ</text>
                          <defs>
                            <linearGradient id="paint0_linear_1872_30" x1="20" y1="0" x2="20" y2="20" gradientUnits="userSpaceOnUse">
                              <stop stopColor="#FDF765"/>
                              <stop offset="1" stopColor="#DAB07F"/>
                            </linearGradient>
                          </defs>
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </main>

      <div className="h-[19px]"></div>
    </div>
  );
}