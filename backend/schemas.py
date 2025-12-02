from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class TournamentStatus(str, Enum):
    ACTIVE = "ACTIVE"
    CLOSED = "CLOSED"
    COMPLETED = "COMPLETED"

class UserBase(BaseModel):
    user_id: int
    first_name: str
    last_name: Optional[str] = None
    username: Optional[str] = None

    class Config:
        from_attributes = True

class TournamentBase(BaseModel):
    id: int
    name: str
    dates: Optional[str] = None
    status: Optional[TournamentStatus] = None
    sheet_name: Optional[str] = None
    starting_round: Optional[str] = None
    type: Optional[str] = None
    start: Optional[str] = None
    close: Optional[str] = None
    tag: Optional[str] = None

    class Config:
        from_attributes = True

class TrueDrawBase(BaseModel):
    id: int
    tournament_id: int
    round: Optional[str] = None
    match_number: Optional[int] = None
    player1: Optional[str] = None
    player2: Optional[str] = None
    winner: Optional[str] = None
    
    set1: Optional[str] = None
    set2: Optional[str] = None
    set3: Optional[str] = None
    set4: Optional[str] = None
    set5: Optional[str] = None

    class Config:
        from_attributes = True

class UserPickBase(BaseModel):
    id: int
    user_id: int
    tournament_id: int
    round: Optional[str] = None
    match_number: Optional[int] = None
    player1: Optional[str] = None
    player2: Optional[str] = None
    predicted_winner: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class UserScoreBase(BaseModel):
    id: int
    user_id: int
    tournament_id: int
    score: int
    correct_picks: int
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class LeaderboardBase(BaseModel):
    id: int
    tournament_id: int
    user_id: int
    rank: Optional[int] = None
    score: Optional[int] = None
    correct_picks: Optional[int] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class UserPickCreate(BaseModel):
    tournament_id: int
    round: str
    match_number: int
    predicted_winner: str

class Player(BaseModel):
    name: str
    seed: Optional[int] = None

class BracketMatch(BaseModel):
    id: str
    round: str
    match_number: int
    player1: Player
    player2: Player
    predicted_winner: Optional[str] = None
    actual_winner: Optional[str] = None
    scores: Optional[List[str]] = None 
    source_matches: List[Dict[str, Any]] = []
    
    # --- НОВЫЕ ПОЛЯ ---
    status: Optional[str] = "PENDING"
    
    # Статус конкретного слота (игрока)
    player1_status: Optional[str] = "PENDING"   # CORRECT | INCORRECT | PENDING
    player2_status: Optional[str] = "PENDING"
    
    # Кто реально находится в этом слоте (для подсказки при ошибке)
    real_player1: Optional[str] = None
    real_player2: Optional[str] = None
    
    is_eliminated: Optional[bool] = False
    # ------------------

class TrueDraw(TrueDrawBase):
    pass

class UserPick(UserPickBase):
    user: Optional[UserBase] = None
    tournament: Optional[TournamentBase] = None

class UserScore(UserScoreBase):
    user: Optional[UserBase] = None
    tournament: Optional[TournamentBase] = None

class Leaderboard(LeaderboardBase):
    user: Optional[UserBase] = None
    tournament: Optional[TournamentBase] = None

class Tournament(TournamentBase):
    true_draws: Optional[List[TrueDraw]] = None
    user_picks: Optional[List[UserPick]] = None
    scores: Optional[List[UserScore]] = None
    rounds: Optional[List[str]] = None
    bracket: Optional[Dict[str, List[BracketMatch]]] = None
    has_picks: Optional[bool] = None
    score: Optional[int] = None
    correct_picks: Optional[int] = None

class ProfileStatsResponse(BaseModel):
    user_id: int
    name: str
    cumulative: List[Any]
    history: List[Any]