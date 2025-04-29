from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
import logging
from database.db import get_db
from database.models import User
from schemas import UserBase
from utils.auth import verify_telegram_data

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/", response_model=UserBase)
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
        user_data = verify_telegram_data(init_data_raw)
        if not user_data:
            logger.error("Init data validation failed")
            raise HTTPException(status_code=403, detail="Invalid Telegram auth")

        user_id = user_data.get("id")
        first_name = user_data.get("first_name", "Unknown")
        last_name = user_data.get("last_name", "")
        username = user_data.get("username", "")
        logger.info(f"Authenticated user: {user_id}, {first_name}")

        existing = db.query(User).filter(User.user_id == user_id).first()
        if not existing:
            logger.info(f"Creating new user: {user_id}, {first_name}")
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
            logger.info(f"User already exists: {user_id}")
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