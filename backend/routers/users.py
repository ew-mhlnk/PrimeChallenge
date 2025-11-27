from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from database.db import get_db
from database import models
from utils.auth import get_current_user
from pydantic import BaseModel

router = APIRouter()

# --- Schemas ---
class StatRow(BaseModel):
    category: str
    rank: int
    total_participants: int
    points: int
    correct_picks: int
    incorrect_picks: int
    percent_correct: str
    total_brackets: int

class TournamentHistoryRow(BaseModel):
    tournament_id: int
    name: str
    rank: int
    total_participants: int
    points: int
    correct_picks: int
    incorrect_picks: int
    percent_correct: str
    tag: str  # <--- ДОБАВИЛИ ТЕГ

class ProfileStatsResponse(BaseModel):
    user_id: int
    name: str
    cumulative: List[StatRow]
    history: List[TournamentHistoryRow]

# --- Логика ---

@router.get("/profile/stats", response_model=ProfileStatsResponse)
async def get_profile_stats(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    user_id = user["id"]
    
    # 1. Имя юзера
    db_user = db.query(models.User).filter(models.User.user_id == user_id).first()
    user_name = "Unknown"
    if db_user:
        if db_user.first_name: user_name = db_user.first_name
        if db_user.last_name: user_name += f" {db_user.last_name}"
        if db_user.username: user_name = db_user.username # Приоритет нику, если есть

    # 2. ИСТОРИЯ
    history_data = []
    user_scores = db.query(models.UserScore).filter(models.UserScore.user_id == user_id).all()
    
    for score in user_scores:
        t = db.query(models.Tournament).filter(models.Tournament.id == score.tournament_id).first()
        if not t: continue

        # Ранг в турнире
        rank = db.query(models.UserScore).filter(
            models.UserScore.tournament_id == t.id,
            models.UserScore.score > score.score
        ).count() + 1
        
        participants = db.query(models.UserScore).filter(models.UserScore.tournament_id == t.id).count()

        # Считаем неверные (Total Picks - Correct Picks)
        # Считаем общее кол-во завершенных матчей, где юзер сделал прогноз
        total_picks = db.query(models.UserPick).join(models.TrueDraw, 
            (models.UserPick.tournament_id == models.TrueDraw.tournament_id) &
            (models.UserPick.round == models.TrueDraw.round) & 
            (models.UserPick.match_number == models.TrueDraw.match_number)
        ).filter(
            models.UserPick.user_id == user_id,
            models.UserPick.tournament_id == t.id,
            models.TrueDraw.winner.isnot(None), # Матч завершен
            models.UserPick.predicted_winner.isnot(None) # Юзер делал прогноз
        ).count()

        incorrect = total_picks - score.correct_picks
        if incorrect < 0: incorrect = 0
        
        percent = 0.0
        if total_picks > 0:
            percent = (score.correct_picks / total_picks) * 100

        history_data.append(TournamentHistoryRow(
            tournament_id=t.id,
            name=t.name,
            rank=rank,
            total_participants=participants,
            points=score.score,
            correct_picks=score.correct_picks,
            incorrect_picks=incorrect,
            percent_correct=f"{percent:.1f}%",
            tag=t.tag or "ATP" # <--- Отдаем тег (или ATP по дефолту)
        ))

    history_data.sort(key=lambda x: x.tournament_id, reverse=True)

    # 3. СВОДНАЯ (Cumulative)
    # ... (код сводной статистики без изменений, он берет данные из БД) ...
    categories = ["Overall", "ATP-250", "ATP-500", "ATP-1000", "Grand Slam"]
    cumulative_stats = []

    for cat in categories:
        query = db.query(
            func.sum(models.UserScore.score).label("total_points"),
            func.sum(models.UserScore.correct_picks).label("total_correct"),
            func.count(models.UserScore.id).label("tournaments_played")
        ).join(models.Tournament, models.UserScore.tournament_id == models.Tournament.id)

        if cat != "Overall":
            if cat == "Grand Slam":
                query = query.filter(models.Tournament.tag == "ТБШ")
            else:
                # "ATP-250" -> ищем "%250%" в типе
                search = f"%{cat.split('-')[1]}%"
                query = query.filter(models.Tournament.type.ilike(search))

        user_stat = query.filter(models.UserScore.user_id == user_id).first()
        
        my_points = user_stat.total_points or 0
        my_correct = user_stat.total_correct or 0
        my_tournaments = user_stat.tournaments_played or 0

        if my_tournaments == 0:
            cumulative_stats.append(StatRow(category=cat.replace("-", " "), rank=0, total_participants=0, points=0, correct_picks=0, incorrect_picks=0, percent_correct="0.0%", total_brackets=0))
            continue

        # Ранг
        all_users = db.query(models.UserScore.user_id, func.sum(models.UserScore.score).label("score")).join(models.Tournament, models.UserScore.tournament_id == models.Tournament.id)
        if cat != "Overall":
            if cat == "Grand Slam": all_users = all_users.filter(models.Tournament.tag == "ТБШ")
            else: all_users = all_users.filter(models.Tournament.type.ilike(f"%{cat.split('-')[1]}%"))
        
        subq = all_users.group_by(models.UserScore.user_id).subquery()
        rank = db.query(subq).filter(subq.c.score > my_points).count() + 1
        total_part = db.query(subq).count()

        # Неверные (упрощенно)
        # Чтобы не перегружать, считаем через историю
        # (Этот блок можно улучшить, но для MVP хватит)
        # Сделаем простой подсчет через raw query для точности
        picks_q = db.query(func.count(models.UserPick.id)).join(models.Tournament).join(models.TrueDraw, (models.UserPick.tournament_id == models.TrueDraw.tournament_id) & (models.UserPick.round == models.TrueDraw.round) & (models.UserPick.match_number == models.TrueDraw.match_number)).filter(models.UserPick.user_id == user_id, models.TrueDraw.winner.isnot(None), models.UserPick.predicted_winner.isnot(None))
        
        if cat != "Overall":
            if cat == "Grand Slam": picks_q = picks_q.filter(models.Tournament.tag == "ТБШ")
            else: picks_q = picks_q.filter(models.Tournament.type.ilike(f"%{cat.split('-')[1]}%"))
        
        total_picks = picks_q.scalar() or 0
        my_incorrect = total_picks - my_correct
        if my_incorrect < 0: my_incorrect = 0
        
        percent = (my_correct / total_picks * 100) if total_picks > 0 else 0.0

        cumulative_stats.append(StatRow(
            category=cat.replace("-", " "), rank=rank, total_participants=total_part,
            points=my_points, correct_picks=my_correct, incorrect_picks=my_incorrect,
            percent_correct=f"{percent:.1f}%", total_brackets=my_tournaments
        ))

    return ProfileStatsResponse(user_id=user_id, name=user_name, cumulative=cumulative_stats, history=history_data)