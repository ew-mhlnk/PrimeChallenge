from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict
from database.db import get_db
from database import models
from schemas import TrueDraw, UserPick, UserScore
from utils.auth import get_current_user
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/tournament/{tournament_id}/results", response_model=Dict)
async def get_comparison_results(tournament_id: int, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    logger.info(f"Fetching comparison results for tournament_id={tournament_id}, user_id={user['id']}")
    
    # Проверка существования турнира
    tournament = db.query(models.Tournament).filter(models.Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    if tournament.status not in ["CLOSED", "COMPLETED"]:
        raise HTTPException(status_code=400, detail="Tournament is not closed or completed")
    
    user_id = user["id"]
    
    # Получение результатов матчей
    true_draws = db.query(models.TrueDraw).filter(
        models.TrueDraw.tournament_id == tournament_id,
        models.TrueDraw.winner != None
    ).all()
    
    # Получение предсказаний пользователя
    user_picks = db.query(models.UserPick).filter(
        models.UserPick.tournament_id == tournament_id,
        models.UserPick.user_id == user_id
    ).all()
    
    # Вычисление сравнения
    comparison = []
    correct_count = 0
    for match in true_draws:
        pick = next((p for p in user_picks if p.round == match.round and p.match_number == match.match_number), None)
        is_correct = pick and pick.predicted_winner == match.winner
        if is_correct:
            correct_count += 1
        comparison.append({
            "round": match.round,
            "match_number": match.match_number,
            "player1": match.player1 or "TBD",
            "player2": match.player2 or "TBD",
            "predicted_winner": pick.predicted_winner if pick else "",
            "actual_winner": match.winner or "",
            "correct": is_correct
        })
    
    # Обновление или создание счёта пользователя
    user_score = db.query(models.UserScore).filter_by(
        user_id=user_id,
        tournament_id=tournament_id
    ).first()
    if user_score:
        user_score.correct_picks = correct_count
        user_score.score = correct_count * 10  # 10 очков за каждый правильный пик
        db.commit()
    else:
        new_score = models.UserScore(
            user_id=user_id,
            tournament_id=tournament_id,
            score=correct_count * 10,
            correct_picks=correct_count
        )
        db.add(new_score)
        db.commit()
    
    logger.info(f"Returning {len(comparison)} comparison results, correct_picks={correct_count}, score={correct_count * 10}")
    return {
        "comparison": comparison,
        "correct_picks": correct_count,
        "score": correct_count * 10
    }