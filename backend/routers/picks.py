from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database.db import get_db
from database import models
from database.models import User
from utils.auth import get_current_user
from utils.pick_handler import save_picks_bulk_transaction # <--- ИСПОЛЬЗУЕМ ЭТО
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
    logger.info(f"Bulk save request for user {user_id}, picks count: {len(picks)}")
    
    if not picks:
        return []

    # 1. Гарантируем, что пользователь существует
    try:
        # Пытаемся найти или создать пользователя
        db_user = db.query(User).filter(User.user_id == user_id).first()
        if not db_user:
            logger.info(f"User {user_id} missing in DB. Creating...")
            new_user = User(
                user_id=user_id,
                first_name=user.get("first_name", "Unknown"),
                last_name=user.get("last_name", ""),
                username=user.get("username", "")
            )
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        db.rollback()
        # Если юзер уже есть (race condition), просто продолжаем
    
    # 2. Сохраняем пики одной транзакцией
    try:
        saved_picks = save_picks_bulk_transaction(picks, db, user_id)
        return saved_picks
    except Exception as e:
        logger.error(f"CRITICAL ERROR in bulk save: {e}")
        raise HTTPException(status_code=500, detail=f"Save failed: {str(e)}")