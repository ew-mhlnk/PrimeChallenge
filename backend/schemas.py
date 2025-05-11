from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum

# Перечисление статусов турнира
class TournamentStatus(str, Enum):
    ACTIVE = "ACTIVE"
    CLOSED = "CLOSED"
    COMPLETED = "COMPLETED"

# Базовые модели для сериализации
class UserBase(BaseModel):
    user_id: int
    first_name: str
    last_name: Optional[str] = None
    username: Optional[str] = None

    class Config:
        orm_mode = True

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
        orm_mode = True

class TrueDrawBase(BaseModel):
    id: int
    tournament_id: int
    round: Optional[str] = None
    match_number: Optional[int] = None
    player1: Optional[str] = None
    player2: Optional[str] = None
    set1: Optional[str] = None
    set2: Optional[str] = None
    set3: Optional[str] = None
    set4: Optional[str] = None
    set5: Optional[str] = None
    winner: Optional[str] = None

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
        orm_mode = True

class UserScoreBase(BaseModel):
    id: int
    user_id: int
    tournament_id: int
    score: int
    correct_picks: int
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True

class LeaderboardBase(BaseModel):
    id: int
    tournament_id: int
    user_id: int
    rank: Optional[int] = None
    score: Optional[int] = None
    correct_picks: Optional[int] = None
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True

# Модели для создания
class UserPickCreate(BaseModel):
    tournament_id: int
    round: str
    match_number: int
    predicted_winner: str

# Модели с отношениями
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
    rounds: Optional[List[str]] = None  # Добавлено для соответствия фронтенду
    bracket: Optional[dict] = None      # Добавлено для передачи данных сетки
    has_picks: Optional[bool] = None    # Добавлено для флага
    comparison: Optional[List[dict]] = None  # Добавлено для сравнения
    score: Optional[int] = None         # Добавлено для общего счёта
    correct_picks: Optional[int] = None # Добавлено для количества правильных пиков