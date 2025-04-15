from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import logging
from database.db import SessionLocal
from database.models import User
from pydantic import BaseModel
from services.auth_service import authenticate_user

router = APIRouter()
logger = logging.getLogger(__name__)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class AuthRequest(BaseModel):
    initData: str

class AuthResponse(BaseModel):
    user_id: int
    first_name: str

@router.post("/", response_model=AuthResponse)
def auth(request: AuthRequest, db: Session = Depends(get_db)):
    logger.info("Auth endpoint accessed")
    logger.debug(f"Received initData: {request.initData}")
    try:
        user = authenticate_user(request.initData, db)
        logger.info(f"Authenticated user: {user.user_id}, {user.first_name}")
        return {"user_id": user.user_id, "first_name": user.first_name}
    except Exception as e:
        logger.error(f"Authentication failed: {str(e)}")
        raise HTTPException(status_code=401, detail="Authentication failed")