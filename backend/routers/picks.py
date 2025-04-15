from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import logging
from typing import List
from database.db import SessionLocal
from database.models import User, Match, Pick
from pydantic import BaseModel
from services.auth_service import authenticate_user  # Абсолютный импорт

router = APIRouter()
logger = logging.getLogger(__name__)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class PickRequest(BaseModel):
    initData: str
    picks: List[dict]

class PickResponse(BaseModel):
    id: int
    match_id: int
    predicted_winner: str
    points: int

@router.post("/", response_model=List[PickResponse])
def submit_picks(request: PickRequest, db: Session = Depends(get_db), user: User = Depends(authenticate_user)):
    logger.info(f"Submitting picks for user {user.user_id}")
    submitted_picks = []

    for pick_data in request.picks:
        match_id = pick_data.get("match_id")
        predicted_winner = pick_data.get("predicted_winner")

        if not match_id or not predicted_winner:
            raise HTTPException(status_code=400, detail="Invalid pick data")

        match = db.query(Match).filter(Match.id == match_id).first()
        if not match:
            raise HTTPException(status_code=404, detail=f"Match {match_id} not found")

        if match.winner:
            raise HTTPException(status_code=400, detail=f"Match {match_id} already has a winner")

        if predicted_winner not in [match.player1, match.player2]:
            raise HTTPException(status_code=400, detail="Predicted winner must be one of the players")

        existing_pick = db.query(Pick).filter(Pick.user_id == user.user_id, Pick.match_id == match_id).first()
        if existing_pick:
            existing_pick.predicted_winner = predicted_winner
            existing_pick.points = 0  # Сбрасываем очки, они будут пересчитаны при синхронизации
        else:
            new_pick = Pick(
                user_id=user.user_id,
                match_id=match_id,
                predicted_winner=predicted_winner,
                points=0
            )
            db.add(new_pick)
            submitted_picks.append(new_pick)

        db.commit()

    logger.info(f"Picks submitted successfully for user {user.user_id}")
    return submitted_picks

@router.get("/", response_model=List[PickResponse])
def get_user_picks(db: Session = Depends(get_db), user: User = Depends(authenticate_user)):
    logger.info(f"Fetching picks for user {user.user_id}")
    picks = db.query(Pick).filter(Pick.user_id == user.user_id).all()
    return picks