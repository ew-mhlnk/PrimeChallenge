import Bracket from '@/components/BracketPage';

// Next.js 15: Компонент асинхронный, params - это Promise
export default async function TournamentPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  // Ждем параметры перед использованием
  const resolvedParams = await params;
  const id = resolvedParams.id;

  if (!id || id === 'undefined') {
    return <p>Ошибка: ID турнира не указан</p>;
  }

  return <Bracket id={id} />;
}