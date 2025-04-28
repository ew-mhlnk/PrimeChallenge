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
  status: 'ACTIVE' | 'CLOSED' | 'COMPLETED';
  sheet_name?: string;
  starting_round: string;
  type: string;
  start: string;
  close: string;
  tag?: string;
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

export interface UserPick { // Переименовано с Pick на UserPick
  tournament_id: number;
  round: string;
  match_number: number;
  player1: string;
  player2: string;
  predicted_winner: string | null;
  winner: string;
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