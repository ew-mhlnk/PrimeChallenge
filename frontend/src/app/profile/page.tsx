'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import useTournaments from '../../hooks/useTournaments';
import { Tournament, User } from '@/types';

export default function Profile() {
  const { tournaments, error } = useTournaments();
  const [user, setUser] = useState<User | null>(null); // Используем интерфейс User

  // Загружаем информацию о пользователе из Telegram или другого источника
  useEffect(() => {
    const telegramUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (telegramUser) {
      setUser({
        id: telegramUser.id,
        firstName: telegramUser.first_name, // Используем first_name из Telegram
      });
    } else {
      // Для тестов задаём мок-данные
      setUser({ id: 1, firstName: 'TestUser' });
    }
  }, []);

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  if (!user) {
    return <p>Загрузка профиля...</p>;
  }

  // Фильтруем турниры, в которых пользователь участвовал (можно добавить API-запрос для пиков)
  const userTournaments = tournaments.filter((tournament: Tournament) =>
    ['ACTIVE', 'CLOSED', 'COMPLETED'].includes(tournament.status)
  );

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Личный кабинет</h1>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">Профиль пользователя</h2>
        <p>Имя: {user.username || user.firstName}</p> {/* Используем username или firstName */}
        <p>ID: {user.id}</p>
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
                <p>{tournament.dates}</p>
                <p>Статус: {tournament.status}</p>
                <p>Тип: {tournament.type}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}