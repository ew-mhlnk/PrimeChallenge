from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional, Tuple
import time
from datetime import datetime, date, timedelta

from database.db import get_db
from database import models
from utils.auth import get_current_user
from pydantic import BaseModel

router = APIRouter() 

# --- КЭШ ---
_leaderboard_cache: dict[str, Tuple[float, List[dict]]] = {}
CACHE_TTL = 60 

# --- ID "БОГА" ДЛЯ DAILY ---
GOD_DAILY_USER = 1097762641

# --- Pydantic Schemas ---
class DailyPickRequest(BaseModel):
    match_id: str
    winner: int 

class DailyMatchResponse(BaseModel):
    id: str
    tournament: str
    start_time: str 
    status: str          
    player1: str
    player2: str
    score: Optional[str] = None
    winner: Optional[int] = None
    my_pick: Optional[int] = None 

class DailyLeaderboardEntry(BaseModel):
    rank: int
    user_id: int
    username: str
    total_points: int
    correct_picks: int

# --- Endpoints ---

@router.get("/matches", response_model=List[DailyMatchResponse])
def get_daily_matches(
    target_date: Optional[date] = Query(None), 
    db: Session = Depends(get_db), 
    user: dict = Depends(get_current_user)
):
    user_id = user["id"]
    query = db.query(models.DailyMatch)
    
    if target_date:
        query = query.filter(func.date(models.DailyMatch.start_time) == target_date)
    
    matches = query.order_by(models.DailyMatch.start_time).all()
    
    match_ids = [m.id for m in matches]
    user_picks = db.query(models.DailyPick).filter(
        models.DailyPick.user_id == user_id,
        models.DailyPick.match_id.in_(match_ids)
    ).all()
    
    picks_map = {p.match_id: p.predicted_winner for p in user_picks}
    
    result = []
    for m in matches:
        time_str = "--:--"
        if m.start_time:
            time_str = m.start_time.strftime("%H:%M")

        # === GOD MODE (VISUAL) ===
        # Для избранного юзера подменяем статус на PLANNED,
        # чтобы кнопки на фронтенде были активны (не disabled)
        final_status = m.status
        if user_id == GOD_DAILY_USER:
            final_status = "PLANNED"
        # =========================

        result.append({
            "id": m.id,
            "tournament": m.tournament,
            "start_time": time_str, 
            "status": final_status, 
            "player1": m.player1,
            "player2": m.player2,
            "score": m.score,
            "winner": m.winner,
            "my_pick": picks_map.get(m.id)
        })
        
    return result

@router.post("/pick")
def make_daily_pick(
    pick_data: DailyPickRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    user_id = user["id"]
    match = db.query(models.DailyMatch).filter(models.DailyMatch.id == pick_data.match_id).first()
    
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
        
    # === GOD MODE (LOGIC) ===
    # Если это НЕ бог, то проверяем правила
    if user_id != GOD_DAILY_USER:
        if match.status != "PLANNED":
             raise HTTPException(status_code=400, detail="Match started")

        if match.start_time:
            is_midnight = (match.start_time.hour == 0 and match.start_time.minute == 0)
            if not is_midnight:
                now = datetime.now()
                if now > (match.start_time + timedelta(minutes=5)):
                     raise HTTPException(status_code=400, detail="Time expired")
    # ========================

    existing_pick = db.query(models.DailyPick).filter(
        models.DailyPick.user_id == user_id,
        models.DailyPick.match_id == pick_data.match_id
    ).first()
    
    if existing_pick:
        existing_pick.predicted_winner = pick_data.winner
        # Если матч завершен, сразу пересчитываем "правильность" для этого пика
        # (чтобы админ сразу видел результат, если меняет задним числом)
        if match.winner is not None:
            existing_pick.is_correct = (pick_data.winner == match.winner)
            existing_pick.points = 1 if existing_pick.is_correct else 0
    else:
        new_pick = models.DailyPick(
            user_id=user_id,
            match_id=pick_data.match_id,
            predicted_winner=pick_data.winner
        )
        # То же самое для нового пика
        if match.winner is not None:
            new_pick.is_correct = (pick_data.winner == match.winner)
            new_pick.points = 1 if new_pick.is_correct else 0
            
        db.add(new_pick)
        
    db.commit()
    return {"status": "ok", "message": "Pick saved"}

# === УНИВЕРСАЛЬНЫЙ ЛИДЕРБОРД ===
@router.get("/leaderboard", response_model=List[DailyLeaderboardEntry])
def get_daily_leaderboard(
    tournament_filter: Optional[str] = Query(None), 
    db: Session = Depends(get_db)
):
    global _leaderboard_cache
    
    cache_key = tournament_filter if tournament_filter else "ALL"
    current_time = time.time()
    
    if cache_key in _leaderboard_cache:
        timestamp, data = _leaderboard_cache[cache_key]
        if current_time - timestamp < CACHE_TTL:
            return data

    query = db.query(
        models.DailyPick.user_id,
        models.User.username,
        models.User.first_name,
        models.User.last_name,
        func.sum(models.DailyPick.points).label("points"),
        func.count(models.DailyPick.id).label("correct_picks") 
    ).join(models.DailyMatch, models.DailyPick.match_id == models.DailyMatch.id)\
     .join(models.User, models.DailyPick.user_id == models.User.user_id)\
     .filter(models.DailyPick.is_correct == True) 
    
    if tournament_filter:
        search_term = f"%{tournament_filter}%"
        query = query.filter(models.DailyMatch.tournament.ilike(search_term))
    
    results = query.group_by(models.DailyPick.user_id, models.User.user_id)\
                   .order_by(desc("points"))\
                   .all()
    
    leaderboard = []
    current_rank = 1
    
    for idx, row in enumerate(results):
        if idx > 0:
            prev = results[idx-1]
            if row.points != prev.points:
                current_rank += 1
        
        name = row.username if row.username else f"{row.first_name} {row.last_name or ''}".strip()
        leaderboard.append({
            "rank": current_rank,
            "user_id": row.user_id,
            "username": name,
            "total_points": row.points,
            "correct_picks": row.correct_picks
        })
        
    _leaderboard_cache[cache_key] = (current_time, leaderboard)
    return leaderboard