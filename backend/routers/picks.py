from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database.db import get_db
from database import models  # Добавляем импорт моделей
from utils.auth import get_current_user
from schemas import UserPick, UserPickBase
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/user-picks", response_model=List[UserPick])
async def get_user_picks(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    user_id = user["id"]
    logger.info(f"Fetching picks for user_id={user_id}")
    picks = db.query(models.UserPick).filter(models.UserPick.user_id == user_id).all()
    logger.info(f"Returning {len(picks)} picks")
    return picks

@router.post("/", response_model=UserPick)
async def create_pick(
    tournament_id: int,
    round: str,
    match_number: int,
    predicted_winner: str,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    user_id = user["id"]
    logger.info(f"Creating pick for user_id={user_id}, tournament_id={tournament_id}, round={round}, match_number={match_number}")

    # Проверяем, существует ли турнир и активен ли он
    tournament = db.query(models.Tournament).filter(models.Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    if tournament.status != "ACTIVE":
        raise HTTPException(status_code=400, detail="Tournament is not active")

    # Проверяем, существует ли матч в TrueDraw
    match = db.query(models.TrueDraw).filter(
        models.TrueDraw.tournament_id == tournament_id,
        models.TrueDraw.round == round,
        models.TrueDraw.match_number == match_number
    ).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    # Проверяем, что predicted_winner — один из игроков матча
    if predicted_winner not in [match.player1, match.player2]:
        raise HTTPException(status_code=400, detail="Predicted winner must be one of the players")

    # Проверяем, есть ли уже пик для этого матча от пользователя
    existing_pick = db.query(models.UserPick).filter(
        models.UserPick.user_id == user_id,
        models.UserPick.tournament_id == tournament_id,
        models.UserPick.round == round,
        models.UserPick.match_number == match_number
    ).first()
    if existing_pick:
        # Обновляем существующий пик
        existing_pick.predicted_winner = predicted_winner
        db.commit()
        db.refresh(existing_pick)
        return existing_pick
    else:
        # Создаём новый пик
        new_pick = models.UserPick(
            user_id=user_id,
            tournament_id=tournament_id,
            round=round,
            match_number=match_number,
            player1=match.player1,
            player2=match.player2,
            predicted_winner=predicted_winner
        )
        db.add(new_pick)
        db.commit()
        db.refresh(new_pick)
        return new_pick