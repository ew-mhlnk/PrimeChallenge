'use client';

import { Tournament } from '@/types';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

// --- ИКОНКИ ---
const BackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 19L8 12L15 5"/>
  </svg>
);

const LocationIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

const SurfaceIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12h20"/><path d="M12 2v20"/><path d="M4.93 4.93l14.14 14.14"/><path d="M19.07 4.93L4.93 19.07"/>
  </svg>
);

const MatchesIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
  </svg>
);

// Хелпер для пути к картинке
const getImageUrl = (url?: string) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `/tournaments/${url}`;
};

export default function PlannedTournamentView({ tournament }: { tournament: Tournament }) {
  const router = useRouter();
  const imageSrc = getImageUrl(tournament.image_url);
  
  // Состояние для разворачивания текста
  const [isExpanded, setIsExpanded] = useState(false);
  const { impact } = useHapticFeedback();

  // Функция переключения
  const toggleDescription = () => {
      impact('light');
      setIsExpanded(!isExpanded);
  };

  // Проверяем длину описания, чтобы не показывать кнопку "Еще" для коротких текстов
  const isLongDescription = tournament.description && tournament.description.length > 120;

  return (
    <div className="min-h-screen bg-[#141414] text-white flex flex-col relative overflow-hidden">
      
      {/* --- HERO IMAGE BLOCK --- */}
      {/* Используем min-h, чтобы при разворачивании текста картинка могла растягиваться, если нужно, 
          но лучше фиксировать высоту, чтобы контент скроллился поверх */}
      <div className="relative w-full h-[60vh] min-h-[420px]">
          
          {/* ФОТОГРАФИЯ */}
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
                  
                  {/* Градиент */}
                  <div 
                    className="absolute inset-0"
                    style={{ 
                        background: 'linear-gradient(180deg, rgba(20, 20, 20, 0) 40%, rgba(20, 20, 20, 0.7) 60%, #141414 100%)' 
                    }}
                  />
              </div>
          ) : (
              <div className="absolute inset-0 bg-gradient-to-b from-[#0B80B3] to-[#141414]" />
          )}

          {/* Кнопка Назад */}
          <button 
            onClick={() => { impact('light'); router.back(); }} 
            className="absolute top-6 left-6 w-10 h-10 flex items-center justify-center rounded-full bg-black/20 backdrop-blur-md border border-white/10 active:scale-90 transition-transform z-30"
          >
            <BackIcon />
          </button>

          {/* --- КОНТЕНТ (Поверх фото) --- */}
          <div className="absolute bottom-6 left-6 right-6 z-20 flex flex-col gap-3">
              
              {/* Заголовок */}
              <motion.div
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ duration: 0.4 }}
              >
                  <h1 className="text-[28px] font-bold leading-tight drop-shadow-md">
                      {tournament.name} 
                      <span className="text-white/60 font-normal text-[20px] ml-2">
                          | {tournament.type}
                      </span>
                  </h1>
              </motion.div>

              {/* Описание с логикой "Еще" */}
              {tournament.description && (
                  <motion.div 
                    layout // Позволяет плавно анимировать изменение высоты
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    transition={{ delay: 0.1 }}
                    className="flex flex-col items-start"
                  >
                      <p 
                        className={`
                            text-[14px] text-[#EBEBF5]/80 leading-snug font-medium pr-4 transition-all duration-300
                            ${isExpanded ? '' : 'line-clamp-3'} 
                        `}
                      >
                          {tournament.description}
                      </p>
                      
                      {isLongDescription && (
                          <button 
                            onClick={toggleDescription}
                            className="text-[#00B2FF] text-[13px] font-bold mt-1 active:opacity-70"
                          >
                              {isExpanded ? 'Скрыть' : 'Еще'}
                          </button>
                      )}
                  </motion.div>
              )}

              {/* Блок деталей и чемпиона */}
              <motion.div 
                layout // Чтобы этот блок плавно сдвигался вниз при открытии текста
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                transition={{ delay: 0.2 }}
                className="flex flex-col gap-1.5 mt-1"
              >
                  {/* Детали */}
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-white/90 font-medium">
                      <div className="flex items-center gap-1.5">
                          <LocationIcon />
                          <span>{tournament.name}</span>
                      </div>
                      
                      {tournament.surface && (
                          <div className="flex items-center gap-1.5">
                              <SurfaceIcon />
                              <span>{tournament.surface}</span>
                          </div>
                      )}

                      {tournament.matches_count && (
                          <div className="flex items-center gap-1.5">
                              <MatchesIcon />
                              <span>{tournament.matches_count} матчей</span>
                          </div>
                      )}
                  </div>

                  {/* Чемпион */}
                  {tournament.defending_champion && (
                      <div className="flex items-center gap-2 text-[13px]">
                          <span className="text-[#8E8E93]">Действующий чемпион:</span>
                          <span className="text-white font-semibold">{tournament.defending_champion}</span>
                      </div>
                  )}
              </motion.div>

          </div>
      </div>

      {/* --- НИЖНЯЯ ЧАСТЬ (СТАТУС + ДЕКОР) --- */}
      <div className="flex-1 relative flex flex-col items-center justify-start pt-8 pb-10 z-10 bg-[#141414]">
          
          <div className="absolute -left-[100px] top-[-60px] opacity-40 pointer-events-none select-none">
              <Image src="/decoration-left.png" alt="" width={300} height={500} className="object-contain" />
          </div>

          <div className="absolute -right-[100px] top-[20px] opacity-40 pointer-events-none select-none">
              <Image src="/decoration-right.png" alt="" width={300} height={500} className="object-contain" />
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="relative z-10 text-center px-8"
          >
              <h2 className="text-[17px] font-bold text-white mb-1.5">
                  Турнир еще не начался
              </h2>
              <p className="text-[#8E8E93] text-[14px]">
                  и сетка неизвестна =(
              </p>
          </motion.div>

      </div>
    </div>
  );
}