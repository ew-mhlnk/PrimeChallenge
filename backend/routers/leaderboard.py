from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Dict, Any, Tuple
import time

from database.db import get_db
from database import models
from utils.auth import get_current_user

router = APIRouter()

# --- СИСТЕМА КЭШИРОВАНИЯ ---
# Структура: { "ключ_запроса": (timestamp, data) }
_lb_cache: Dict[str, Tuple[float, List[dict]]] = {}
CACHE_TTL = 60  # Время жизни кэша: 60 секунд

# --- 1. ГЛОБАЛЬНЫЙ ЛИДЕРБОРД ---
@router.get("/", response_model=List[dict])
def get_global_leaderboard(db: Session = Depends(get_db)):
    # Глобальный рейтинг тоже можно закэшировать
    cache_key = "global"
    current_time = time.time()
    
    if cache_key in _lb_cache:
        timestamp, data = _lb_cache[cache_key]
        if current_time - timestamp < CACHE_TTL:
            return data

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
    current_rank = 1
    
    for idx, row in enumerate(results):
        if idx > 0:
            prev = results[idx-1]
            if row.total_score != prev.total_score or row.total_correct != prev.total_correct:
                current_rank += 1
        
        name = row.username if row.username else f"{row.first_name} {row.last_name or ''}".strip()
        leaderboard.append({
            "rank": current_rank,
            "user_id": row.user_id,
            "username": name,
            "score": row.total_score,
            "correct_picks": row.total_correct,
            "incorrect_picks": 0,
            "total_picks": 0,
            "percent": "0%"
        })
    
    # Сохраняем в кэш
    _lb_cache[cache_key] = (current_time, leaderboard)
    return leaderboard

# --- 2. СПИСОК ТУРНИРОВ ---
# Этот список меняется редко, но зависит от юзера (rank), поэтому кэшировать сложно.
# Оставим как есть, он легкий.
@router.get("/list", response_model=List[dict])
def get_tournaments_with_ranks(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    user_id = user["id"]
    tournaments = db.query(models.Tournament).filter(
        models.Tournament.status.in_(["ACTIVE", "COMPLETED", "CLOSED"])
    ).order_by(models.Tournament.id.desc()).all()
    
    result = []
    for t in tournaments:
        total_participants = db.query(models.Leaderboard).filter(
            models.Leaderboard.tournament_id == t.id
        ).count()
        
        my_entry = db.query(models.Leaderboard).filter(
            models.Leaderboard.tournament_id == t.id,
            models.Leaderboard.user_id == user_id
        ).first()
        
        result.append({
            "id": t.id,
            "name": t.name,
            "dates": t.dates,
            "status": t.status,
            "type": t.type,
            "tag": t.tag,
            "my_rank": my_entry.rank if my_entry else None,
            "total_participants": total_participants
        })
        
    return result

# --- 3. ЛИДЕРБОРД КОНКРЕТНОГО ТУРНИРА (КЭШИРУЕМ) ---
@router.get("/tournament/{tournament_id}", response_model=List[dict])
def get_tournament_leaderboard(tournament_id: int, db: Session = Depends(get_db)):
    cache_key = f"tourn_{tournament_id}"
    current_time = time.time()
    
    # Проверка кэша
    if cache_key in _lb_cache:
        timestamp, data = _lb_cache[cache_key]
        if current_time - timestamp < CACHE_TTL:
            return data

    # Логика расчета (если кэша нет)
    lb_results = db.query(models.Leaderboard, models.User)\
        .join(models.User, models.Leaderboard.user_id == models.User.user_id)\
        .filter(models.Leaderboard.tournament_id == tournament_id)\
        .order_by(models.Leaderboard.score.desc(), models.Leaderboard.correct_picks.desc())\
        .all()
    
    finished_matches_query = db.query(
        models.UserPick.user_id,
        func.count(models.UserPick.id).label("total_finished")
    ).join(models.TrueDraw, 
        (models.UserPick.tournament_id == models.TrueDraw.tournament_id) &
        (models.UserPick.round == models.TrueDraw.round) &
        (models.UserPick.match_number == models.TrueDraw.match_number)
    ).filter(
        models.UserPick.tournament_id == tournament_id,
        models.TrueDraw.winner.isnot(None),
        models.UserPick.predicted_winner.isnot(None)
    ).group_by(models.UserPick.user_id).all()

    stats_map = {row.user_id: row.total_finished for row in finished_matches_query}
    
    output = []
    current_rank = 1
    
    for i, (lb_entry, user_entry) in enumerate(lb_results):
        if i > 0:
            prev_lb, _ = lb_results[i-1]
            if lb_entry.score != prev_lb.score or lb_entry.correct_picks != prev_lb.correct_picks:
                current_rank += 1
        
        name = user_entry.username if user_entry.username else f"{user_entry.first_name} {user_entry.last_name or ''}".strip()
        correct = lb_entry.correct_picks
        total = stats_map.get(lb_entry.user_id, 0)
        incorrect = max(0, total - correct)
        percent = round((correct / total) * 100) if total > 0 else 0
        
        output.append({
            "rank": current_rank,
            "user_id": lb_entry.user_id,
            "username": name,
            "score": lb_entry.score,
            "correct_picks": correct,
            "incorrect_picks": incorrect,
            "total_picks": total,
            "percent": f"{percent}%"
        })
        
    # Сохраняем в кэш
    _lb_cache[cache_key] = (current_time, output)
    return output

# --- 4. КОМБИНИРОВАННЫЙ ЛИДЕРБОРД (КЭШИРУЕМ) ---
@router.get("/combined", response_model=List[dict])
def get_combined_leaderboard(ids: str, db: Session = Depends(get_db)):
    # Кэшируем по строке ID (например "10,11")
    cache_key = f"comb_{ids}"
    current_time = time.time()
    
    if cache_key in _lb_cache:
        timestamp, data = _lb_cache[cache_key]
        if current_time - timestamp < CACHE_TTL:
            return data

    try:
        tournament_ids = [int(i) for i in ids.split(",")]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid IDs format")
    
    scores = db.query(models.UserScore).filter(
        models.UserScore.tournament_id.in_(tournament_ids)
    ).all()
    
    agg_stats = {}
    for s in scores:
        if s.user_id not in agg_stats: agg_stats[s.user_id] = {"score": 0, "correct": 0}
        agg_stats[s.user_id]["score"] += s.score
        agg_stats[s.user_id]["correct"] += s.correct_picks
        
    if not agg_stats: 
        # Если пусто, не кэшируем, или возвращаем пустой список
        return []

    user_ids = list(agg_stats.keys())
    users = db.query(models.User).filter(models.User.user_id.in_(user_ids)).all()
    user_map = {u.user_id: u for u in users}
    
    result_list = []
    for uid, stats in agg_stats.items():
        user = user_map.get(uid)
        if not user: continue
        name = user.username if user.username else f"{user.first_name} {user.last_name or ''}".strip()
        result_list.append({
            "user_id": uid,
            "username": name,
            "score": stats["score"],
            "correct_picks": stats["correct"]
        })
        
    result_list.sort(key=lambda x: (x["score"], x["correct_picks"]), reverse=True)
    
    final_output = []
    current_rank = 1
    
    for i, entry in enumerate(result_list):
        if i > 0:
            prev = result_list[i-1]
            if entry["score"] != prev["score"] or entry["correct_picks"] != prev["correct_picks"]:
                current_rank += 1
        
        entry["rank"] = current_rank
        final_output.append(entry)
    
    # Сохраняем в кэш
    _lb_cache[cache_key] = (current_time, final_output)
    return final_output