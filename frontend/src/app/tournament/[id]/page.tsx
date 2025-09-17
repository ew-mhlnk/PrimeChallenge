'use client';

import Bracket from '@/components/BracketPage';

export default function TournamentPage({ params }: { params: { id: string } }) {
  console.log('Tournament ID:', params.id); // Отладка
  if (!params.id || params.id === 'undefined') {
    return <p>Ошибка: ID турнира не указан</p>;
  }
  return <Bracket id={params.id} />;
}