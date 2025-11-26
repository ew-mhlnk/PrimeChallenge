export interface User {
  id: number;
  firstName: string;
  username?: string;
  photoUrl?: string;
}

export interface Player {
  name: string;
  seed?: number;
}

export interface BracketMatch {
  id: string;
  match_number: number;
  round: string;
  player1: Player;
  player2: Player;
  predicted_winner?: string | null;
  
  // --- ДОБАВИТЬ ТОЛЬКО ЭТУ СТРОКУ ---
  actual_winner?: string | null; 
  // ----------------------------------

  source_matches: Array<{ round: string; match_number: number }>;
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
  bracket?: { [round: string]: BracketMatch[] }; // Обновлено
  has_picks?: boolean;
  comparison?: ComparisonResult[];
  score?: number;
  correct_picks?: number;
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

export interface StatRow {
  category: string;
  rank: number;
  total_participants: number;
  points: number;
  correct_picks: number;
  incorrect_picks: number;
  percent_correct: string;
  total_brackets: number;
}

export interface TournamentHistoryRow {
  tournament_id: number;
  name: string;
  rank: number;
  total_participants: number;
  points: number;
  correct_picks: number;
  incorrect_picks: number;
  percent_correct: string;
}

export interface ProfileStats {
  user_id: number;
  name: string;
  cumulative: StatRow[];
  history: TournamentHistoryRow[];
}