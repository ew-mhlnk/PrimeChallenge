from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
import logging
from database.db import get_db
from database import models
from utils.auth import verify_telegram_data

router = APIRouter()
logger = logging.getLogger(__name__)

logger.info("Loading picks router - version with status.value check")  # Добавляем временный лог

@router.get("/")
async def get_picks(tournament_id: int, request: Request, db: Session = Depends(get_db)):
    logger.info(f"Fetching picks for tournament {tournament_id}")
    
    user_data = verify_telegram_data(request.headers.get("X-Telegram-Init-Data"))
    if not user_data:
        logger.error("Invalid Telegram auth data")
        raise HTTPException(status_code=403, detail="Invalid Telegram auth")
    
    user_id = user_data.get("id")
    logger.info(f"Authenticated user: {user_id}")

    picks = db.query(models.UserPick).filter(
        models.UserPick.user_id == user_id,
        models.UserPick.tournament_id == tournament_id
    ).all()
    
    if not picks:
        logger.info(f"No picks found for user {user_id} in tournament {tournament_id}")
        return []
    
    logger.info(f"Returning {len(picks)} picks for user {user_id} in tournament {tournament_id}")
    return picks

@router.post("/")
async def create_or_update_picks(
    picks: list[dict], request: Request, db: Session = Depends(get_db)
):
    user_data = verify_telegram_data(request.headers.get("X-Telegram-Init-Data"))
    if not user_data:
        logger.error("Invalid Telegram auth data")
        raise HTTPException(status_code=403, detail="Invalid Telegram auth")
    
    user_id = user_data.get("id")
    logger.info(f"Authenticated user: {user_id}")

    tournament_id = picks[0]["tournament_id"] if picks else None
    if not tournament_id:
        logger.error("No tournament_id provided in picks")
        raise HTTPException(status_code=400, detail="Tournament ID is required")

    # Проверяем статус турнира
    tournament = db.query(models.Tournament).filter(models.Tournament.id == tournament_id).first()
    if not tournament:
        logger.error(f"Tournament {tournament_id} not found")
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    if tournament.status.value != "ACTIVE":  # Используем .value для сравнения
        logger.error(f"Tournament {tournament_id} is not ACTIVE (status: {tournament.status})")
        raise HTTPException(status_code=400, detail="Cannot submit picks for a non-ACTIVE tournament")

    # Удаляем существующие пики пользователя для этого турнира
    db.query(models.UserPick).filter(
        models.UserPick.user_id == user_id,
        models.UserPick.tournament_id == tournament_id
    ).delete()

    # Создаём новые пики
    db_picks = []
    for pick in picks:
        if pick["tournament_id"] != tournament_id:
            logger.error(f"Inconsistent tournament_id in picks: {pick['tournament_id']}")
            raise HTTPException(status_code=400, detail="All picks must belong to the same tournament")
        
        db_pick = models.UserPick(
            user_id=user_id,
            tournament_id=pick["tournament_id"],
            round=pick["round"],
            match_number=pick["match_number"],
            player1=pick["player1"],
            player2=pick["player2"],
            predicted_winner=pick["predicted_winner"]
        )
        db.add(db_pick)
        db_picks.append(db_pick)
    
    db.commit()
    logger.info(f"Saved {len(db_picks)} picks for user {user_id} in tournament {tournament_id}")
    return db_picks