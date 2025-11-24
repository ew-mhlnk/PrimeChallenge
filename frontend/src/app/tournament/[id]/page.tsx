import Bracket from '@/components/BracketPage';

// В Next.js 15 params — это Promise.
// Мы делаем компонент асинхронным (async) и типизируем params как Promise.
export default async function TournamentPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  // 1. Ждем разрешения параметров
  const resolvedParams = await params;
  const id = resolvedParams.id;

  // console.log('Tournament ID:', id); // Можно раскомментировать для отладки на сервере

  if (!id || id === 'undefined') {
    return <p>Ошибка: ID турнира не указан</p>;
  }

  // Передаем ID в клиентский компонент Bracket
  return <Bracket id={id} />;
}