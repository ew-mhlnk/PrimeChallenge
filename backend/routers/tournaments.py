# backend/routers/tournaments.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import logging

from database.db import get_db
from database import models
from schemas import Tournament, TrueDraw, UserPick
from utils.auth import get_current_user
from utils.bracket import generate_bracket
# Импортируем нашу новую функцию
from utils.bracket_status import enrich_bracket_with_status

router = APIRouter()
logger = logging.getLogger(__name__)

# Убрал слеш в конце, как мы договаривались
@router.get("/tournaments", response_model=List[dict])
async def get_tournaments(db: Session = Depends(get_db)):
    logger.info("Fetching all tournaments")
    tournaments = db.query(models.Tournament).all()
    return [
        {
            "id": t.id,
            "name": t.name,
            "status": t.status,
            "dates": t.dates,
            "start": t.start,
            "close": t.close,
            "tag": t.tag,
        }
        for t in tournaments
    ]

@router.get("/tournament/{id}", response_model=dict)
async def get_tournament_by_id(id: int, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    logger.info(f"Fetching tournament with id={id}")
    tournament = db.query(models.Tournament).filter(models.Tournament.id == id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    user_id = user["id"]
    
    true_draws = db.query(models.TrueDraw).filter(models.TrueDraw.tournament_id == id).all()
    
    user_picks = db.query(models.UserPick).filter(
        models.UserPick.tournament_id == id,
        models.UserPick.user_id == user_id
    ).all()
    
    all_rounds = ['R128', 'R64', 'R32', 'R16', 'QF', 'SF', 'F', 'Champion']
    start_round_clean = tournament.starting_round.strip() if tournament.starting_round else "R32"
    try:
        starting_index = all_rounds.index(start_round_clean)
    except ValueError:
        starting_index = 2 
    rounds = all_rounds[starting_index:]
    
    # 1. Генерируем структуру
    bracket = generate_bracket(tournament, true_draws, user_picks, rounds)
    
    # 2. Обогащаем статусами (ТОЛЬКО ЕСЛИ ТУРНИР ЗАКРЫТ)
    if tournament.status in ["CLOSED", "COMPLETED"]:
        bracket = enrich_bracket_with_status(bracket, true_draws)

    has_picks = any(p.predicted_winner for p in user_picks)
    
    user_score_obj = db.query(models.UserScore).filter_by(user_id=user_id, tournament_id=tournament.id).first()
    current_score = user_score_obj.score if user_score_obj else 0
    current_correct = user_score_obj.correct_picks if user_score_obj else 0

    true_draws_data = [TrueDraw.model_validate(draw) for draw in true_draws]
    user_picks_data = [UserPick.model_validate(pick) for pick in user_picks]

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
        true_draws=true_draws_data,
        user_picks=user_picks_data,
        scores=None
    )
    
    return {
        **tournament_data.dict(),
        "rounds": rounds,
        "bracket": bracket,
        "has_picks": has_picks,
        "score": current_score,
        "correct_picks": current_correct
    }