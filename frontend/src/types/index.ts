export interface User {
  id: number;
  firstName: string;
}

export interface Tournament {
  id: number;
  name: string;
  dates: string;
  status: string;
  starting_round: string;
  type: string;
}

export interface Match {
  id: number;
  round: string;
  match_number: number;
  player1: string;
  player2: string;
  set1?: string;
  set2?: string;
  set3?: string;
  set4?: string;
  set5?: string;
  winner?: string;
  predicted_winner: string;
}

export interface Pick {
  round: string;
  match_number: number;
  player1: string;
  player2: string;
  predicted_winner: string;
  winner?: string;
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