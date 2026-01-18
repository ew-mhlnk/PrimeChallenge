from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
from datetime import datetime, date, timedelta
import pytz

from database.db import get_db
from database import models
from utils.auth import get_current_user
from pydantic import BaseModel

router = APIRouter() 

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

        result.append({
            "id": m.id,
            "tournament": m.tournament,
            "start_time": time_str, 
            "status": m.status,
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
        
    if match.status != "PLANNED":
         raise HTTPException(status_code=400, detail="Match started")

    if match.start_time:
        is_midnight = (match.start_time.hour == 0 and match.start_time.minute == 0)
        if not is_midnight:
            now = datetime.now()
            if now > (match.start_time + timedelta(minutes=5)):
                 raise HTTPException(status_code=400, detail="Time expired")

    existing_pick = db.query(models.DailyPick).filter(
        models.DailyPick.user_id == user_id,
        models.DailyPick.match_id == pick_data.match_id
    ).first()
    
    if existing_pick:
        existing_pick.predicted_winner = pick_data.winner
    else:
        new_pick = models.DailyPick(
            user_id=user_id,
            match_id=pick_data.match_id,
            predicted_winner=pick_data.winner
        )
        db.add(new_pick)
        
    db.commit()
    return {"status": "ok", "message": "Pick saved"}

@router.get("/leaderboard", response_model=List[DailyLeaderboardEntry])
def get_daily_leaderboard(db: Session = Depends(get_db)):
    # УБРАЛИ LIMIT(100)
    results = db.query(models.DailyLeaderboard).join(models.User)\
        .order_by(desc(models.DailyLeaderboard.total_points), desc(models.DailyLeaderboard.correct_picks))\
        .all()
    
    leaderboard = []
    current_rank = 1

    for idx, entry in enumerate(results):
        # Плотное ранжирование
        if idx > 0:
            prev = results[idx-1]
            if entry.total_points != prev.total_points or entry.correct_picks != prev.correct_picks:
                current_rank += 1

        name = entry.user.username if entry.user.username else f"{entry.user.first_name} {entry.user.last_name or ''}".strip()
        leaderboard.append({
            "rank": current_rank,
            "user_id": entry.user_id,
            "username": name,
            "total_points": entry.total_points,
            "correct_picks": entry.correct_picks
        })
    return leaderboard