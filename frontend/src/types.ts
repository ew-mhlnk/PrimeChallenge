export interface User {
    id: number;
    firstName: string;
    username?: string;
    photoUrl?: string;
  }
  
  export interface Match {
    id: number;
    tournament_id: number;
    round: string;
    match_number: number;
    player1: string | null;
    player2: string | null;
    winner: string | null;
    set1: string | null; // Новый счёт первого сета
    set2: string | null; // Новый счёт второго сета
    set3: string | null; // Новый счёт третьего сета
    set4: string | null; // Новый счёт четвёртого сета
    set5: string | null; // Новый счёт пятого сета
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