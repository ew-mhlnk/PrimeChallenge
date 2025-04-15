import { Tournament } from '@/types';

interface TournamentListProps {
  tournaments: Tournament[];
  onTournamentSelect: (tournament: Tournament) => void;
}

export default function TournamentList({ tournaments, onTournamentSelect }: TournamentListProps) {
  return (
    <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {tournaments.length > 0 ? (
        tournaments.map((tournament) => (
          <div
            key={tournament.id}
            className="bg-gray-800 p-4 rounded-lg shadow-md hover:shadow-xl transition-all cursor-pointer"
            onClick={() => onTournamentSelect(tournament)}
          >
            <h2 className="text-xl font-semibold text-white">{tournament.name}</h2>
            <p className="text-gray-400">{tournament.dates}</p>
            <span
              className={`mt-2 inline-block px-2 py-1 rounded text-sm ${
                tournament.status === 'Активен'
                  ? 'bg-green-500'
                  : tournament.status === 'Закрыт'
                  ? 'bg-yellow-500'
                  : 'bg-gray-500'
              }`}
            >
              {tournament.status}
            </span>
          </div>
        ))
      ) : (
        <p className="text-gray-400">Турниры загружаются...</p>
      )}
    </section>
  );
}