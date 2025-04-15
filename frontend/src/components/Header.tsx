import { User } from '@/types';

interface HeaderProps {
  user: User | null;
}

export default function Header({ user }: HeaderProps) {
  return (
    <header className="mb-8">
      <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
        Prime Bracket Challenge
      </h1>
      <p className="text-gray-400 mt-2">
        {user ? `Привет, ${user.firstName}!` : 'Загрузка пользователя...'}
      </p>
    </header>
  );
}