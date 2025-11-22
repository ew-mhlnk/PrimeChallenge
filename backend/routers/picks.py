from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database.db import get_db
from database import models
from utils.auth import get_current_user
# Импортируем новую функцию
from utils.pick_handler import save_pick, save_picks_bulk_transaction
from schemas import UserPick, UserPickCreate
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/user-picks", response_model=List[UserPick])
async def get_user_picks(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    user_id = user["id"]
    picks = db.query(models.UserPick).filter(models.UserPick.user_id == user_id).all()
    return [UserPick.model_validate(p) for p in picks]

@router.post("/", response_model=UserPick)
async def create_pick(
    pick: UserPickCreate,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    # Оставляем для совместимости
    user_id = user["id"]
    pick_data = {
        "tournament_id": pick.tournament_id,
        "round": pick.round,
        "match_number": pick.match_number,
        "predicted_winner": pick.predicted_winner
    }
    return save_pick(pick_data, db, user_id)

@router.post("/bulk", response_model=List[UserPick])
async def create_picks_bulk(
    picks: List[UserPickCreate],
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    user_id = user["id"]
    # Вызываем новую транзакционную функцию
    return save_picks_bulk_transaction(picks, db, user_id)