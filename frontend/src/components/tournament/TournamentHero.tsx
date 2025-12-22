'use client';

import { Tournament } from '@/types';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

const BackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 19L8 12L15 5"/></svg>
);
const LocationIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>);
const SurfaceIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h20"/><path d="M12 2v20"/><path d="M4.93 4.93l14.14 14.14"/><path d="M19.07 4.93L4.93 19.07"/></svg>);
const MatchesIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>);

const getImageUrl = (url?: string) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `/tournaments/${url}`;
};

interface HeroProps {
    tournament: Tournament;
    winnerName?: string | null; // Если передан, показываем как победителя текущего года
}

export const TournamentHero = ({ tournament, winnerName }: HeroProps) => {
  const router = useRouter();
  const imageSrc = getImageUrl(tournament.image_url);
  const { impact } = useHapticFeedback();

  const [isExpanded, setIsExpanded] = useState(false);
  const toggleDescription = () => { impact('light'); setIsExpanded(!isExpanded); };
  
  const isLongDescription = tournament.description && tournament.description.length > 120;
  
  // Определяем, кого показывать: Чемпиона 2025 или Прошлогоднего
  const championLabel = winnerName ? "Победитель 2025:" : "Действующий чемпион:";
  const championName = winnerName || tournament.defending_champion;

  return (
      <div className="relative w-full shrink-0 h-[45vh] min-h-[380px]">
          {/* ФОТО */}
          {imageSrc ? (
              <div className="absolute inset-0">
                  <Image 
                    src={imageSrc} 
                    alt={tournament.name} 
                    fill 
                    className="object-cover object-top" 
                    priority
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(20, 20, 20, 0) 40%, rgba(20, 20, 20, 0.8) 70%, #000000 100%)' }} />
              </div>
          ) : (
              <div className="absolute inset-0 bg-gradient-to-b from-[#0B80B3] to-[#000000]" />
          )}

          {/* Кнопка Назад */}
          <button 
            onClick={() => { impact('light'); router.back(); }} 
            className="absolute top-6 left-6 w-10 h-10 flex items-center justify-center rounded-full bg-black/20 backdrop-blur-md border border-white/10 active:scale-90 transition-transform z-30"
          >
            <BackIcon />
          </button>

          {/* КОНТЕНТ */}
          <div className="absolute bottom-4 left-6 right-6 z-20 flex flex-col gap-3">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                  <h1 className="text-[28px] font-bold leading-tight drop-shadow-md">
                      {tournament.name} <span className="text-white/60 font-normal text-[20px] ml-2">| {tournament.type}</span>
                  </h1>
              </motion.div>

              {tournament.description && (
                  <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-start">
                      <p className={`text-[14px] text-[#EBEBF5]/80 leading-snug font-medium pr-4 transition-all duration-300 ${isExpanded ? '' : 'line-clamp-2'}`}>
                          {tournament.description}
                      </p>
                      {isLongDescription && (
                          <button onClick={toggleDescription} className="text-[#00B2FF] text-[12px] font-bold mt-1 active:opacity-70">
                              {isExpanded ? 'Скрыть' : 'Еще'}
                          </button>
                      )}
                  </motion.div>
              )}

              <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-2 mt-1">
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-white/90 font-medium">
                      <div className="flex items-center gap-1.5"><LocationIcon /><span>{tournament.name}</span></div>
                      {tournament.surface && <div className="flex items-center gap-1.5"><SurfaceIcon /><span>{tournament.surface}</span></div>}
                      {tournament.matches_count && <div className="flex items-center gap-1.5"><MatchesIcon /><span>{tournament.matches_count} матчей</span></div>}
                  </div>

                  {championName && (
                      <div className="flex items-center gap-2 text-[13px]">
                          <span className="text-[#8E8E93]">{championLabel}</span>
                          <span className="text-white font-semibold">{championName}</span>
                      </div>
                  )}
              </motion.div>
          </div>
      </div>
  );
};