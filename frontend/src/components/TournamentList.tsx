'use client';

import Link from 'next/link';
import useTournaments from '../hooks/useTournaments';
import { Tournament } from '@/types';

interface TournamentListProps {
  filterStatus?: 'ACTIVE' | 'CLOSED' | 'COMPLETED';
}

export default function TournamentList({ filterStatus }: TournamentListProps) {
  const { tournaments, error } = useTournaments();

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  if (!tournaments) {
    return <p>Загрузка турниров...</p>;
  }

  const filteredTournaments = tournaments.filter(
    (tournament: Tournament) => !filterStatus || tournament.status === filterStatus
  );

  if (filteredTournaments.length === 0) {
    return <p>Нет доступных турниров</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filteredTournaments.map((tournament: Tournament) => (
        <Link href={`/bracket/${tournament.id}`} key={tournament.id}>
          <div className="bg-gray-800 p-4 rounded-lg shadow-md hover:bg-gray-700 transition">
            <h2 className="text-xl font-bold">{tournament.name}</h2>
            <p>{tournament.dates || 'Даты не указаны'}</p>
            <p>Статус: {tournament.status}</p>
            <p>Тип: {tournament.type || 'Не указан'}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}