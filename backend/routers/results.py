from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
import logging
from database.db import get_db
from database import models
from utils.auth import verify_telegram_data

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/")
async def get_results(tournament_id: int, request: Request, db: Session = Depends(get_db)):
    logger.info(f"Fetching results for tournament {tournament_id}")
    
    user_data = verify_telegram_data(request.headers.get("X-Telegram-Init-Data"))
    if not user_data:
        logger.error("Invalid Telegram auth data")
        raise HTTPException(status_code=403, detail="Invalid Telegram auth")
    
    user_id = user_data.get("id")
    logger.info(f"Authenticated user: {user_id}")

    # Проверяем статус турнира
    tournament = db.query(models.Tournament).filter(models.Tournament.id == tournament_id).first()
    if not tournament:
        logger.error(f"Tournament {tournament_id} not found")
        raise HTTPException(status_code=404, detail="Tournament not found")

    # Получаем реальную сетку из true_draw
    true_draw = db.query(models.TrueDraw).filter(
        models.TrueDraw.tournament_id == tournament_id
    ).all()
    
    if not true_draw:
        logger.info(f"No true draw found for tournament {tournament_id}")
        return {"score": 0, "details": []}

    # Получаем пики пользователя
    user_picks = db.query(models.UserPick).filter(
        models.UserPick.user_id == user_id,
        models.UserPick.tournament_id == tournament_id
    ).all()
    
    if not user_picks:
        logger.info(f"No picks found for user {user_id} in tournament {tournament_id}")
        return {"score": 0, "details": []}

    # Начисляем очки
    round_points = {"R32": 1, "R16": 2, "QF": 4, "SF": 8, "F": 16}  # Система весов
    total_score = 0
    details = []

    for user_pick in user_picks:
        # Находим соответствующий матч в true_draw
        true_match = next(
            (match for match in true_draw
             if match.round == user_pick.round and match.match_number == user_pick.match_number),
            None
        )

        if not true_match or not true_match.winner:
            continue  # Матч ещё не завершён или не существует

        points = 0
        if user_pick.predicted_winner == true_match.winner:
            points = round_points.get(user_pick.round, 0)
            total_score += points
        
        details.append({
            "round": user_pick.round,
            "match_number": user_pick.match_number,
            "predicted_winner": user_pick.predicted_winner,
            "actual_winner": true_match.winner,
            "points": points
        })

    logger.info(f"Calculated score {total_score} for user {user_id} in tournament {tournament_id}")
    return {"score": total_score, "details": details}