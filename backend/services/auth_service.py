from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session
from database.models import User
from database.db import get_db
import logging
from init_data_py import InitData
from config import TELEGRAM_BOT_TOKEN

logger = logging.getLogger(__name__)

async def authenticate_user(request: Request, db: Session = Depends(get_db)) -> User:
    logger.info("Authenticating user via dependency...")
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

        user_id = user_data.id
        first_name = user_data.first_name or "Unknown"
        logger.info(f"Authenticated user: {user_id}, {first_name}")

        existing = db.query(User).filter(User.user_id == user_id).first()
        if not existing:
            logger.info(f"Creating new user: {user_id}, {first_name}")
            db_user = User(user_id=user_id, first_name=first_name)
            db.add(db_user)
            db.commit()
            db.refresh(db_user)
        else:
            logger.info(f"User already exists: {user_id}")
            existing.first_name = first_name
            db.commit()
            db.refresh(existing)
            db_user = existing

        return db_user
    except Exception as e:
        logger.error(f"Unexpected error in authenticate_user: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")