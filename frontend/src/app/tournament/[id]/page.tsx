'use client';

import { use, useEffect, useState } from 'react';
import ActiveBracket from '@/components/bracket/ActiveBracket';
import ClosedBracket from '@/components/bracket/ClosedBracket';
import { useTournamentContext } from '@/context/TournamentContext';

export default function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params); // Unwrapping params in Next 15
  const id = resolvedParams.id;
  const { getTournamentData, loadTournament } = useTournamentContext();
  
  const [status, setStatus] = useState<string | null>(null);
  const [name, setName] = useState<string>('');

  useEffect(() => {
      // Пытаемся взять из кэша
      const t = getTournamentData(id);
      if (t) {
          setStatus(t.status);
          setName(t.name);
      } else {
          // Если нет, грузим
          const load = async () => {
              const initData = window.Telegram?.WebApp?.initData;
              const data = await loadTournament(id, initData || '');
              if (data) {
                  setStatus(data.status);
                  setName(data.name);
              }
          };
          load();
      }
  }, [id, getTournamentData, loadTournament]);

  if (!status) return <div className="flex justify-center pt-20 text-[#5F6067]">Загрузка турнира...</div>;

  if (status === 'ACTIVE') {
      return <ActiveBracket id={id} tournamentName={name} />;
  } else {
      return <ClosedBracket id={id} tournamentName={name} />;
  }
}