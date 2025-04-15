from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
import logging
from database.db import SessionLocal
from database.models import User, Match, Pick, Tournament
from ..services.auth_service import authenticate_user

router = APIRouter()
logger = logging.getLogger(__name__)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/")
async def submit_pick(request: Request, db: Session = Depends(get_db)):
    logger.info("Submitting picks")
    body = await request.json()
    init_data_raw = body.get("initData")
    picks = body.get("picks", [])
    if not init_data_raw:
        raise HTTPException(status_code=400, detail="No initData provided")
    if not picks:
        raise HTTPException(status_code=400, detail="No picks provided")
    
    user_data = authenticate_user(init_data_raw)
    user = db.query(User).filter(User.user_id == user_data.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    for pick in picks:
        match_id = pick.get("match_id")
        predicted_winner = pick.get("predicted_winner")
        match = db.query(Match).filter(Match.id == match_id).first()
        if not match:
            raise HTTPException(status_code=404, detail=f"Match {match_id} not found")
        
        existing_pick = db.query(Pick).filter(
            Pick.user_id == user.user_id,
            Pick.match_id == match_id
        ).first()
        if existing_pick:
            existing_pick.predicted_winner = predicted_winner
            db.commit()
            db.refresh(existing_pick)
        else:
            db_pick = Pick(
                user_id=user.user_id,
                match_id=match_id,
                predicted_winner=predicted_winner
            )
            db.add(db_pick)
            db.commit()
            db.refresh(db_pick)
    
    return {"status": "ok"}

@router.post("/reset-tournaments")
def reset_tournaments(db: Session = Depends(get_db)):
    logger.info("Resetting tournaments table")
    db.query(Tournament).delete()
    db.commit()
    return {"status": "ok"}