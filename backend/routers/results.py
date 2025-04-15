from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
import logging
from typing import List
from database.db import get_db
from database.models import Pick, Match, User
from pydantic import BaseModel
from services.auth_service import authenticate_user

router = APIRouter()
logger = logging.getLogger(__name__)

class MatchResult(BaseModel):
    match_id: int
    round: str
    player1: str
    player2: str
    set1: str | None
    set2: str | None
    set3: str | None
    set4: str | None
    set5: str | None
    winner: str | None
    predicted_winner: str
    points: int

@router.get("/", response_model=List[MatchResult])
async def get_results(request: Request, db: Session = Depends(get_db), user: User = Depends(authenticate_user)):
    logger.info(f"Fetching results for user {user.user_id}")
    picks = db.query(Pick).filter(Pick.user_id == user.user_id).all()
    results = []

    for pick in picks:
        match = db.query(Match).filter(Match.id == pick.match_id).first()
        if match:
            results.append({
                "match_id": match.id,
                "round": match.round,
                "player1": match.player1,
                "player2": match.player2,
                "set1": match.set1,
                "set2": match.set2,
                "set3": match.set3,
                "set4": match.set4,
                "set5": match.set5,
                "winner": match.winner,
                "predicted_winner": pick.predicted_winner,
                "points": pick.points
            })

    return results