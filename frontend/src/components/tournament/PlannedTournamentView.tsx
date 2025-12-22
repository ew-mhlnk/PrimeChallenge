'use client';

import { Tournament } from '@/types';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { TournamentHero } from './TournamentHero';

export default function PlannedTournamentView({ tournament }: { tournament: Tournament }) {
  return (
    <div className="min-h-screen bg-[#000000] text-white flex flex-col relative overflow-hidden">
      
      {/* Универсальная шапка */}
      <TournamentHero tournament={tournament} />

      {/* Нижняя часть (Уникальная для Planned) */}
      <div className="flex-1 relative flex flex-col items-center justify-start pt-10 pb-20 z-10 bg-[#000000]">
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
              <h2 className="text-[17px] font-bold text-white mb-1.5">Турнир еще не начался</h2>
              <p className="text-[#8E8E93] text-[14px]">и сетка неизвестна =(</p>
          </motion.div>
      </div>
    </div>
  );
}