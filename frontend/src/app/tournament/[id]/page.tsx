'use client';

import { use, useEffect, useState, useRef } from 'react';
import ActiveBracket from '@/components/bracket/ActiveBracket';
import ClosedBracket from '@/components/bracket/ClosedBracket';
import PlannedTournamentView from '@/components/tournament/PlannedTournamentView';
import { useTournamentContext } from '@/context/TournamentContext';
import { Tournament } from '@/types';

export default function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const { getTournamentData, loadTournament } = useTournamentContext();
  
  // 1. СРАЗУ берем данные из кэша (синхронно), если они есть
  const cachedData = getTournamentData(id);

  // Инициализируем стейт кэшом. Если кэш есть - юзер увидит контент мгновенно.
  const [fullData, setFullData] = useState<Tournament | null>(cachedData);
  const [isUpdating, setIsUpdating] = useState(false);

  // Используем ref, чтобы избежать двойных запросов в React 18 Strict Mode
  const hasFetched = useRef(false);

  useEffect(() => {
      const fetchFreshData = async () => {
          // Если данные уже есть (из кэша), мы не блокируем экран, а обновляем тихо
          // Если данных нет (первый вход), будет виден спиннер
          if (!fullData) setIsUpdating(true);

          const initData = typeof window !== 'undefined' ? window.Telegram?.WebApp?.initData : '';
          const freshData = await loadTournament(id, initData || '');
          
          if (freshData) {
              setFullData(freshData);
          }
          setIsUpdating(false);
      };

      // Стратегия кэширования:
      // 1. Если данных нет вообще -> Грузим.
      // 2. Если данные есть, но турнир АКТИВЕН или ИДЕТ -> Грузим в фоне (обновить счет).
      // 3. Если турнир ПЛАНИРУЕТСЯ или ЗАВЕРШЕН и данные уже есть -> Можно не грузить (экономим трафик), 
      //    но лучше грузить, вдруг админ поменял описание.
      
      // Самая надежная стратегия: "Покажи кэш сразу, обнови в фоне"
      if (!hasFetched.current) {
          hasFetched.current = true;
          fetchFreshData();
      }
  }, [id, loadTournament]); // Убрали fullData из зависимостей, чтобы не зациклить

  // Если нет ни кэша, ни загруженных данных - показываем спиннер
  if (!fullData) {
      return (
        <div className="min-h-screen bg-[#141414] flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-[#00B2FF] border-t-transparent rounded-full animate-spin" />
                <span className="text-[#5F6067] text-sm">Загрузка турнира...</span>
            </div>
        </div>
      );
  }

  // --- ДИСПЕТЧЕР ---
  const { status, name } = fullData;

  if (status === 'PLANNED') {
      return <PlannedTournamentView tournament={fullData} />;
  } 
  
  if (status === 'ACTIVE') {
      return <ActiveBracket id={id} tournamentName={name} />;
  } 
  
  // CLOSED / COMPLETED
  return <ClosedBracket id={id} tournamentName={name} />;
}