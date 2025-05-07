from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from database.db import get_db
from database import models
from schemas import Tournament, TrueDraw, UserPick
import logging
from utils.auth import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/tournament/{tournament_id}", response_model=Tournament)
async def get_tournament(tournament_id: int, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    logger.info(f"Fetching tournament with id={tournament_id}")
    tournament = db.query(models.Tournament).filter(models.Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    user_id = user["id"]
    logger.info(f"Using user_id={user_id} for picks")
    
    true_draws = db.query(models.TrueDraw).filter(models.TrueDraw.tournament_id == tournament_id).all()
    user_picks = db.query(models.UserPick).filter(
        models.UserPick.tournament_id == tournament_id,
        models.UserPick.user_id == user_id
    ).all()
    
    # Преобразование в Pydantic-объекты
    tournament_data = Tournament(
        id=tournament.id,
        name=tournament.name,
        dates=tournament.dates,
        status=tournament.status,
        sheet_name=tournament.sheet_name,
        starting_round=tournament.starting_round,
        type=tournament.type,
        start=tournament.start,
        close=tournament.close,
        tag=tournament.tag,
        true_draws=[TrueDraw.from_orm(draw) for draw in true_draws],
        user_picks=[UserPick.from_orm(pick) for pick in user_picks]
    )
    
    logger.info(f"Returning tournament with id={tournament_id}, true_draws count={len(true_draws)}, user_picks count={len(user_picks)}")
    return tournament_data