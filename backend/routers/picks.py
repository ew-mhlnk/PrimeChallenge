from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import logging
from typing import List
from database.db import get_db
from database.models import UserPick, Tournament, TrueDraw
from pydantic import BaseModel

router = APIRouter()
logger = logging.getLogger(__name__)

# Модели данных для запросов и ответов
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

class MatchData(BaseModel):
    round: str
    match_number: int
    player1: str
    player2: str

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
        logger.info(
            f"Processing pick: tournament_id={request.tournament_id}, round={round}, "
            f"match_number={match_number}, player1={player1}, player2={player2}, "
            f"predicted_winner={predicted_winner}"
        )

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
    return [
        {
            "id": pick.id,
            "round": pick.round,
            "match_number": pick.match_number,
            "player1": pick.player1,
            "player2": pick.player2,
            "predicted_winner": pick.predicted_winner
        }
        for pick in submitted_picks
    ]

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

@router.get("/initial-matches", response_model=List[MatchData])
async def get_initial_matches(tournament_id: int, user_id: int, db: Session = Depends(get_db)):
    logger.info(f"Fetching initial round matches for tournament {tournament_id}, user {user_id}")
    
    # Получаем турнир, чтобы узнать starting_round
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail=f"Tournament {tournament_id} not found")

    # Проверяем, есть ли уже пики пользователя
    existing_picks = db.query(UserPick).filter(
        UserPick.user_id == user_id,
        UserPick.tournament_id == tournament_id,
        UserPick.round == tournament.starting_round
    ).all()

    if existing_picks:
        # Если пики уже есть, возвращаем их
        logger.info(f"Returning existing picks for user {user_id} in tournament {tournament_id}")
        return [
            {
                "round": pick.round,
                "match_number": pick.match_number,
                "player1": pick.player1,
                "player2": pick.player2,
            }
            for pick in existing_picks
        ]

    # Если пиков нет, загружаем начальный раунд из true_draw
    matches = db.query(TrueDraw).filter(
        TrueDraw.tournament_id == tournament_id,
        TrueDraw.round == tournament.starting_round
    ).all()

    if not matches:
        logger.warning(f"No matches found in true_draw for tournament {tournament_id}, round {tournament.starting_round}")
        return []

    # Сохраняем начальный раунд в user_picks как "базу"
    for match in matches:
        new_pick = UserPick(
            user_id=user_id,
            tournament_id=tournament_id,
            round=match.round,
            match_number=match.match_number,
            player1=match.player1,
            player2=match.player2,
            predicted_winner=""  # Пользователь ещё не сделал предсказание
        )
        db.add(new_pick)
    db.commit()

    logger.info(f"Initialized user_picks with initial matches from true_draw for user {user_id} in tournament {tournament_id}")
    return [
        {
            "round": match.round,
            "match_number": match.match_number,
            "player1": match.player1,
            "player2": match.player2,
        }
        for match in matches
    ]