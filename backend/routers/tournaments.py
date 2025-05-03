from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database.db import get_db  # Импорт функции для получения сессии базы данных
from database import models  # Импорт моделей базы данных (Tournament, TrueDraw, UserPick, Leaderboard)
import logging
from schemas import Tournament, TrueDraw  # Импорт схем Pydantic для валидации данных
from utils.auth import get_current_user  # Импорт функции для получения текущего пользователя

# Создание маршрутизатора FastAPI для обработки запросов, связанных с турнирами
router = APIRouter()
logger = logging.getLogger(__name__)  # Инициализация логгера для записи событий и ошибок

@router.get("/", response_model=List[Tournament])
async def get_tournaments(tag: str = None, status: str = None, id: int = None, db: Session = Depends(get_db)):
    """
    Эндпоинт для получения списка турниров с фильтрацией.
    Возвращает все турниры или отфильтрованные по tag, status или id.
    Используется фронтендом для отображения списка турниров (например, в TournamentList.tsx).
    """
    logger.info("Fetching all tournaments")  # Логирование запроса
    query = db.query(models.Tournament)  # Базовый запрос к таблице турниров
    
    if tag:
        query = query.filter(models.Tournament.tag == tag)  # Фильтрация по тегу
    if status:
        query = query.filter(models.Tournament.status == status)  # Фильтрация по статусу
    if id is not None:
        query = query.filter(models.Tournament.id == id)  # Фильтрация по ID
    
    tournaments = query.all()  # Выполнение запроса и получение результатов
    logger.info(f"Returning {len(tournaments)} tournaments")  # Логирование количества возвращаемых турниров
    return tournaments  # Возврат списка турниров в формате схемы Tournament

@router.get("/tournament/{id}", response_model=Tournament)
async def get_tournament_by_id(id: int, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    """
    Эндпоинт для получения данных конкретного турнира по ID.
    Возвращает информацию о турнире, матчах R32 и пиках пользователя.
    Используется фронтендом для отображения сетки (например, в BracketPage.tsx через useTournamentLogic.ts).
    """
    logger.info(f"Fetching tournament with id={id}")  # Логирование запроса
    tournament = db.query(models.Tournament).filter(models.Tournament.id == id).first()  # Поиск турнира по ID
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")  # Ошибка, если турнир не найден
    
    user_id = user["id"]  # Получение ID текущего пользователя
    logger.info(f"Using user_id={user_id} for picks")  # Логирование
    
    # Загрузка матчей только для раунда R32
    true_draws = (
        db.query(models.TrueDraw)
        .filter(models.TrueDraw.tournament_id == id, models.TrueDraw.round == 'R32')
        .all()
    )
    logger.info(f"Loaded {len(true_draws)} true_draws for R32")  # Логирование количества матчей
    
    # Загрузка пиков пользователя для этого турнира
    user_picks = (
        db.query(models.UserPick)
        .filter(models.UserPick.tournament_id == id, models.UserPick.user_id == user_id)
        .all()
    )
    logger.info(f"Loaded {len(user_picks)} user_picks")  # Логирование количества пиков
    
    # Формирование словаря ответа
    tournament_dict = {
        "id": tournament.id,
        "name": tournament.name,
        "dates": tournament.dates,
        "status": tournament.status,
        "tag": tournament.tag,
        "starting_round": tournament.starting_round,
        "true_draws": true_draws,  # Матчи R32
        "user_picks": user_picks,  # Пики пользователя
    }
    
    logger.info(f"Returning tournament with id={id}, true_draws count={len(true_draws)}, user_picks count={len(user_picks)}")  # Логирование
    return tournament_dict  # Возврат данных в формате схемы Tournament

@router.get("/matches/by-id", response_model=List[TrueDraw])
async def get_matches_by_tournament_id(tournament_id: int, db: Session = Depends(get_db)):
    """
    Эндпоинт для получения всех матчей турнира по его ID.
    Возвращает список матчей из таблицы true_draw.
    Может использоваться для отладки или дополнительных запросов фронтенда.
    """
    logger.info(f"Fetching matches for tournament_id={tournament_id}")  # Логирование запроса
    matches = (
        db.query(models.TrueDraw)
        .filter(models.TrueDraw.tournament_id == tournament_id)
        .all()
    )  # Получение всех матчей турнира
    logger.info(f"Returning {len(matches)} matches")  # Логирование количества матчей
    return matches  # Возврат списка матчей в формате схемы TrueDraw

@router.get("/picks/", response_model=List[dict])
async def get_picks(tournament_id: int, user_id: int, db: Session = Depends(get_db)):
    """
    Эндпоинт для получения пиков пользователя по ID турнира и пользователя.
    Возвращает список пиков в произвольном формате словаря.
    Используется для получения пиков без привязки к авторизации.
    """
    logger.info(f"Fetching picks for tournament_id={tournament_id}, user_id={user_id}")  # Логирование запроса
    picks = (
        db.query(models.UserPick)
        .filter(models.UserPick.tournament_id == tournament_id, models.UserPick.user_id == user_id)
        .all()
    )  # Получение пиков
    logger.info(f"Returning {len(picks)} picks")  # Логирование количества пиков
    return picks  # Возврат списка пиков

@router.post("/picks/", response_model=dict)
async def save_pick(pick: dict, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    """
    Эндпоинт для сохранения одного пика пользователя.
    Принимает данные пика в формате словаря и сохраняет или обновляет его.
    Используется фронтендом для сохранения выбора игрока.
    """
    logger.info("Saving pick")  # Логирование запроса
    try:
        pick["user_id"] = user["id"]  # Присваивание ID текущего пользователя
        
        # Проверка существования матча
        match = db.query(models.TrueDraw).filter(
            models.TrueDraw.tournament_id == pick['tournament_id'],
            models.TrueDraw.round == pick['round'],
            models.TrueDraw.match_number == pick['match_number']
        ).first()
        if not match:
            raise HTTPException(status_code=404, detail="Match not found")  # Ошибка, если матч не найден
        
        # Проверка, что предсказанный победитель — один из игроков
        if pick['predicted_winner'] not in [match.player1, match.player2]:
            raise HTTPException(status_code=400, detail="Predicted winner must be one of the players")  # Ошибка, если игрок не участвует
        
        # Сохранение или обновление пика
        existing_pick = db.query(models.UserPick).filter(
            models.UserPick.user_id == pick['user_id'],
            models.UserPick.tournament_id == pick['tournament_id'],
            models.UserPick.round == pick['round'],
            models.UserPick.match_number == pick['match_number']
        ).first()
        if existing_pick:
            existing_pick.predicted_winner = pick['predicted_winner']  # Обновление существующего пика
        else:
            db_pick = models.UserPick(
                user_id=pick['user_id'],
                tournament_id=pick['tournament_id'],
                round=pick['round'],
                match_number=pick['match_number'],
                player1=match.player1,
                player2=match.player2,
                predicted_winner=pick['predicted_winner']
            )
            db.add(db_pick)  # Добавление нового пика
        db.commit()  # Подтверждение изменений
        logger.info("Pick saved successfully")  # Логирование успеха
        return pick  # Возврат принятого пика
    except Exception as e:
        logger.error(f"Error saving pick: {str(e)}")  # Логирование ошибки
        raise HTTPException(status_code=500, detail="Failed to save pick")  # Ошибка сервера

@router.post("/picks/bulk")
async def save_picks_bulk(picks: List[dict], db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    """
    Эндпоинт для массового сохранения пиков пользователя.
    Принимает список словарей с данными пиков и сохраняет или обновляет их.
    Используется фронтендом для сохранения всей сетки сразу.
    """
    logger.info("Saving picks in bulk")  # Логирование запроса
    try:
        for pick in picks:
            pick["user_id"] = user["id"]  # Присваивание ID текущего пользователя
            
            existing_pick = db.query(models.UserPick).filter(
                models.UserPick.user_id == pick['user_id'],
                models.UserPick.tournament_id == pick['tournament_id'],
                models.UserPick.round == pick['round'],
                models.UserPick.match_number == pick['match_number']
            ).first()
            if existing_pick:
                existing_pick.predicted_winner = pick['predicted_winner']  # Обновление существующего пика
            else:
                match = db.query(models.TrueDraw).filter(
                    models.TrueDraw.tournament_id == pick['tournament_id'],
                    models.TrueDraw.round == pick['round'],
                    models.TrueDraw.match_number == pick['match_number']
                ).first()
                if not match:
                    raise HTTPException(status_code=404, detail=f"Match not found for round={pick['round']}, match_number={pick['match_number']}")  # Ошибка, если матч не найден
                db_pick = models.UserPick(
                    user_id=pick['user_id'],
                    tournament_id=pick['tournament_id'],
                    round=pick['round'],
                    match_number=pick['match_number'],
                    player1=match.player1,
                    player2=match.player2,
                    predicted_winner=pick['predicted_winner']
                )
                db.add(db_pick)  # Добавление нового пика
        db.commit()  # Подтверждение изменений
        logger.info("Picks saved successfully")  # Логирование успеха
        return {"status": "success"}  # Возврат успешного статуса
    except Exception as e:
        logger.error(f"Error saving picks: {str(e)}")  # Логирование ошибки
        raise HTTPException(status_code=500, detail="Failed to save picks")  # Ошибка сервера

@router.get("/leaderboard/", response_model=List[dict])
async def get_leaderboard(db: Session = Depends(get_db)):
    """
    Эндпоинт для получения таблицы лидеров.
    Возвращает список пользователей с их очками, отсортированных по убыванию.
    Используется фронтендом для отображения рейтинга.
    """
    logger.info("Fetching leaderboard")  # Логирование запроса
    try:
        leaderboard = db.query(models.Leaderboard).order_by(models.Leaderboard.score.desc()).all()  # Получение лидеров
        if not leaderboard:
            return []  # Возврат пустого списка, если данных нет
        result = [
            {"user_id": entry.user_id, "username": entry.username, "score": entry.score}  # Формирование словаря для каждого лидера
            for entry in leaderboard
        ]
        logger.info(f"Returning {len(result)} leaderboard entries")  # Логирование количества записей
        return result  # Возврат списка лидеров
    except AttributeError:
        raise HTTPException(status_code=500, detail="Leaderboard table not found in database")  # Ошибка, если таблица отсутствует