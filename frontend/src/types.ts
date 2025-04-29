export interface User {
  id: number;
  firstName: string;
  username?: string;
  photoUrl?: string;
}

export interface Tournament {
  id: number;
  name: string;
  dates?: string; // Может быть null
  status: 'ACTIVE' | 'CLOSED' | 'COMPLETED';
  sheet_name?: string;
  starting_round?: string; // Делаем необязательным
  type?: string; // Делаем необязательным
  start?: string; // Делаем необязательным
  close?: string; // Делаем необязательным
  tag?: string;
  true_draws?: Match[]; // Добавляем матчи
  user_picks?: UserPick[]; // Добавляем пики пользователя
  scores?: UserScore[]; // Добавляем очки
}

export interface Match {
  id: number;
  tournament_id: number; // Добавляем
  round: string;
  match_number: number;
  player1: string | null; // Может быть null
  player2: string | null; // Может быть null
  set1: string | null;
  set2: string | null;
  set3: string | null;
  set4: string | null;
  set5: string | null;
  winner: string | null;
}

export interface UserPick {
  id: number; // Добавляем
  user_id: number; // Добавляем
  tournament_id: number;
  round: string;
  match_number: number;
  player1: string | null; // Может быть null
  player2: string | null; // Может быть null
  predicted_winner: string | null;
  created_at?: string; // Добавляем
  updated_at?: string; // Добавляем
  user?: User; // Добавляем связанного пользователя
  tournament?: Tournament; // Добавляем связанный турнир
}

export interface UserScore {
  id: number;
  user_id: number;
  tournament_id: number;
  score: number;
  correct_picks: number;
  updated_at?: string;
  user?: User;
  tournament?: Tournament;
}

export interface ComparisonResult {
  round: string;
  match_number: number;
  player1: string;
  player2: string;
  predicted_winner: string;
  actual_winner: string;
  correct: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: number;
  username: string;
  score: number;
  correct_picks: number;
}