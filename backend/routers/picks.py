from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database.db import get_db
from database.models import TrueDraw, Tournament, UserPick

router = APIRouter()

@router.get("/initial-matches")
async def get_initial_matches(tournament_id: int, user_id: int, db: Session = Depends(get_db)):
    # Находим турнир
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")

    # Загружаем матчи начального раунда из true_draw
    matches = db.query(TrueDraw).filter(
        TrueDraw.tournament_id == tournament_id,
        TrueDraw.round == tournament.starting_round
    ).all()

    if not matches:
        raise HTTPException(status_code=404, detail="No matches found for the initial round")

    # Формируем ответ, включая счёты по сетам
    response = [
        {
            "id": match.id,
            "tournament_id": match.tournament_id,
            "round": match.round,
            "match_number": match.match_number,
            "player1": match.player1,
            "player2": match.player2,
            "winner": match.winner,
            "set1": match.set1,
            "set2": match.set2,
            "set3": match.set3,
            "set4": match.set4,
            "set5": match.set5,
        }
        for match in matches
    ]

    return response

@router.get("/compare")
async def compare_picks(tournament_id: int, user_id: int, db: Session = Depends(get_db)):
    # Находим турнир
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")

    if tournament.status != "CLOSED":
        raise HTTPException(status_code=400, detail="Tournament is not closed yet")

    # Загружаем пики пользователя
    user_picks = db.query(UserPick).filter(
        UserPick.tournament_id == tournament_id,
        UserPick.user_id == user_id
    ).all()

    # Загружаем реальные результаты из true_draw
    true_draws = db.query(TrueDraw).filter(
        TrueDraw.tournament_id == tournament_id
    ).all()

    # Сравниваем пики пользователя с реальными результатами
    comparison = []
    for user_pick in user_picks:
        true_draw = next((td for td in true_draws if td.round == user_pick.round and td.match_number == user_pick.match_number), None)
        if true_draw and true_draw.winner:
            comparison.append({
                "round": user_pick.round,
                "match_number": user_pick.match_number,
                "player1": user_pick.player1,
                "player2": user_pick.player2,
                "predicted_winner": user_pick.predicted_winner,
                "actual_winner": true_draw.winner,
                "correct": user_pick.predicted_winner == true_draw.winner
            })

    return comparison

@router.post("/save")
async def save_picks(payload: dict, db: Session = Depends(get_db)):
    tournament_id = payload.get("tournament_id")
    user_id = payload.get("user_id")
    picks = payload.get("picks")

    if not tournament_id or not user_id or not picks:
        raise HTTPException(status_code=400, detail="Invalid payload")

    # Проверяем, существует ли турнир
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")

    if tournament.status != "ACTIVE":
        raise HTTPException(status_code=400, detail="Tournament is not active")

    # Удаляем существующие пики пользователя для этого турнира
    db.query(UserPick).filter(
        UserPick.tournament_id == tournament_id,
        UserPick.user_id == user_id
    ).delete()

    # Сохраняем новые пики
    for pick in picks:
        db_pick = UserPick(
            user_id=user_id,
            tournament_id=tournament_id,
            round=pick["round"],
            match_number=pick["match_number"],
            player1=pick["player1"],
            player2=pick["player2"],
            predicted_winner=pick["predicted_winner"]
        )
        db.add(db_pick)

    db.commit()
    return {"message": "Picks saved successfully"}