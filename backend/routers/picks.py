from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Dict
import logging
from datetime import datetime
from database.db import get_db
from database.models import UserPick, User, TrueDraw, Tournament
from utils.auth import verify_telegram_data

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/", response_model=List[Dict])
async def submit_picks(request: Dict, db: Session = Depends(get_db)):
    init_data = request.get("initData")
    picks = request.get("picks", [])

    if not init_data or not picks:
        logger.error("Missing initData or picks in request")
        raise HTTPException(status_code=400, detail="Missing initData or picks")

    telegram_user = verify_telegram_data(init_data)
    if not telegram_user:
        logger.error("Invalid Telegram initData")
        raise HTTPException(status_code=401, detail="Invalid Telegram initData")

    user_id = telegram_user.get("id")
    db_user = db.query(User).filter(User.user_id == user_id).first()
    if not db_user:
        logger.error(f"User with ID {user_id} not found")
        raise HTTPException(status_code=404, detail="User not found")

    submitted_picks = []
    for pick in picks:
        match_id = pick.get("match_id")
        predicted_winner = pick.get("predicted_winner")

        match = db.query(TrueDraw).filter(TrueDraw.id == match_id).first()
        if not match:
            logger.warning(f"Match with ID {match_id} not found")
            continue

        tournament = db.query(Tournament).filter(Tournament.id == match.tournament_id).first()
        if tournament.status == "CLOSED":
            logger.warning(f"Cannot submit picks for closed tournament: {tournament.name}")
            continue

        existing_pick = db.query(UserPick).filter(
            UserPick.user_id == user_id,
            UserPick.tournament_id == match.tournament_id,
            UserPick.match_number == match.match_number,
            UserPick.round == match.round
        ).first()

        if existing_pick:
            existing_pick.predicted_winner = predicted_winner
            existing_pick.updated_at = datetime.utcnow()
            logger.info(f"Updated pick for user {user_id}, match {match_id}")
        else:
            new_pick = UserPick(
                user_id=user_id,
                tournament_id=match.tournament_id,
                round=match.round,
                match_number=match.match_number,
                player1=match.player1,
                player2=match.player2,
                predicted_winner=predicted_winner
            )
            db.add(new_pick)
            logger.info(f"Created new pick for user {user_id}, match {match_id}")

        submitted_picks.append({
            "match_id": match_id,
            "predicted_winner": predicted_winner
        })

    db.commit()
    logger.info(f"Successfully submitted {len(submitted_picks)} picks for user {user_id}")
    return JSONResponse(content=submitted_picks)