from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database.db import get_db  # Импорт функции для получения сессии базы данных
from database import models  # Импорт моделей базы данных (Tournament, UserPick, TrueDraw и т.д.)
from utils.auth import get_current_user  # Импорт функции для получения текущего пользователя
from schemas import UserPick, UserPickBase  # Импорт схем Pydantic для валидации данных
import logging

# Создание маршрутизатора FastAPI для обработки запросов, связанных с пиками
router = APIRouter()
logger = logging.getLogger(__name__)  # Инициализация логгера для записи событий и ошибок

@router.get("/user-picks", response_model=List[UserPick])
async def get_user_picks(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    """
    Эндпоинт для получения всех пиков пользователя.
    Возвращает список пиков, сделанных текущим пользователем.
    Используется фронтендом для отображения текущих выборов пользователя.
    """
    user_id = user["id"]  # Получение ID текущего пользователя из данных авторизации
    logger.info(f"Fetching picks for user_id={user_id}")  # Логирование запроса
    # Запрос к базе данных: получение всех пиков пользователя по его ID
    picks = db.query(models.UserPick).filter(models.UserPick.user_id == user_id).all()
    logger.info(f"Returning {len(picks)} picks")  # Логирование количества возвращаемых пиков
    return picks  # Возврат списка пиков в формате, соответствующем схеме UserPick

@router.post("/", response_model=UserPick)
async def create_pick(
    tournament_id: int,  # ID турнира
    round: str,  # Раунд (например, 'R32')
    match_number: int,  # Номер матча в раунде
    predicted_winner: str,  # Имя предсказанного победителя
    db: Session = Depends(get_db),  # Сессия базы данных через зависимость
    user: dict = Depends(get_current_user)  # Текущий пользователь через зависимость
):
    """
    Эндпоинт для создания или обновления пика пользователя.
    Позволяет пользователю выбрать победителя матча в указанном турнире и раунде.
    Если пик уже существует, он обновляется; если нет — создаётся новый.
    """
    user_id = user["id"]  # Получение ID текущего пользователя
    logger.info(f"Creating pick for user_id={user_id}, tournament_id={tournament_id}, round={round}, match_number={match_number}")  # Логирование запроса

    # Проверка существования турнира
    tournament = db.query(models.Tournament).filter(models.Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")  # Ошибка, если турнир не найден
    if tournament.status != "ACTIVE":
        raise HTTPException(status_code=400, detail="Tournament is not active")  # Ошибка, если турнир не активен

    # Проверка существования матча в таблице true_draw
    match = db.query(models.TrueDraw).filter(
        models.TrueDraw.tournament_id == tournament_id,
        models.TrueDraw.round == round,
        models.TrueDraw.match_number == match_number
    ).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")  # Ошибка, если матч не найден

    # Проверка, что предсказанный победитель — один из игроков матча
    if predicted_winner not in [match.player1, match.player2]:
        raise HTTPException(status_code=400, detail="Predicted winner must be one of the players")  # Ошибка, если игрок не участвует в матче

    # Проверка, есть ли уже пик для этого матча от пользователя
    existing_pick = db.query(models.UserPick).filter(
        models.UserPick.user_id == user_id,
        models.UserPick.tournament_id == tournament_id,
        models.UserPick.round == round,
        models.UserPick.match_number == match_number
    ).first()
    if existing_pick:
        # Обновление существующего пика
        existing_pick.predicted_winner = predicted_winner  # Обновляем предсказанного победителя
        db.commit()  # Подтверждаем изменения в БД
        db.refresh(existing_pick)  # Обновляем объект для возврата
        return existing_pick  # Возвращаем обновленный пик
    else:
        # Создание нового пика
        new_pick = models.UserPick(
            user_id=user_id,
            tournament_id=tournament_id,
            round=round,
            match_number=match_number,
            player1=match.player1,  # Игрок 1 из true_draw
            player2=match.player2,  # Игрок 2 из true_draw
            predicted_winner=predicted_winner  # Предсказанный победитель
        )
        db.add(new_pick)  # Добавляем новый пик в БД
        db.commit()  # Подтверждаем изменения
        db.refresh(new_pick)  # Обновляем объект для возврата
        return new_pick  # Возвращаем созданный пик