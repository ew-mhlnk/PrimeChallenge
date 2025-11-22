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
    return picks

@router.post("/bulk", response_model=List[dict]) # Changed response_model to List[dict] to match return
async def create_picks_bulk(
    picks: List[UserPickCreate],
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    user_id = user["id"]
    logger.info(f"Received {len(picks)} picks for user_id={user_id}")
    
    try:
        # --- ФИКС: Проверяем и создаем пользователя, если его нет ---
        db_user = db.query(models.User).filter(models.User.user_id == user_id).first()
        if not db_user:
            logger.info(f"User {user_id} not found in DB during pick save. Creating...")
            new_user = models.User(
                user_id=user_id,
                first_name=user.get("first_name", "Unknown"),
                last_name=user.get("last_name", ""),
                username=user.get("username", "")
            )
            db.add(new_user)
            db.commit() # Важно закоммитить юзера сразу, чтобы FK работал
            logger.info(f"User {user_id} created successfully.")
        # ------------------------------------------------------------

        saved_picks = []
        for pick in picks:
            pick_data = {
                "tournament_id": pick.tournament_id,
                "round": pick.round,
                "match_number": pick.match_number,
                "predicted_winner": pick.predicted_winner
            }
            # save_pick делает db.flush()
            save_pick(pick_data, db, user_id)
            saved_picks.append(pick_data)
        
        db.commit()
        logger.info("Successfully committed all picks")
        
        # Возвращаем сохраненные данные с заглушками для id/дат, чтобы фронт не ждал лишнего
        return [
            {**p, "id": 0, "user_id": user_id, "player1": "TBD", "player2": "TBD", "created_at": None, "updated_at": None} 
            for p in saved_picks
        ]

    except Exception as e:
        logger.error(f"Transaction failed: {str(e)}")
        db.rollback()
        # Возвращаем детали ошибки клиенту
        raise HTTPException(status_code=500, detail=f"Failed to save picks: {str(e)}")