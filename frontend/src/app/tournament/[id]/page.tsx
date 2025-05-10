'use client';

import BracketPage from '@/components/BracketPage';

export const dynamic = 'force-dynamic';

// В Next.js страница с динамическим маршрутом получает params как пропс
export default function TournamentPage({ params }: { params: { id: string } }) {
  return <BracketPage params={params} />;
}