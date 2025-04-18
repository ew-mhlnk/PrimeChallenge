from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
import logging
from database.db import get_db
from database.models import User
from pydantic import BaseModel
from init_data_py import InitData
from config import TELEGRAM_BOT_TOKEN

router = APIRouter()
logger = logging.getLogger(__name__)

class AuthResponse(BaseModel):
    status: str
    user_id: int

@router.post("/", response_model=AuthResponse)
async def auth(request: Request, db: Session = Depends(get_db)):
    logger.info("Auth endpoint accessed")
    try:
        body = await request.json()
        logger.debug(f"Request body: {body}")
        init_data_raw = body.get("initData")
        if not init_data_raw:
            logger.error("No initData provided in request")
            raise HTTPException(status_code=400, detail="No initData provided")

        logger.info("Validating initData...")
        try:
            init_data = InitData.parse(init_data_raw)
            init_data.validate(TELEGRAM_BOT_TOKEN, lifetime=3600)
            logger.info("Init data validated successfully")
        except Exception as e:
            logger.error(f"Init data validation failed: {e}")
            raise HTTPException(status_code=403, detail="Invalid Telegram auth")

        user_data = init_data.user
        if not user_data:
            logger.error("User not found in initData")
            raise HTTPException(status_code=400, detail="User not found")

        telegram_id = user_data.id  # Используем telegram_id
        first_name = user_data.first_name or "Unknown"
        last_name = user_data.last_name
        username = user_data.username
        logger.info(f"Authenticated user: {telegram_id}, {first_name}")

        existing = db.query(User).filter(User.telegram_id == telegram_id).first()
        if not existing:
            logger.info(f"Creating new user: {telegram_id}, {first_name}")
            db_user = User(
                telegram_id=telegram_id,
                first_name=first_name,
                last_name=last_name,
                username=username
            )
            db.add(db_user)
            db.commit()
            db.refresh(db_user)
        else:
            logger.info(f"User already exists: {telegram_id}")
            existing.first_name = first_name
            existing.last_name = last_name
            existing.username = username
            db.commit()
            db.refresh(existing)
            db_user = existing

        return {"status": "ok", "user_id": db_user.id}  # Возвращаем id из базы
    except Exception as e:
        logger.error(f"Unexpected error in auth endpoint: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")