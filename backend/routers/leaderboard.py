# backend/routers/leaderboard.py

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List
from database.db import get_db
from database import models
# Убираем schemas, так как возвращаем dict

router = APIRouter()

@router.get("/", response_model=List[dict])
async def get_global_leaderboard(db: Session = Depends(get_db)):
    """
    Глобальный лидерборд (сумма очков по всем турнирам).
    """
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
    Лидерборд турнира. Оптимизированный JOIN (1 запрос вместо N+1).
    """
    # Делаем JOIN сразу к таблице User
    results = db.query(models.Leaderboard, models.User)\
        .join(models.User, models.Leaderboard.user_id == models.User.user_id)\
        .filter(models.Leaderboard.tournament_id == tournament_id)\
        .order_by(models.Leaderboard.rank)\
        .all()
    
    output = []
    for lb_entry, user_entry in results:
        name = user_entry.username if user_entry.username else f"{user_entry.first_name} {user_entry.last_name or ''}".strip()
        
        output.append({
            "rank": lb_entry.rank,
            "user_id": lb_entry.user_id,
            "username": name,
            "score": lb_entry.score,
            "correct_picks": lb_entry.correct_picks
        })
        
    return output