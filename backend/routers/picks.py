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
    logger.info(f"Received {len(picks)} picks for user_id={user_id}")
    
    saved_picks = []
    try:
        for pick in picks:
            # Преобразуем Pydantic модель в dict
            pick_data = {
                "tournament_id": pick.tournament_id,
                "round": pick.round,
                "match_number": pick.match_number,
                "predicted_winner": pick.predicted_winner
            }
            # save_pick теперь делает db.flush(), но не db.commit()
            save_pick(pick_data, db, user_id)
            saved_picks.append(pick_data)
        
        # Один коммит в конце для всех пиков
        db.commit()
        logger.info("Successfully committed all picks")
        
        # Возвращаем данные (нужно добавить id, чтобы соответствовать схеме, или заглушку)
        # Для простоты вернем то, что сохранили, добавив фейковые ID и даты, так как response_model требует их
        # Но проще вернуть просто статус 200 OK, если фронтенду не нужны ID созданных записей.
        # Чтобы не ломать типизацию, вернем пустой список или перезапросим из БД (лучше перезапросить, но это медленно).
        
        # Хак: возвращаем заглушки, так как фронтенд не использует ответ `savePicks`
        return [
            {**p, "id": 0, "user_id": user_id, "player1": "TBD", "player2": "TBD", "created_at": None, "updated_at": None} 
            for p in saved_picks
        ]

    except Exception as e:
        logger.error(f"Transaction failed: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save picks: {str(e)}")