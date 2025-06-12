from pydantic import BaseModel
from typing import Optional, List, Dict
from enum import Enum

class TournamentStatus(str, Enum):
    ACTIVE = "ACTIVE"
    CLOSED = "CLOSED"
    COMPLETED = "COMPLETED"

class BracketMatch(BaseModel):
    player1: Optional[str]
    player2: Optional[str]
    predicted_winner: Optional[str]

class Comparison(BaseModel):
    round: str
    match_number: int
    player1: Optional[str]
    player2: Optional[str]
    predicted_winner: Optional[str]
    actual_winner: Optional[str]
    correct: Optional[bool]

class TournamentResponse(BaseModel):
    id: int
    name: str
    status: TournamentStatus
    starting_round: Optional[str]
    rounds: List[str]
    bracket: Dict[str, Dict[str, BracketMatch]]
    has_picks: bool
    comparison: List[Comparison]

    class Config:
        from_attributes = True