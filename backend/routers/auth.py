from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import logging
from database.db import SessionLocal
from database.models import User
from pydantic import BaseModel
from services.auth_service import authenticate_user  # Абсолютный импорт

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
    user = authenticate_user(request.initData, db)
    return {"user_id": user.user_id, "first_name": user.first_name}