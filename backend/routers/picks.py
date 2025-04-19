from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
import logging
from typing import List
from database.db import get_db
from database.models import User, UserPick, Tournament, TrueDraw
from pydantic import BaseModel
from services.auth_service import authenticate_user

router = APIRouter()
logger = logging.getLogger(__name__)

class PickData(BaseModel):
    round: str
    match_number: int
    predicted_winner: str
    player1: str
    player2: str

class PickRequest(BaseModel):
    tournament_id: int
    user_id: int
    picks: List[PickData]

class PickResponse(BaseModel):
    id: int
    round: str
    match_number: int
    player1: str
    player2: str
    predicted_winner: str

@router.post("/save", response_model=List[PickResponse])
async def save_picks(request: PickRequest, db: Session = Depends(get_db)):
    logger.info(f"Submitting picks for user {request.user_id} in tournament {request.tournament_id}")
    
    # Проверяем, существует ли турнир
    tournament = db.query(Tournament).filter(Tournament.id == request.tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail=f"Tournament {request.tournament_id} not found")

    # Проверяем, активен ли турнир
    if tournament.status == "CLOSED":
        raise HTTPException(status_code=400, detail="Cannot submit picks for a closed tournament")

    # Удаляем все существующие пики пользователя для данного турнира
    db.query(UserPick).filter(
        UserPick.user_id == request.user_id,
        UserPick.tournament_id == request.tournament_id
    ).delete()
    db.commit()
    logger.info(f"Deleted existing picks for user {request.user_id} in tournament {request.tournament_id}")

    submitted_picks = []
    for pick_data in request.picks:
        round = pick_data.round
        match_number = pick_data.match_number
        predicted_winner = pick_data.predicted_winner
        player1 = pick_data.player1
        player2 = pick_data.player2

        if not round or not match_number or not predicted_winner or not player1 or not player2:
            raise HTTPException(status_code=400, detail="Invalid pick data")

        # Логируем, какой пик обрабатываем
        logger.info(f"Processing pick: tournament_id={request.tournament_id}, round={round}, match_number={match_number}, player1={player1}, player2={player2}, predicted_winner={predicted_winner}")

        # Проверяем, что predicted_winner — один из игроков
        if predicted_winner not in [player1, player2]:
            raise HTTPException(status_code=400, detail="Predicted winner must be one of the players")

        # Сохраняем новый пик
        new_pick = UserPick(
            user_id=request.user_id,
            tournament_id=request.tournament_id,
            round=round,
            match_number=match_number,
            player1=player1,
            player2=player2,
            predicted_winner=predicted_winner
        )
        db.add(new_pick)
        submitted_picks.append(new_pick)

    db.commit()

    logger.info(f"Picks submitted successfully for user {request.user_id}")
    return [{"id": pick.id, "round": pick.round, "match_number": pick.match_number, "player1": pick.player1, "player2": pick.player2, "predicted_winner": pick.predicted_winner} for pick in submitted_picks]

@router.get("/compare")
async def compare_picks(tournament_id: int, user_id: int, db: Session = Depends(get_db)):
    logger.info(f"Comparing picks for user {user_id} in tournament {tournament_id}")
    
    # Получаем пики пользователя
    user_picks = db.query(UserPick).filter(
        UserPick.user_id == user_id,
        UserPick.tournament_id == tournament_id
    ).all()

    if not user_picks:
        raise HTTPException(status_code=404, detail="No picks found for this user in the tournament")

    # Получаем истинные результаты из true_draw
    true_draw = db.query(TrueDraw).filter(TrueDraw.tournament_id == tournament_id).all()
    true_draw_dict = {(td.round, td.match_number): td.winner for td in true_draw if td.winner}

    # Сравниваем пики с истинными результатами
    comparison_results = []
    for pick in user_picks:
        actual_winner = true_draw_dict.get((pick.round, pick.match_number))
        if actual_winner:
            comparison_results.append({
                "round": pick.round,
                "match_number": pick.match_number,
                "player1": pick.player1,
                "player2": pick.player2,
                "predicted_winner": pick.predicted_winner,
                "actual_winner": actual_winner,
                "correct": pick.predicted_winner == actual_winner
            })

    return comparison_results