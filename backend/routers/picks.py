from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy.sql import func  # Импортируем func
import logging
from typing import List
from database.db import get_db
from database.models import User, Match, UserPick, Tournament, TrueDraw  # Добавляем TrueDraw
from pydantic import BaseModel
from services.auth_service import authenticate_user

router = APIRouter()
logger = logging.getLogger(__name__)

class PickData(BaseModel):
    round: str
    match_number: int
    predicted_winner: str

class PickRequest(BaseModel):
    tournament_id: int
    user_id: int
    picks: List[PickData]

class PickResponse(BaseModel):
    id: int
    round: str
    match_number: int
    predicted_winner: str

@router.post("/save", response_model=List[PickResponse])
async def save_picks(request: PickRequest, db: Session = Depends(get_db)):
    logger.info(f"Submitting picks for user {request.user_id} in tournament {request.tournament_id}")
    submitted_picks = []

    # Проверяем, существует ли турнир
    tournament = db.query(Tournament).filter(Tournament.id == request.tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail=f"Tournament {request.tournament_id} not found")

    # Проверяем, активен ли турнир
    if tournament.status == "CLOSED":
        raise HTTPException(status_code=400, detail="Cannot submit picks for a closed tournament")

    for pick_data in request.picks:
        round = pick_data.round
        match_number = pick_data.match_number
        predicted_winner = pick_data.predicted_winner

        if not round or not match_number or not predicted_winner:
            raise HTTPException(status_code=400, detail="Invalid pick data")

        # Находим матч по tournament_id, round и match_number
        match = db.query(Match).filter(
            Match.tournament_id == request.tournament_id,
            Match.round == round,
            Match.match_number == match_number
        ).first()

        if not match:
            raise HTTPException(status_code=404, detail=f"Match {round} - {match_number} not found")

        if match.winner:
            raise HTTPException(status_code=400, detail=f"Match {round} - {match_number} already has a winner")

        if predicted_winner not in [match.player1, match.player2]:
            raise HTTPException(status_code=400, detail="Predicted winner must be one of the players")

        # Проверяем, есть ли уже пик для этого пользователя, раунда и матча
        existing_pick = db.query(UserPick).filter(
            UserPick.user_id == request.user_id,
            UserPick.tournament_id == request.tournament_id,
            UserPick.round == round,
            UserPick.match_number == match_number
        ).first()

        if existing_pick:
            existing_pick.predicted_winner = predicted_winner
            existing_pick.updated_at = func.now()  # Теперь func доступен
        else:
            new_pick = UserPick(
                user_id=request.user_id,
                tournament_id=request.tournament_id,
                round=round,
                match_number=match_number,
                predicted_winner=predicted_winner
            )
            db.add(new_pick)
            submitted_picks.append(new_pick)

    db.commit()

    logger.info(f"Picks submitted successfully for user {request.user_id}")
    return [{"id": pick.id, "round": pick.round, "match_number": pick.match_number, "predicted_winner": pick.predicted_winner} for pick in submitted_picks]

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
            match = db.query(Match).filter(
                Match.tournament_id == tournament_id,
                Match.round == pick.round,
                Match.match_number == pick.match_number
            ).first()
            
            comparison_results.append({
                "round": pick.round,
                "match_number": pick.match_number,
                "player1": match.player1 if match else "",
                "player2": match.player2 if match else "",
                "predicted_winner": pick.predicted_winner,
                "actual_winner": actual_winner,
                "correct": pick.predicted_winner == actual_winner
            })

    return comparison_results