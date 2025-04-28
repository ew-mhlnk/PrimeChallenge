from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database.db import get_db
from database import models
from utils.auth import get_current_user  # Добавлен импорт
import logging

router = APIRouter()

logger = logging.getLogger(__name__)

# Получение лидерборда для турнира
@router.get("/leaderboard")
async def get_leaderboard(
    tournament_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user),
):
    logger.info(f"Fetching leaderboard for tournament_id={tournament_id}")
    
    # Получаем записи из таблицы leaderboard
    leaderboard_entries = (
        db.query(models.Leaderboard)
        .filter(models.Leaderboard.tournament_id == tournament_id)
        .order_by(models.Leaderboard.rank)
        .limit(10)  # Топ-10
        .all()
    )

    leaderboard = []
    for entry in leaderboard_entries:
        user = db.query(models.User).filter(models.User.user_id == entry.user_id).first()
        leaderboard.append({
            "rank": entry.rank,
            "user_id": entry.user_id,
            "username": user.username or user.first_name,
            "score": entry.score,
            "correct_picks": entry.correct_picks,
        })

    # Получаем данные текущего пользователя, если он не в топ-10
    user_entry = (
        db.query(models.Leaderboard)
        .filter(
            models.Leaderboard.tournament_id == tournament_id,
            models.Leaderboard.user_id == user_id,
        )
        .first()
    )
    if user_entry and user_entry.rank > 10:
        user = db.query(models.User).filter(models.User.user_id == user_id).first()
        leaderboard.append({
            "rank": user_entry.rank,
            "user_id": user_id,
            "username": user.username or user.first_name,
            "score": user_entry.score,
            "correct_picks": user_entry.correct_picks,
        })

    return leaderboard