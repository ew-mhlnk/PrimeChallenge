export interface User {
  id: number;
  firstName: string;
  username?: string;
  photoUrl?: string;
}

export interface Tournament {
  id: number;
  name: string;
  dates: string;
  status: 'ACTIVE' | 'CLOSED'; // Уточняем возможные значения
  starting_round: string;
  type: string;
  active: boolean;
}

export interface Match {
  id: number;
  round: string;
  match_number: number;
  player1: string;
  player2: string;
  set1: string | null;
  set2: string | null;
  set3: string | null;
  set4: string | null;
  set5: string | null;
  winner: string | null;
  predicted_winner?: string;
}

export interface Pick {
  tournament_id: number; // Добавляем поле, которого не было в index.ts, но оно есть в useTournamentLogic.ts
  round: string;
  match_number: number;
  player1: string;
  player2: string;
  predicted_winner: string;
  winner: string; // Убираем опциональность, так как в useTournamentLogic.ts оно используется как string
}

export interface ComparisonResult {
  round: string;
  match_number: number;
  player1: string; // Эти поля есть в index.ts, но не в useTournamentLogic.ts
  player2: string;
  predicted_winner: string;
  actual_winner: string;
  correct: boolean;
}