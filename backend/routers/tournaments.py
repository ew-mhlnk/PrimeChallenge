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
def get_tournaments(db: Session = Depends(get_db)):
    logger.info("Fetching all tournaments")
    # Сортировка: Старые (1) -> Новые (100)
    tournaments = db.query(models.Tournament).order_by(models.Tournament.id.asc()).all()
    
    return [
        {
            "id": t.id,
            "name": t.name,
            "status": t.status,
            "dates": t.dates,
            "start": t.start,
            "close": t.close,
            "tag": t.tag,
            "surface": t.surface,
            "defending_champion": t.defending_champion,
            "description": t.description,
            "matches_count": t.matches_count,
            "month": t.month,
            "image_url": t.image_url
        }
        for t in tournaments
    ]


@router.get("/tournament/{id}", response_model=dict)
def get_tournament_by_id(
    id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    logger.info(f"Fetching tournament with id={id}")
    tournament = db.query(models.Tournament).filter(models.Tournament.id == id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    user_id = user["id"]
    
    # === GOD MODE: ТЕСТЕРЫ ===
    # Список ID юзеров-тестеров
    TESTERS = [1783228089, 1009165444, 360269274, 8148191986, 7679429681, 8348181797]
    # Список ID турниров для тестов (добавлены 52 и 53)
    TEST_TOURNAMENTS = [116, 29, 52, 53]

    # Изначальный статус из базы
    status_val = tournament.status
    status_str = status_val.value if hasattr(status_val, 'value') else str(status_val)
    status_str = status_str.upper()

    # ЕСЛИ это тестер и нужный турнир -> ПРИНУДИТЕЛЬНО ставим ACTIVE
    if user_id in TESTERS and id in TEST_TOURNAMENTS:
        status_str = "ACTIVE"
    # ==========================
    
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
    
    bracket = generate_bracket(tournament, true_draws, user_picks, rounds)
    
    # Используем status_str (возможно, подмененный) для логики закрытия
    if status_str in ["CLOSED", "COMPLETED"]:
        try:
            bracket = reconstruct_fantasy_bracket(bracket, user_picks)
            bracket = enrich_bracket_with_status(bracket, true_draws)
        except Exception as e:
            logger.error(f"Error applying fantasy logic: {e}")
    
    has_picks = any(p.predicted_winner for p in user_picks)
    
    user_score_obj = db.query(models.UserScore).filter_by(
        user_id=user_id,
        tournament_id=tournament.id
    ).first()
    current_score = user_score_obj.score if user_score_obj else 0
    current_correct = user_score_obj.correct_picks if user_score_obj else 0

    true_draws_data = [TrueDraw.model_validate(draw) for draw in true_draws]
    user_picks_data = [UserPick.model_validate(pick) for pick in user_picks]

    tournament_data = Tournament(
        id=tournament.id,
        name=tournament.name,
        dates=tournament.dates,
        status=status_str, # <--- ВАЖНО: Передаем нашу переменную, а не tournament.status
        sheet_name=tournament.sheet_name,
        starting_round=tournament.starting_round,
        type=tournament.type,
        start=tournament.start,
        close=tournament.close,
        tag=tournament.tag,
        surface=tournament.surface,
        defending_champion=tournament.defending_champion,
        description=tournament.description,
        matches_count=tournament.matches_count,
        month=tournament.month,
        image_url=tournament.image_url,
        
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

# === НОВЫЙ ЭНДПОИНТ: ПРОСМОТР ЧУЖОЙ СЕТКИ ===
@router.get("/tournament/{id}/user/{target_user_id}", response_model=dict)
def get_other_user_tournament(
    id: int,
    target_user_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """
    Получение сетки ДРУГОГО пользователя.
    """
    logger.info(f"User {user['id']} requesting bracket of {target_user_id} for tournament {id}")
    
    tournament = db.query(models.Tournament).filter(models.Tournament.id == id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    # Проверка статуса (безопасность на уровне API)
    status_val = tournament.status
    status_str = str(status_val.value if hasattr(status_val, 'value') else status_val).upper()
    
    # Если турнир идет (ACTIVE) и смотрят чужую сетку - запрещаем
    if status_str == "ACTIVE" and target_user_id != user['id']:
        raise HTTPException(status_code=403, detail="Picks are hidden")

    # Берем пики ЦЕЛЕВОГО юзера
    true_draws = db.query(models.TrueDraw).filter(models.TrueDraw.tournament_id == id).all()
    user_picks = db.query(models.UserPick).filter(
        models.UserPick.tournament_id == id,
        models.UserPick.user_id == target_user_id 
    ).all()
    
    all_rounds = ['R128', 'R64', 'R32', 'R16', 'QF', 'SF', 'F', 'Champion']
    start_round_clean = tournament.starting_round.strip() if tournament.starting_round else "R32"
    try:
        starting_index = all_rounds.index(start_round_clean)
    except ValueError:
        starting_index = 2
    rounds = all_rounds[starting_index:]
    
    bracket = generate_bracket(tournament, true_draws, user_picks, rounds)
    
    # Применяем логику раскраски (потому что мы смотрим историю)
    try:
        bracket = reconstruct_fantasy_bracket(bracket, user_picks)
        bracket = enrich_bracket_with_status(bracket, true_draws)
    except Exception as e:
        logger.error(f"Error applying fantasy logic: {e}")
    
    has_picks = any(p.predicted_winner for p in user_picks)
    
    user_score_obj = db.query(models.UserScore).filter_by(
        user_id=target_user_id,
        tournament_id=tournament.id
    ).first()
    current_score = user_score_obj.score if user_score_obj else 0
    current_correct = user_score_obj.correct_picks if user_score_obj else 0

    # Имя юзера для заголовка
    target_user_db = db.query(models.User).filter(models.User.user_id == target_user_id).first()
    target_name = "Unknown"
    if target_user_db:
        target_name = target_user_db.username if target_user_db.username else target_user_db.first_name

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
        surface=tournament.surface,
        defending_champion=tournament.defending_champion,
        description=tournament.description,
        matches_count=tournament.matches_count,
        month=tournament.month,
        image_url=tournament.image_url,
        
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
        "correct_picks": current_correct,
        "viewing_user_name": target_name
    }