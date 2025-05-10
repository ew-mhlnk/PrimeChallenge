from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database.db import get_db
from database import models
from utils.auth import get_current_user
from utils.pick_handler import save_pick
from schemas import UserPick
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/user-picks", response_model=List[UserPick])
async def get_user_picks(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    user_id = user["id"]
    logger.info(f"Fetching picks for user_id={user_id}")
    picks = db.query(models.UserPick).filter(models.UserPick.user_id == user_id).all()
    logger.info(f"Returning {len(picks)} picks")
    return picks

@router.post("/", response_model=UserPick)
async def create_pick(
    tournament_id: int,
    round: str,
    match_number: int,
    predicted_winner: str,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    user_id = user["id"]
    logger.info(f"Creating pick for user_id={user_id}, tournament_id={tournament_id}, round={round}, match_number={match_number}")
    
    pick = {
        "tournament_id": tournament_id,
        "round": round,
        "match_number": match_number,
        "predicted_winner": predicted_winner
    }
    saved_pick = save_pick(pick, db, user_id)
    db.refresh(db.query(models.UserPick).filter_by(**pick, user_id=user_id).first())
    return saved_pick