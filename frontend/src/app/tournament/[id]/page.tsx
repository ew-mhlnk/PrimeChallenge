import Link from 'next/link';

export default async function TournamentPage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-3xl font-bold mb-6">Турнир #{params.id}</h1>
      <div className="bg-gray-800 p-4 rounded-lg shadow-md">
        <p className="text-gray-300">Сетка турнира скоро будет здесь!</p>
      </div>
      <Link href="/" className="mt-6 inline-block bg-cyan-500 hover:bg-cyan-600 text-white py-2 px-4 rounded">
        Назад
      </Link>
    </div>
  );
}