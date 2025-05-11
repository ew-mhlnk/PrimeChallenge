from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database.db import get_db
from database import models
from utils.auth import get_current_user
from utils.pick_handler import save_pick
from schemas import UserPick, UserPickCreate
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
    pick: UserPickCreate,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    user_id = user["id"]
    logger.info(f"Creating pick for user_id={user_id}, tournament_id={pick.tournament_id}, round={pick.round}, match_number={pick.match_number}")
    
    pick_data = {
        "tournament_id": pick.tournament_id,
        "round": pick.round,
        "match_number": pick.match_number,
        "predicted_winner": pick.predicted_winner
    }
    saved_pick = save_pick(pick_data, db, user_id)
    db_pick = db.query(models.UserPick).filter_by(**pick_data, user_id=user_id).first()
    if db_pick:
        db.refresh(db_pick)
    return saved_pick

@router.post("/bulk", response_model=List[UserPick])
async def create_picks_bulk(
    picks: List[UserPickCreate],
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    user_id = user["id"]
    logger.info(f"Creating bulk picks for user_id={user_id}, count={len(picks)}")
    
    saved_picks = []
    for pick in picks:
        pick_data = {
            "tournament_id": pick.tournament_id,
            "round": pick.round,
            "match_number": pick.match_number,
            "predicted_winner": pick.predicted_winner
        }
        saved_pick = save_pick(pick_data, db, user_id)
        saved_picks.append(saved_pick)
    
    db.commit()
    return saved_picks