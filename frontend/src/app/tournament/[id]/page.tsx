'use client';

import { use, useEffect, useState } from 'react';
import ActiveBracket from '@/components/bracket/ActiveBracket';
import ClosedBracket from '@/components/bracket/ClosedBracket';
import PlannedTournamentView from '@/components/tournament/PlannedTournamentView'; // <--- 1. Импорт
import { useTournamentContext } from '@/context/TournamentContext';
import { Tournament } from '@/types';

export default function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const { getTournamentData, loadTournament } = useTournamentContext();
  
  const [status, setStatus] = useState<string | null>(null);
  const [name, setName] = useState<string>('');
  
  // 2. Объявляем состояние для полных данных (чтобы передать их в PlannedView)
  const [fullData, setFullData] = useState<Tournament | null>(null);

  useEffect(() => {
      // Пытаемся взять из кэша
      const t = getTournamentData(id);
      if (t) {
          setStatus(t.status);
          setName(t.name);
          setFullData(t); // Сохраняем полные данные
      } else {
          // Если нет, грузим
          const load = async () => {
              const initData = typeof window !== 'undefined' ? window.Telegram?.WebApp?.initData : '';
              const data = await loadTournament(id, initData || '');
              if (data) {
                  setStatus(data.status);
                  setName(data.name);
                  setFullData(data); // Сохраняем полные данные
              }
          };
          load();
      }
  }, [id, getTournamentData, loadTournament]);

  // Ждем загрузки статуса и данных
  if (!status || !fullData) {
      return <div className="flex justify-center pt-20 text-[#5F6067]">Загрузка турнира...</div>;
  }

  // --- ДИСПЕТЧЕР ОТОБРАЖЕНИЯ ---

  // 1. Если ПЛАНИРУЕТСЯ -> Показываем красивое превью
  if (status === 'PLANNED') {
      return <PlannedTournamentView tournament={fullData} />;
  } 
  
  // 2. Если АКТИВЕН -> Показываем сетку для прогнозов
  if (status === 'ACTIVE') {
      return <ActiveBracket id={id} tournamentName={name} />;
  } 
  
  // 3. Если ЗАКРЫТ или ЗАВЕРШЕН -> Показываем результаты
  return <ClosedBracket id={id} tournamentName={name} />;
}