from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database.db import get_db
from database import models
from database.models import User
from utils.auth import get_current_user
from utils.pick_handler import save_pick
from schemas import UserPick, UserPickCreate
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/user-picks", response_model=List[UserPick])
async def get_user_picks(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    user_id = user["id"]
    picks = db.query(models.UserPick).filter(models.UserPick.user_id == user_id).all()
    return picks

@router.post("/bulk", response_model=List[UserPick])
async def create_picks_bulk(
    picks: List[UserPickCreate],
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    user_id = user["id"]
    logger.info(f"Bulk save request for user {user_id}, picks: {len(picks)}")
    
    # 1. Гарантируем, что пользователь существует
    try:
        db_user = db.query(User).filter(User.user_id == user_id).first()
        if not db_user:
            logger.info(f"User {user_id} missing. Creating...")
            new_user = User(
                user_id=user_id,
                first_name=user.get("first_name", "Unknown"),
                last_name=user.get("last_name", ""),
                username=user.get("username", "")
            )
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            logger.info(f"User {user_id} created successfully")
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        db.rollback() # Откатываем транзакцию, чтобы не блокировать БД
        # Пробуем продолжить, возможно, юзер был создан в параллельном запросе
    
    # 2. Сохраняем пики
    saved_picks = []
    for pick in picks:
        if not pick.predicted_winner:
            continue

        pick_data = {
            "tournament_id": pick.tournament_id,
            "round": pick.round,
            "match_number": pick.match_number,
            "predicted_winner": pick.predicted_winner
        }
        
        try:
            # Используем save_pick (он делает commit внутри)
            # Важно: save_pick удаляет старые пики будущих раундов
            saved = save_pick(pick_data, db, user_id)
            saved_picks.append(saved)
        except Exception as e:
            logger.error(f"Error saving pick {pick_data}: {e}")
            db.rollback() # Откат конкретного пика, идем к следующему
            continue
            
    return saved_picks