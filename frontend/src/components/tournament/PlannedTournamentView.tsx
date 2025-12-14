'use client';

import { Tournament } from '@/types';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';

const BackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 19L8 12L15 5"/></svg>
);

const LocationIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
);

const SurfaceIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h20"/><path d="M12 2v20"/><path d="M4.93 4.93l14.14 14.14"/><path d="M19.07 4.93L4.93 19.07"/></svg>
);

const MatchesIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
);

// Хелпер для формирования пути к картинке
const getImageUrl = (url?: string) => {
    if (!url) return null;
    // Если это полная ссылка (https://...) - оставляем как есть
    if (url.startsWith('http')) return url;
    // Если это просто имя файла (brisbane.jpg) - ищем в папке public/tournaments
    return `/tournaments/${url}`;
};

export default function PlannedTournamentView({ tournament }: { tournament: Tournament }) {
  const router = useRouter();
  
  const imageSrc = getImageUrl(tournament.image_url);

  return (
    <div className="min-h-screen bg-[#141414] text-white flex flex-col relative overflow-hidden">
      
      {/* --- HERO IMAGE BLOCK --- */}
      <div className="relative w-full h-[65vh]">
          {/* Фото */}
          {imageSrc ? (
              <div className="absolute inset-0">
                  <Image 
                    src={imageSrc} 
                    alt={tournament.name} 
                    fill 
                    className="object-cover"
                    priority
                    // Если картинки локальные, Next.js может попросить sizes для оптимизации
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                  {/* Градиент затемнения снизу */}
                  <div 
                    className="absolute bottom-0 left-0 right-0 h-[400px]"
                    style={{ background: 'linear-gradient(180deg, rgba(20, 20, 20, 0) 0%, #141414 100%)' }}
                  />
              </div>
          ) : (
              <div className="absolute inset-0 bg-gradient-to-b from-[#0B80B3] to-[#141414]" />
          )}

          {/* Кнопка Назад */}
          <button 
            onClick={() => router.back()} 
            className="absolute top-8 left-6 w-10 h-10 flex items-center justify-center rounded-full bg-black/30 backdrop-blur-md border border-white/10 active:scale-90 transition-transform z-20"
          >
            <BackIcon />
          </button>

          {/* КОНТЕНТ ПОВЕРХ ФОТО */}
          <div className="absolute bottom-6 left-6 right-6 z-10 flex flex-col gap-5">
              
              {/* Заголовок */}
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              >
                  <h1 className="text-[32px] font-bold leading-tight">
                      {tournament.name} <span className="text-[#8E8E93] font-normal text-[24px]">| {tournament.type}</span>
                  </h1>
              </motion.div>

              {/* Инфо */}
              {tournament.description && (
                  <motion.p 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
                    className="text-[15px] text-[#EBEBF5]/90 leading-relaxed font-medium"
                  >
                      {tournament.description}
                  </motion.p>
              )}

              {/* Детали */}
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[14px] text-white font-medium"
              >
                  <div className="flex items-center gap-2">
                      <LocationIcon />
                      <span>{tournament.name}</span>
                  </div>
                  
                  {tournament.surface && (
                      <div className="flex items-center gap-2">
                          <SurfaceIcon />
                          <span>{tournament.surface}</span>
                      </div>
                  )}

                  {tournament.matches_count && (
                      <div className="flex items-center gap-2">
                          <MatchesIcon />
                          <span>{tournament.matches_count} матчей</span>
                      </div>
                  )}
              </motion.div>

              {/* Чемпион */}
              {tournament.defending_champion && (
                  <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                    className="pt-2"
                  >
                      <span className="text-[#8E8E93] text-[14px]">Действующий чемпион: </span>
                      <span className="text-white font-semibold text-[15px]">{tournament.defending_champion}</span>
                  </motion.div>
              )}
          </div>
      </div>

      {/* --- НИЖНЯЯ ЧАСТЬ --- */}
      <div className="flex-1 relative flex flex-col items-center justify-start pt-10 pb-20 z-0 bg-[#141414]">
          
          <div className="absolute -left-[180px] top-[-50px] opacity-60 pointer-events-none">
              <Image 
                src="/decoration-left.png" 
                alt="" 
                width={380} 
                height={600} 
                className="object-contain" 
              />
          </div>

          <div className="absolute -right-[180px] top-[50px] opacity-60 pointer-events-none">
              <Image 
                src="/decoration-right.png" 
                alt="" 
                width={380} 
                height={600} 
                className="object-contain" 
              />
          </div>

          <div className="relative z-10 text-center px-10 mt-10">
              <h2 className="text-[20px] font-bold text-white mb-2">Турнир еще не начался</h2>
              <p className="text-[#8E8E93] text-[15px]">
                  и сетка неизвестна =(
              </p>
          </div>

      </div>
    </div>
  );
}