export interface User {
  id: number;
  firstName: string;
  username?: string;
  photoUrl?: string;
}

export interface Tournament {
  id: number;
  name: string;
  dates?: string;
  status: 'ACTIVE' | 'CLOSED' | 'COMPLETED';
  sheet_name?: string;
  starting_round?: string;
  type?: string;
  start?: string;
  close?: string;
  tag?: string;
  true_draws?: Match[];
  user_picks?: UserPick[];
  scores?: UserScore[];
  rounds?: string[];
  bracket?: { [round: string]: { [matchNumber: number]: BracketMatch } }; // Добавлено
  has_picks?: boolean; // Добавлено
  comparison?: ComparisonResult[]; // Добавлено
  score?: number; // Добавлено
  correct_picks?: number; // Добавлено
}

export interface Match {
  id: number;
  tournament_id: number;
  round: string;
  match_number: number;
  player1: string | null;
  player2: string | null;
  set1: string | null;
  set2: string | null;
  set3: string | null;
  set4: string | null;
  set5: string | null;
  winner: string | null;
}

export interface BracketMatch {
  player1: string | null;
  player2: string | null;
  predicted_winner: string | null;
  source_matches: { round: string; match_number: number }[];
}

export interface UserPick {
  id: number;
  user_id: number;
  tournament_id: number;
  round: string;
  match_number: number;
  player1: string | null;
  player2: string | null;
  predicted_winner: string | null;
  created_at?: string;
  updated_at?: string;
  user?: User;
  tournament?: Tournament;
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