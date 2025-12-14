from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import logging

from database.db import get_db
from database import models
from schemas import Tournament, TrueDraw, UserPick
from utils.auth import get_current_user
from utils.bracket import generate_bracket
from utils.bracket_status import enrich_bracket_with_status, reconstruct_fantasy_bracket

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/tournaments", response_model=List[dict])
async def get_tournaments(db: Session = Depends(get_db)):
    logger.info("Fetching all tournaments")
    tournaments = db.query(models.Tournament).all()
    
    # --- ИСПРАВЛЕНИЕ: Добавляем новые поля в ответ ---
    return [
        {
            "id": t.id,
            "name": t.name,
            "status": t.status,
            "dates": t.dates,
            "start": t.start,
            "close": t.close,
            "tag": t.tag,
            # Новые поля
            "surface": t.surface,
            "defending_champion": t.defending_champion,
            "description": t.description,
            "matches_count": t.matches_count,
            "month": t.month, # <--- ВОТ ОНО! Без этого фронт не видит месяц
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
    
    # Преобразование Enum в строку (fix для PostgreSQL Enum error)
    status_val = tournament.status
    status_str = status_val.value if hasattr(status_val, 'value') else str(status_val)
    status_str = status_str.upper()
    
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
    
    # 1. Генерация структуры
    bracket = generate_bracket(tournament, true_draws, user_picks, rounds)
    
    # 2. Логика Фэнтези для закрытых турниров
    if status_str in ["CLOSED", "COMPLETED"]:
        try:
            bracket = reconstruct_fantasy_bracket(bracket, user_picks)
            bracket = enrich_bracket_with_status(bracket, true_draws)
        except Exception as e:
            logger.error(f"Error applying fantasy logic: {e}")

    has_picks = any(p.predicted_winner for p in user_picks)
    
    user_score_obj = db.query(models.UserScore).filter_by(user_id=user_id, tournament_id=tournament.id).first()
    current_score = user_score_obj.score if user_score_obj else 0
    current_correct = user_score_obj.correct_picks if user_score_obj else 0

    true_draws_data = [TrueDraw.model_validate(draw) for draw in true_draws]
    user_picks_data = [UserPick.model_validate(pick) for pick in user_picks]

    # Создаем объект Tournament с новыми полями
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
        # Новые поля
        surface=tournament.surface,
        defending_champion=tournament.defending_champion,
        description=tournament.description,
        matches_count=tournament.matches_count,
        month=tournament.month,
        
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