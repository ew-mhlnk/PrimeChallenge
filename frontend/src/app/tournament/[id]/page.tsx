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
  
  const cachedData = getTournamentData(id);
  const [fullData, setFullData] = useState<Tournament | null>(cachedData);
  const hasFetched = useRef(false);

  useEffect(() => {
      const fetchFreshData = async () => {
          const initData = typeof window !== 'undefined' ? window.Telegram?.WebApp?.initData : '';
          const freshData = await loadTournament(id, initData || '');
          if (freshData) {
              setFullData(freshData);
          }
      };

      if (!hasFetched.current) {
          hasFetched.current = true;
          fetchFreshData();
      }
  }, [id, loadTournament]);

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

  const { status } = fullData;

  if (status === 'PLANNED') {
      return <PlannedTournamentView tournament={fullData} />;
  } 
  
  if (status === 'ACTIVE') {
      // ИСПРАВЛЕНО: Передаем только tournament
      return <ActiveBracket tournament={fullData} />;
  } 
  
  // CLOSED / COMPLETED
  // ИСПРАВЛЕНО: Передаем только tournament
  return <ClosedBracket tournament={fullData} />;
}