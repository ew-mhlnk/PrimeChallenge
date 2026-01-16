from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
from database.db import get_db
from database import models
from utils.auth import get_current_user

router = APIRouter()

# --- 1. ГЛОБАЛЬНЫЙ ЛИДЕРБОРД ---
@router.get("/", response_model=List[dict])
def get_global_leaderboard(db: Session = Depends(get_db)):
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
            "incorrect_picks": 0,
            "total_picks": 0,
            "percent": "0%"
        })
        
    return leaderboard

# --- 2. СПИСОК ТУРНИРОВ С РАНГОМ ЮЗЕРА ---
@router.get("/list", response_model=List[dict])
def get_tournaments_with_ranks(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """
    Отдает список турниров (ACTIVE, COMPLETED, CLOSED).
    Сортировка: Самые новые (большой ID) - СВЕРХУ.
    """
    user_id = user["id"]
    
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
def get_tournament_leaderboard(tournament_id: int, db: Session = Depends(get_db)):
    """
    Детальный рейтинг конкретного турнира.
    """
    # А. Основной рейтинг
    lb_results = db.query(models.Leaderboard, models.User)\
        .join(models.User, models.Leaderboard.user_id == models.User.user_id)\
        .filter(models.Leaderboard.tournament_id == tournament_id)\
        .order_by(models.Leaderboard.rank)\
        .all()
    
    # Б. Подсчет статистики "на лету"
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

    stats_map = {row.user_id: row.total_finished for row in finished_matches_query}
    
    output = []
    for lb_entry, user_entry in lb_results:
        name = user_entry.username if user_entry.username else f"{user_entry.first_name} {user_entry.last_name or ''}".strip()
        
        correct = lb_entry.correct_picks
        total = stats_map.get(lb_entry.user_id, 0)
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

# --- 4. НОВЫЙ ЭНДПОИНТ: КОМБИНИРОВАННЫЙ ЛИДЕРБОРД (ТБШ) ---
@router.get("/combined", response_model=List[dict])
def get_combined_leaderboard(
    ids: str, # Строка вида "10,11" (ID мужского и женского турнира)
    db: Session = Depends(get_db)
):
    """
    Суммирует очки пользователей по нескольким турнирам (для ТБШ М+Ж).
    Пример вызова: /combined?ids=10,11
    """
    try:
        tournament_ids = [int(i) for i in ids.split(",")]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid IDs format")
    
    # 1. Получаем все очки (UserScore) для этих турниров
    scores = db.query(models.UserScore).filter(
        models.UserScore.tournament_id.in_(tournament_ids)
    ).all()
    
    # 2. Агрегация в Python (быстрее для 2-х турниров, чем сложный SQL GroupBy)
    # Словарь: user_id -> {score, correct_picks}
    agg_stats = {}
    
    for s in scores:
        if s.user_id not in agg_stats:
            agg_stats[s.user_id] = {"score": 0, "correct": 0}
        
        agg_stats[s.user_id]["score"] += s.score
        agg_stats[s.user_id]["correct"] += s.correct_picks
        
    if not agg_stats:
        return []

    # 3. Получаем инфо о юзерах (одним запросом для всех найденных ID)
    user_ids = list(agg_stats.keys())
    users = db.query(models.User).filter(models.User.user_id.in_(user_ids)).all()
    user_map = {u.user_id: u for u in users}
    
    # 4. Формируем плоский список
    result_list = []
    for uid, stats in agg_stats.items():
        user = user_map.get(uid)
        if not user: 
            continue # Если вдруг юзер удален, пропускаем
        
        name = user.username if user.username else f"{user.first_name} {user.last_name or ''}".strip()
        
        result_list.append({
            "user_id": uid,
            "username": name,
            "score": stats["score"],
            "correct_picks": stats["correct"]
        })
        
    # 5. Сортировка (Очки -> Верные исходы) по убыванию
    result_list.sort(key=lambda x: (x["score"], x["correct_picks"]), reverse=True)
    
    # 6. Ранжирование (Логика: если очки равны, ранг тот же)
    final_output = []
    current_rank = 1
    
    for i, entry in enumerate(result_list):
        if i > 0:
            prev = result_list[i-1]
            # Если текущий юзер хуже предыдущего, ранг увеличивается
            if entry["score"] < prev["score"] or (entry["score"] == prev["score"] and entry["correct_picks"] < prev["correct_picks"]):
                current_rank = i + 1
        
        entry["rank"] = current_rank
        final_output.append(entry)
        
    return final_output