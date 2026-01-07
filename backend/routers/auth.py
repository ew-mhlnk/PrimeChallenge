# backend/routers/auth.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import logging
from database.db import get_db
from database.models import User
from schemas import UserBase
from utils.auth import verify_telegram_data
from pydantic import BaseModel # <--- Импорт

router = APIRouter()
logger = logging.getLogger(__name__)

# Создаем простую схему для входных данных прямо тут
class AuthRequest(BaseModel):
    initData: str

# УБРАЛИ async, заменили Request на AuthRequest
@router.post("/", response_model=UserBase)
def auth(auth_data: AuthRequest, db: Session = Depends(get_db)):
    logger.info("Auth endpoint accessed")
    try:
        # Было: body = await request.json() ...
        # Стало: берем данные из Pydantic модели
        init_data_raw = auth_data.initData
        
        if not init_data_raw:
            logger.error("No initData provided")
            raise HTTPException(status_code=400, detail="No initData provided")

        logger.info("Validating initData...")
        user_data = verify_telegram_data(init_data_raw)
        
        # ... (дальше код без изменений) ...
        if not user_data:
            logger.error("Init data validation failed")
            raise HTTPException(status_code=403, detail="Invalid Telegram auth")

        user_id = user_data.get("id")
        first_name = user_data.get("first_name", "Unknown")
        last_name = user_data.get("last_name", "")
        username = user_data.get("username", "")
        
        existing = db.query(User).filter(User.user_id == user_id).first()
        
        if not existing:
            db_user = User(
                user_id=user_id,
                first_name=first_name,
                last_name=last_name,
                username=username
            )
            db.add(db_user)
            db.commit()
            db.refresh(db_user)
        else:
            existing.first_name = first_name
            existing.last_name = last_name
            existing.username = username
            db.commit()
            db.refresh(existing)
            db_user = existing

        return db_user
    except Exception as e:
        logger.error(f"Unexpected error in auth endpoint: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")