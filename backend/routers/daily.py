from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from database.db import get_db
from database import models
from utils.auth import get_current_user
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

# --- Pydantic Schemas (Схемы данных) ---

class DailyPickRequest(BaseModel):
    match_id: str
    winner: int # 1 или 2

class DailyMatchResponse(BaseModel):
    id: str
    tournament: str
    start_time: str      # Строка "HH:MM" или дата
    status: str          # PLANNED, LIVE, COMPLETED
    player1: str
    player2: str
    score: Optional[str] = None
    winner: Optional[int] = None
    my_pick: Optional[int] = None # Выбор юзера (1 или 2), если есть

# --- Endpoints ---

@router.get("/matches", response_model=List[DailyMatchResponse])
async def get_daily_matches(
    db: Session = Depends(get_db), 
    user: dict = Depends(get_current_user)
):
    """
    Возвращает список матчей из таблицы daily_matches + прогнозы текущего юзера.
    Сортирует по времени начала.
    """
    user_id = user["id"]
    
    # 1. Получаем все матчи из БД, сортируем по времени
    matches = db.query(models.DailyMatch).order_by(models.DailyMatch.start_time).all()
    
    # 2. Получаем прогнозы юзера на эти матчи
    match_ids = [m.id for m in matches]
    user_picks = db.query(models.DailyPick).filter(
        models.DailyPick.user_id == user_id,
        models.DailyPick.match_id.in_(match_ids)
    ).all()
    
    # Создаем словарь для быстрого поиска: match_id -> pick
    picks_map = {p.match_id: p.predicted_winner for p in user_picks}
    
    result = []
    for m in matches:
        # Форматируем время в HH:MM (если дата есть)
        time_str = m.start_time.strftime("%d.%m %H:%M") if m.start_time else "--:--"
        
        result.append({
            "id": m.id,
            "tournament": m.tournament,
            "start_time": time_str,
            "status": m.status,
            "player1": m.player1,
            "player2": m.player2,
            "score": m.score,
            "winner": m.winner,
            "my_pick": picks_map.get(m.id) # Подставляем выбор юзера или None
        })
        
    return result

@router.post("/pick")
async def make_daily_pick(
    pick_data: DailyPickRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """
    Сохраняет прогноз. 
    ВАЖНО: Разрешено только если статус матча == PLANNED.
    """
    user_id = user["id"]
    
    # 1. Ищем матч
    match = db.query(models.DailyMatch).filter(models.DailyMatch.id == pick_data.match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
        
    # 2. Проверка на читерство
    if match.status != "PLANNED":
         raise HTTPException(status_code=400, detail="Прием ставок закрыт (матч идет или завершен)")

    # 3. Сохраняем (Upsert - обновление или вставка)
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