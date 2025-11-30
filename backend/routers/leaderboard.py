from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from database.db import get_db
from database import models
from schemas import LeaderboardBase

router = APIRouter()

@router.get("/", response_model=List[dict])
async def get_global_leaderboard(db: Session = Depends(get_db)):
    """
    Возвращает глобальный лидерборд (сумма очков по всем турнирам 2025 года).
    """
    # 1. Суммируем очки по пользователям
    # В реальном SQL это GROUP BY. В SQLAlchemy:
    from sqlalchemy import func, desc
    
    results = db.query(
        models.User.username,
        models.User.first_name,
        models.User.last_name,
        models.User.user_id,
        func.sum(models.Leaderboard.score).label("total_score"),
        func.sum(models.Leaderboard.correct_picks).label("total_correct")
    ).join(models.Leaderboard, models.User.user_id == models.Leaderboard.user_id)\
     .group_by(models.User.user_id)\
     .order_by(desc("total_score"), desc("total_correct"))\
     .all()
    
    leaderboard = []
    for idx, row in enumerate(results):
        name = row.username if row.username else f"{row.first_name} {row.last_name or ''}".strip()
        leaderboard.append({
            "rank": idx + 1,
            "user_id": row.user_id,
            "username": name,
            "score": row.total_score,
            "correct_picks": row.total_correct
        })
        
    return leaderboard

@router.get("/tournament/{tournament_id}", response_model=List[dict])
async def get_tournament_leaderboard(tournament_id: int, db: Session = Depends(get_db)):
    """
    Лидерборд конкретного турнира.
    """
    entries = db.query(models.Leaderboard).filter(
        models.Leaderboard.tournament_id == tournament_id
    ).order_by(models.Leaderboard.rank).all()
    
    result = []
    for entry in entries:
        user = db.query(models.User).filter(models.User.user_id == entry.user_id).first()
        name = user.username if user and user.username else f"{user.first_name} {user.last_name or ''}".strip()
        result.append({
            "rank": entry.rank,
            "user_id": entry.user_id,
            "username": name,
            "score": entry.score,
            "correct_picks": entry.correct_picks
        })
        
    return result