from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List
from database.db import get_db
from database import models
from utils.auth import get_current_user

router = APIRouter()

# --- 1. ГЛОБАЛЬНЫЙ ЛИДЕРБОРД ---
@router.get("/", response_model=List[dict])
async def get_global_leaderboard(db: Session = Depends(get_db)):
    """
    Глобальный рейтинг пользователей по сумме очков за все турниры.
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
     .limit(100)\
     .all()
    
    leaderboard = []
    for idx, row in enumerate(results):
        name = row.username if row.username else f"{row.first_name} {row.last_name or ''}".strip()
        leaderboard.append({
            "rank": idx + 1,
            "user_id": row.user_id,
            "username": name,
            "score": row.total_score,
            "correct_picks": row.total_correct,
            # Заглушки для глобального, чтобы фронт не ругался
            "incorrect_picks": 0,
            "total_picks": 0,
            "percent": "0%"
        })
        
    return leaderboard

# --- 2. СПИСОК ТУРНИРОВ С РАНГОМ ЮЗЕРА (НОВОЕ) ---
@router.get("/list", response_model=List[dict])
async def get_tournaments_with_ranks(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """
    Отдает список турниров (ACTIVE, COMPLETED, CLOSED).
    Для каждого турнира возвращает место (rank) текущего пользователя и общее кол-во участников.
    """
    user_id = user["id"]
    
    # Берем турниры, где есть рейтинг
    tournaments = db.query(models.Tournament).filter(
        models.Tournament.status.in_(["ACTIVE", "COMPLETED", "CLOSED"])
    ).order_by(models.Tournament.id.desc()).all()
    
    result = []
    
    for t in tournaments:
        # Считаем общее кол-во участников в лидерборде этого турнира
        total_participants = db.query(models.Leaderboard).filter(
            models.Leaderboard.tournament_id == t.id
        ).count()
        
        # Ищем запись текущего пользователя
        my_entry = db.query(models.Leaderboard).filter(
            models.Leaderboard.tournament_id == t.id,
            models.Leaderboard.user_id == user_id
        ).first()
        
        my_rank = my_entry.rank if my_entry else None
        
        result.append({
            "id": t.id,
            "name": t.name,
            "dates": t.dates,
            "status": t.status,
            "type": t.type,
            "tag": t.tag,
            "my_rank": my_rank,
            "total_participants": total_participants
        })
        
    return result

# --- 3. ЛИДЕРБОРД КОНКРЕТНОГО ТУРНИРА ---
@router.get("/tournament/{tournament_id}", response_model=List[dict])
async def get_tournament_leaderboard(tournament_id: int, db: Session = Depends(get_db)):
    """
    Детальный рейтинг турнира.
    Считает статистику (Неверно, %) "на лету", не требуя миграций БД.
    """
    # А. Основной рейтинг
    lb_results = db.query(models.Leaderboard, models.User)\
        .join(models.User, models.Leaderboard.user_id == models.User.user_id)\
        .filter(models.Leaderboard.tournament_id == tournament_id)\
        .order_by(models.Leaderboard.rank)\
        .all()
    
    # Б. Подсчет статистики "на лету" (без изменения БД)
    # Считаем, сколько матчей ЗАВЕРШИЛОСЬ в этом турнире, на которые юзеры делали прогнозы.
    finished_matches_query = db.query(
        models.UserPick.user_id,
        func.count(models.UserPick.id).label("total_finished")
    ).join(models.TrueDraw, 
        (models.UserPick.tournament_id == models.TrueDraw.tournament_id) &
        (models.UserPick.round == models.TrueDraw.round) &
        (models.UserPick.match_number == models.TrueDraw.match_number)
    ).filter(
        models.UserPick.tournament_id == tournament_id,
        models.TrueDraw.winner.isnot(None),  # Только завершенные матчи
        models.UserPick.predicted_winner.isnot(None) # Где был прогноз
    ).group_by(models.UserPick.user_id).all()

    # Словарь: {user_id: кол-во завершенных матчей}
    stats_map = {row.user_id: row.total_finished for row in finished_matches_query}
    
    output = []
    for lb_entry, user_entry in lb_results:
        name = user_entry.username if user_entry.username else f"{user_entry.first_name} {user_entry.last_name or ''}".strip()
        
        correct = lb_entry.correct_picks
        # Берем общее кол-во завершенных прогнозов из подсчета
        total = stats_map.get(lb_entry.user_id, 0)
        
        # Вычисляем
        incorrect = max(0, total - correct)
        percent = 0
        if total > 0:
            percent = round((correct / total) * 100)
        
        output.append({
            "rank": lb_entry.rank,
            "user_id": lb_entry.user_id,
            "username": name,
            "score": lb_entry.score,
            "correct_picks": correct,
            "incorrect_picks": incorrect,
            "total_picks": total,
            "percent": f"{percent}%"
        })
        
    return output