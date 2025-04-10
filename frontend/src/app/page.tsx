'use client';

import { useEffect, useState } from 'react';

export default function Home() {
  const [firstName, setFirstName] = useState('');

  useEffect(() => {
    // @ts-expect-error: Telegram.WebApp — нестандартный объект от Telegram Mini Apps
const tg = window.Telegram.WebApp;
    tg.ready();
    setFirstName(tg.initDataUnsafe.user?.first_name || '');
    
    // Сохраняем пользователя на сервер
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: tg.initDataUnsafe.user?.id,
        first_name: tg.initDataUnsafe.user?.first_name,
        username: tg.initDataUnsafe.user?.username
      }),
    });
  }, []);

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Привет, {firstName}!</h1>
      <p>Вот список турниров:</p>
      {/* тут будет список */}
    </main>
  );
}
