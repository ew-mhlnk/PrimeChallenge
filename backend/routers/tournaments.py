from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import logging
from backend.database.db import get_db
from backend.database import models
from backend.schemas import TournamentResponse
from backend.utils.auth import get_current_user
from backend.utils.bracket import generate_bracket

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/tournaments/", response_model=List[dict])
async def get_tournaments(db: Session = Depends(get_db)):
    logger.info("Fetching all tournaments")
    tournaments = db.query(models.Tournament).all()
    logger.info(f"Returning {len(tournaments)} tournaments")
    return [
        {
            "id": t.id,
            "name": t.name,
            "status": t.status.value,
            "starting_round": t.starting_round,
        }
        for t in tournaments
    ]

@router.get("/tournament/{id}", response_model=TournamentResponse)
async def get_tournament_by_id(id: int, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    logger.info(f"Fetching tournament with id={id}")
    tournament = db.query(models.Tournament).filter(models.Tournament.id == id).first()
    if not tournament:
        logger.error(f"Tournament with id={id} not found")
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    user_id = user["id"]
    logger.info(f"Using user_id={user_id} for picks")
    
    true_draws = db.query(models.TrueDraw).filter(models.TrueDraw.tournament_id == id).all()
    logger.info(f"Fetched {len(true_draws)} true_draws for tournament {id}")
    
    user_picks = db.query(models.UserPick).filter(
        models.UserPick.tournament_id == id,
        models.UserPick.user_id == user_id
    ).all()
    logger.info(f"Fetched {len(user_picks)} user_picks for user {user_id}")
    
    # Генерируем сетку и сравнение
    bracket, comparison, rounds = generate_bracket(tournament, true_draws, user_picks)
    has_picks = any(p.predicted_winner for p in user_picks)
    
    logger.info(f"Returning tournament with id={id}, true_draws count={len(true_draws)}, user_picks count={len(user_picks)}")
    return {
        "id": tournament.id,
        "name": tournament.name,
        "status": tournament.status.value,
        "starting_round": tournament.starting_round,
        "rounds": rounds,
        "bracket": bracket,
        "has_picks": has_picks,
        "comparison": comparison
    }