'use client';

import Link from 'next/link';
import useTournaments from '../../hooks/useTournaments';
import useAuth from '../../hooks/useAuth';
import { Tournament, User } from '@/types';

export default function Profile() {
  const { user, isLoading: userLoading, error: userError } = useAuth();
  const { tournaments, error: tournamentsError } = useTournaments();

  if (userLoading) {
    return <p>Загрузка профиля...</p>;
  }

  if (userError) {
    return <p className="text-red-500">{userError}</p>;
  }

  if (!user) {
    return <p>Пользователь не найден.</p>;
  }

  if (tournamentsError) {
    return <p className="text-red-500">{tournamentsError}</p>;
  }

  const userTournaments = tournaments?.filter((tournament: Tournament) =>
    ['ACTIVE', 'CLOSED', 'COMPLETED'].includes(tournament.status)
  ) || [];

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Личный кабинет</h1>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">Добро пожаловать, {(user as User).username || (user as User).firstName}!</h2>
        <p>Имя: {(user as User).username || (user as User).firstName}</p>
        <p>ID: {(user as User).id}</p>
      </div>
      <h2 className="text-2xl font-semibold mb-4">Мои турниры</h2>
      {userTournaments.length === 0 ? (
        <p>Вы пока не участвовали в турнирах.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {userTournaments.map((tournament: Tournament) => (
            <Link href={`/bracket/${tournament.id}`} key={tournament.id}>
              <div className="bg-gray-800 p-4 rounded-lg shadow-md hover:bg-gray-700 transition">
                <h3 className="text-xl font-bold">{tournament.name}</h3>
                <p>{tournament.dates || 'Даты не указаны'}</p>
                <p>Статус: {tournament.status}</p>
                <p>Тип: {tournament.type || 'Не указан'}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}