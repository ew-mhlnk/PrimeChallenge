export interface User {
    id: number;
    firstName: string;
    username?: string;
    photoUrl?: string;
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
  
  export interface Tournament {
    id: number;
    name: string;
    dates: string;
    status: string;
    starting_round: string;
    type: string;
    active: boolean;
  }