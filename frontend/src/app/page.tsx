'use client';

import { useState } from 'react';
import Link from 'next/link';
import useTournaments from '../hooks/useTournaments';
import { Tournament } from '@/types';

export default function Home() {
  const { tournaments, error } = useTournaments();
  const [selectedTag, setSelectedTag] = useState<string>('все');

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  // Фильтруем турниры по статусу "ACTIVE" и тегу
  const activeTournaments = tournaments.filter((tournament: Tournament) => {
    if (tournament.status !== 'ACTIVE') return false;
    if (selectedTag === 'все') return true;
    return tournament.tag === selectedTag;
  });

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-start px-4 pt-4">
        {/* Title and Subtitle */}
        <div>
          <h1 className="text-[25px] font-bold text-[#00B2FF] text-left leading-none">
            BRACKET CHALLENGE
          </h1>
          <p className="text-[12px] font-normal text-[#FFFFFF] text-left leading-none mt-0">
            BY ПРАЙМСПОРТ
          </p>
        </div>

        {/* Profile Button */}
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

      {/* Spacer */}
      <div className="h-[35px]"></div>

      {/* Bento Banner */}
      <div className="flex justify-center">
        <div data-layer="Rectangle 541" className="Rectangle541 w-[330px] h-[124px] bg-[#D9D9D9] rounded-[29px]"></div>
      </div>

      {/* Spacer */}
      <div className="h-[75px]"></div>

      {/* Tournaments Section */}
      <main className="flex-1 px-4">
        <h2 className="text-[20px] font-semibold text-[#FFFFFF] text-center mb-[15px]">
          ТУРНИРЫ ЭТОЙ НЕДЕЛИ
        </h2>

        {/* Tags */}
        <div className="flex justify-center space-x-[15px] mb-[40px]">
          <div
            data-svg-wrapper
            data-layer="Rectangle 545"
            className={`Rectangle545 cursor-pointer ${selectedTag === 'все' ? 'ring-2 ring-[#FF8000]' : ''}`}
            onClick={() => setSelectedTag('все')}
          >
            <svg width="38" height="15" viewBox="0 0 38 15" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="38" height="14.3396" rx="3.58491" fill="#FF8000"/>
              <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill="#FFFFFF" fontSize="10">все</text>
            </svg>
          </div>
          <div
            data-svg-wrapper
            data-layer="Rectangle 545"
            className={`Rectangle545 cursor-pointer ${selectedTag === 'ATP' ? 'ring-2 ring-[#002BFF]' : ''}`}
            onClick={() => setSelectedTag('ATP')}
          >
            <svg width="38" height="15" viewBox="0 0 38 15" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="38" height="14.3396" rx="3.58491" fill="#002BFF"/>
              <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill="#FFFFFF" fontSize="10">ATP</text>
            </svg>
          </div>
          <div
            data-svg-wrapper
            data-layer="Rectangle 545"
            className={`Rectangle545 cursor-pointer ${selectedTag === 'WTA' ? 'ring-2 ring-[#7B00FF]' : ''}`}
            onClick={() => setSelectedTag('WTA')}
          >
            <svg width="38" height="15" viewBox="0 0 38 15" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="38" height="14.3396" rx="3.58491" fill="#7B00FF"/>
              <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill="#FFFFFF" fontSize="10">WTA</text>
            </svg>
          </div>
          <div
            data-layer="Rectangle 545"
            className={`Rectangle545 cursor-pointer ${selectedTag === 'ТБШ' ? 'ring-2 ring-[#FDF765]' : ''}`}
            style={{ width: '93.87px', height: '14.34px', background: 'linear-gradient(180deg, #FDF765 0%, #7D490E 100%)', borderRadius: '3.58px' }}
            onClick={() => setSelectedTag('ТБШ')}
          >
            <div className="flex items-center justify-center h-full">
              <span className="text-[#FFFFFF] text-[10px] font-medium">ТБШ</span>
            </div>
          </div>
        </div>

        {/* Tournament Cards */}
        <div className="space-y-[20px] flex flex-col items-center">
          {activeTournaments.length === 0 ? (
            <p className="text-[#FFFFFF]">Нет активных турниров</p>
          ) : (
            activeTournaments.map((tournament: Tournament) => (
              <Link href={`/bracket/${tournament.id}`} key={tournament.id}>
                <div
                  data-layer="Rectangle 549"
                  className="Rectangle549 w-[330px] h-[93px] bg-gradient-to-r from-[#1B1A1F] to-[#161616] rounded-[10px] border border-[rgba(255,255,255,0.18)] relative"
                >
                  {/* Tournament Name */}
                  <h3 className="absolute top-[10px] left-[10px] text-[20px] font-semibold text-[#FFFFFF]">
                    {tournament.name}
                  </h3>
                  {/* Tournament Dates */}
                  <p className="absolute top-[35px] left-[10px] text-[10px] font-normal text-[#5F6067]">
                    {tournament.dates}
                  </p>
                  {/* Tournament Tag */}
                  <div className="absolute top-[10px] right-[10px] flex items-center justify-center">
                    {tournament.tag === 'ATP' && (
                      <div data-svg-wrapper data-layer="Rectangle 545" className="Rectangle545">
                        <svg width="38" height="15" viewBox="0 0 38 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect width="38" height="14.3396" rx="3.58491" fill="#002BFF"/>
                          <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill="#FFFFFF" fontSize="10">ATP</text>
                        </svg>
                      </div>
                    )}
                    {tournament.tag === 'WTA' && (
                      <div data-svg-wrapper data-layer="Rectangle 545" className="Rectangle545">
                        <svg width="38" height="15" viewBox="0 0 38 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect width="38" height="14.3396" rx="3.58491" fill="#7B00FF"/>
                          <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill="#FFFFFF" fontSize="10">WTA</text>
                        </svg>
                      </div>
                    )}
                    {tournament.tag === 'ТБШ' && (
                      <div
                        data-layer="Rectangle 545"
                        className="Rectangle545"
                        style={{ width: '93.87px', height: '14.34px', background: 'linear-gradient(180deg, #FDF765 0%, #7D490E 100%)', borderRadius: '3.58px' }}
                      >
                        <div className="flex items-center justify-center h-full">
                          <span className="text-[#FFFFFF] text-[10px] font-medium">ТБШ</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </main>

      {/* Spacer before Footer */}
      <div className="h-[65px]"></div>

      {/* Footer Navigation */}
      <footer className="bg-[#1B1A1F] w-full h-[39px] flex justify-center items-center">
        <div className="flex space-x-[70px]">
          <div
            data-layer="Rectangle 544"
            className="Rectangle544 w-[120px] h-[29px] bg-[#131215] rounded-[16.5px] border border-[#141414] flex items-center justify-center"
          >
            <Link href="/" className="text-[#FFFFFF] text-[14px] font-medium">Активные</Link>
          </div>
          <div className="flex items-center justify-center w-[120px] h-[29px]">
            <Link href="/archive" className="text-[#FFFFFF] text-[14px] font-medium">Архив</Link>
          </div>
          <div className="flex items-center justify-center w-[120px] h-[29px]">
            <Link href="/leaderboard" className="text-[#FFFFFF] text-[14px] font-medium">Лидерборд</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}