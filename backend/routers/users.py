from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, case
from typing import List, Optional
from database.db import get_db
from database import models
from utils.auth import get_current_user
from pydantic import BaseModel

router = APIRouter()

# --- Schemas для ответа ---
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

class ProfileStatsResponse(BaseModel):
    user_id: int
    name: str
    cumulative: List[StatRow]
    history: List[TournamentHistoryRow]

# --- Логика ---

@router.get("/profile/stats", response_model=ProfileStatsResponse)
async def get_profile_stats(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    user_id = user["id"]
    
    # Получаем имя пользователя
    db_user = db.query(models.User).filter(models.User.user_id == user_id).first()
    user_name = db_user.first_name if db_user else "User"
    if db_user and db_user.last_name:
        user_name += f" {db_user.last_name}"
    elif db_user and db_user.username:
        user_name = db_user.username

    # === 1. ИСТОРИЯ ТУРНИРОВ (Нижняя таблица) ===
    # Нам нужно: Название, Ранг юзера, Всего участников, Очки, Верные, Неверные
    
    history_data = []
    
    # Берем все турниры, где участвовал юзер
    user_scores = db.query(models.UserScore).filter(models.UserScore.user_id == user_id).all()
    
    for score in user_scores:
        tournament = db.query(models.Tournament).filter(models.Tournament.id == score.tournament_id).first()
        if not tournament: continue

        # 1.1. Считаем ранг юзера в этом турнире
        # (Считаем, сколько людей набрали больше очков)
        rank = db.query(models.UserScore).filter(
            models.UserScore.tournament_id == tournament.id,
            models.UserScore.score > score.score
        ).count() + 1
        
        # 1.2. Всего участников
        total_participants = db.query(models.UserScore).filter(
            models.UserScore.tournament_id == tournament.id
        ).count()

        # 1.3. Неверные пики
        # Хак: Мы знаем Score и Correct Picks. 
        # Но мы не храним "Total Completed Picks".
        # Приближенно посчитаем: возьмем все матчи турнира, у которых есть winner.
        # Если юзер сделал прогноз на этот матч, это считается.
        completed_matches_count = db.query(models.TrueDraw).filter(
            models.TrueDraw.tournament_id == tournament.id,
            models.TrueDraw.winner.isnot(None)
        ).count()
        
        # Сколько матчей юзер реально прогнозировал из завершенных?
        # (Можно усложнить, но для скорости возьмем completed_matches_count как базу,
        #  если предполагаем, что юзер заполнил всю сетку)
        # Более точно:
        user_picks_count = db.query(models.UserPick).join(models.TrueDraw, 
            (models.UserPick.tournament_id == models.TrueDraw.tournament_id) &
            (models.UserPick.round == models.TrueDraw.round) & 
            (models.UserPick.match_number == models.TrueDraw.match_number)
        ).filter(
            models.UserPick.user_id == user_id,
            models.UserPick.tournament_id == tournament.id,
            models.TrueDraw.winner.isnot(None),
            models.UserPick.predicted_winner.isnot(None)
        ).count()

        incorrect = user_picks_count - score.correct_picks
        if incorrect < 0: incorrect = 0 # На всякий случай
        
        percent = 0.0
        if user_picks_count > 0:
            percent = (score.correct_picks / user_picks_count) * 100

        history_data.append(TournamentHistoryRow(
            tournament_id=tournament.id,
            name=tournament.name,
            rank=rank,
            total_participants=total_participants,
            points=score.score,
            correct_picks=score.correct_picks,
            incorrect_picks=incorrect,
            percent_correct=f"{percent:.1f}%"
        ))

    # Сортируем историю (сначала новые)
    history_data.sort(key=lambda x: x.tournament_id, reverse=True)

    # === 2. СВОДНАЯ СТАТИСТИКА (Верхняя таблица) ===
    # Категории: Overall, ATP 250, ATP 500, ATP 1000, Grand Slam
    
    categories = ["Overall", "ATP-250", "ATP-500", "ATP-1000", "Grand Slam"]
    cumulative_stats = []

    for cat in categories:
        # Фильтр по типу турнира
        query = db.query(
            func.sum(models.UserScore.score).label("total_points"),
            func.sum(models.UserScore.correct_picks).label("total_correct"),
            func.count(models.UserScore.id).label("tournaments_played")
        ).join(models.Tournament, models.UserScore.tournament_id == models.Tournament.id)

        if cat != "Overall":
            # Ищем частичное совпадение, т.к. в базе может быть "ATP-250" или "ATP 250"
            # Используем ILIKE для PostgreSQL
            if cat == "Grand Slam":
                query = query.filter(models.Tournament.tag == "ТБШ") # Или type, зависит от твоей БД
            else:
                # Превращаем "ATP-250" в поиск "%250%"
                search_term = f"%{cat.split('-')[1]}%" 
                query = query.filter(models.Tournament.type.ilike(search_term))

        # 2.1. Данные ТЕКУЩЕГО юзера
        user_stat = query.filter(models.UserScore.user_id == user_id).first()
        
        if not user_stat or not user_stat.total_points:
            # Если юзер не играл в этой категории
            cumulative_stats.append(StatRow(
                category=cat.replace("-", " "), # Красивое имя
                rank=0, total_participants=0, points=0, correct_picks=0, incorrect_picks=0,
                percent_correct="0.0%", total_brackets=0
            ))
            continue

        my_points = user_stat.total_points or 0
        my_correct = user_stat.total_correct or 0
        my_tournaments = user_stat.tournaments_played or 0

        # 2.2. Глобальный ранг в этой категории
        # Группируем всех юзеров, считаем сумму, ищем место нашего
        
        # Базовый запрос для всех юзеров в этой категории
        all_users_query = db.query(
            models.UserScore.user_id,
            func.sum(models.UserScore.score).label("score")
        ).join(models.Tournament, models.UserScore.tournament_id == models.Tournament.id)

        if cat != "Overall":
            if cat == "Grand Slam":
                all_users_query = all_users_query.filter(models.Tournament.tag == "ТБШ")
            else:
                search_term = f"%{cat.split('-')[1]}%"
                all_users_query = all_users_query.filter(models.Tournament.type.ilike(search_term))
        
        all_users_sums = all_users_query.group_by(models.UserScore.user_id).subquery()

        # Ранг = кол-во людей с очками > моих очков + 1
        rank = db.query(all_users_sums).filter(all_users_sums.c.score > my_points).count() + 1
        total_participants = db.query(all_users_sums).count()

        # 2.3. Неверные пики (Global)
        # Это сложный запрос, для MVP упростим: 
        # Посчитаем через сумму матчей в истории (мы её уже собрали выше)
        
        # Собираем "Неверные" из history_data, фильтруя по категории
        my_incorrect = 0
        my_picks_total = 0 # Для процента
        
        # Пробегаемся по уже собранной истории, чтобы не мучить БД
        for h in history_data:
            # Определяем категорию турнира h
            # (Это не идеально точно, но быстро. Лучше бы вытащить тип в history_data)
            # Для простоты сейчас сделаем отдельный запрос или доверимся логике
            pass 
        
        # ЛАДНО, сделаем честный запрос для Incorrect Picks в категории
        # Это сумма всех user_picks count минус сумма correct
        
        picks_q = db.query(func.count(models.UserPick.id)).join(models.Tournament, models.UserPick.tournament_id == models.Tournament.id).join(models.TrueDraw, 
            (models.UserPick.tournament_id == models.TrueDraw.tournament_id) &
            (models.UserPick.round == models.TrueDraw.round) & 
            (models.UserPick.match_number == models.TrueDraw.match_number)
        ).filter(
            models.UserPick.user_id == user_id,
            models.TrueDraw.winner.isnot(None),
            models.UserPick.predicted_winner.isnot(None)
        )
        
        if cat != "Overall":
            if cat == "Grand Slam":
                picks_q = picks_q.filter(models.Tournament.tag == "ТБШ")
            else:
                search_term = f"%{cat.split('-')[1]}%"
                picks_q = picks_q.filter(models.Tournament.type.ilike(search_term))
        
        total_picks_made = picks_q.scalar() or 0
        my_incorrect = total_picks_made - my_correct
        if my_incorrect < 0: my_incorrect = 0

        percent = 0.0
        if total_picks_made > 0:
            percent = (my_correct / total_picks_made) * 100

        cumulative_stats.append(StatRow(
            category=cat.replace("-", " "),
            rank=rank,
            total_participants=total_participants,
            points=my_points,
            correct_picks=my_correct,
            incorrect_picks=my_incorrect,
            percent_correct=f"{percent:.1f}%",
            total_brackets=my_tournaments
        ))

    return ProfileStatsResponse(
        user_id=user_id,
        name=user_name,
        cumulative=cumulative_stats,
        history=history_data
    )