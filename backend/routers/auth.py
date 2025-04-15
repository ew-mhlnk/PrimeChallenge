from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
import logging
from database.db import SessionLocal
from database.models import User
from services.auth_service import authenticate_user

router = APIRouter()
logger = logging.getLogger(__name__)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/")
async def auth(request: Request, db: Session = Depends(get_db)):
    logger.info("Auth endpoint accessed")
    try:
        body = await request.json()
        logger.debug(f"Request body: {body}")
        init_data_raw = body.get("initData")
        if not init_data_raw:
            logger.error("No initData provided")
            raise HTTPException(status_code=400, detail="No initData provided")

        user_data = authenticate_user(init_data_raw)
        user_id = user_data.id
        first_name = user_data.first_name
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

        return {"status": "ok", "user_id": user_id}
    except Exception as e:
        logger.error(f"Unexpected error in auth endpoint: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")