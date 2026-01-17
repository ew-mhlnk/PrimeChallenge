from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import logging
from database.db import get_db
from database.models import User
from schemas import UserBase
from utils.auth import verify_telegram_data
from pydantic import BaseModel

# ВОТ ЭТА СТРОКА ОБЯЗАТЕЛЬНА, её не было:
router = APIRouter()
logger = logging.getLogger(__name__)

class AuthRequest(BaseModel):
    initData: str

@router.post("/", response_model=UserBase)
def auth(auth_data: AuthRequest, db: Session = Depends(get_db)):
    init_data_raw = auth_data.initData
    if not init_data_raw:
        raise HTTPException(status_code=400, detail="No initData provided")

    try:
        user_data = verify_telegram_data(init_data_raw)
    except Exception as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=403, detail="Invalid Telegram auth")

    if not user_data:
        raise HTTPException(status_code=403, detail="Invalid Telegram auth")

    try:
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
            if existing.first_name != first_name or existing.last_name != last_name or existing.username != username:
                existing.first_name = first_name
                existing.last_name = last_name
                existing.username = username
                db.commit()
                db.refresh(existing)
            db_user = existing

        return db_user

    except Exception as e:
        logger.error(f"Database error in auth: {e}")
        raise HTTPException(status_code=500, detail="Database error")