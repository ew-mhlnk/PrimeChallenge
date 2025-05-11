# backend/utils/bracket.py
from typing import Dict, List
import logging
from sqlalchemy.orm import Session  # Импорт Session
from database import models  # Импорт моделей базы данных

logger = logging.getLogger(__name__)

def generate_bracket(tournament, true_draws, user_picks, rounds):
    match_counts = {"R128": 64, "R64": 32, "R32": 16, "R16": 8, "QF": 4, "SF": 2, "F": 1, "W": 1}
    bracket = {}
    
    for round_idx, round_name in enumerate(rounds):
        match_count = match_counts.get(round_name, 1)
        bracket[round_name] = {}
        
        for match_number in range(1, match_count + 1):
            match = next((m for m in true_draws if m.round == round_name and m.match_number == match_number), None)
            pick = next((p for p in user_picks if p.round == round_name and p.match_number == match_number), None)
            
            if round_name == tournament.starting_round:
                bracket[round_name][match_number] = {
                    "player1": match.player1 if match else "TBD",
                    "player2": match.player2 if match else "TBD",
                    "predicted_winner": pick.predicted_winner if pick else None,
                    "source_matches": []
                }
            else:
                prev_round = rounds[round_idx - 1]
                prev_match1_number = (match_number - 1) * 2 + 1
                prev_match2_number = prev_match1_number + 1
                
                prev_match1 = bracket[prev_round].get(prev_match1_number, {"predicted_winner": None})
                prev_match2 = bracket[prev_round].get(prev_match2_number, {"predicted_winner": None})
                
                player1 = prev_match1["predicted_winner"] if prev_match1["predicted_winner"] else (pick.player1 if pick else None)
                player2 = prev_match2["predicted_winner"] if prev_match2["predicted_winner"] else (pick.player2 if pick else None)
                
                bracket[round_name][match_number] = {
                    "player1": player1,
                    "player2": player2,
                    "predicted_winner": pick.predicted_winner if pick else None,
                    "source_matches": [
                        {"round": prev_round, "match_number": prev_match1_number},
                        {"round": prev_round, "match_number": prev_match2_number}
                    ]
                }
    
    return bracket

def compute_comparison_and_scores(tournament, user_id: int, db: Session):
    """
    Вычисляет сравнение предсказаний пользователя с реальными результатами и общие очки.
    Примерная реализация, адаптируй под свои нужды.
    """
    logger.info(f"Computing comparison and scores for tournament {tournament.id}, user {user_id}")
    true_draws = db.query(models.TrueDraw).filter(models.TrueDraw.tournament_id == tournament.id).all()
    user_picks = db.query(models.UserPick).filter(
        models.UserPick.tournament_id == tournament.id,
        models.UserPick.user_id == user_id
    ).all()
    
    comparison = []
    correct_picks = 0
    total_score = 0
    
    for pick in user_picks:
        true_match = next((m for m in true_draws if m.round == pick.round and m.match_number == pick.match_number), None)
        if true_match and true_match.winner:
            is_correct = pick.predicted_winner == true_match.winner
            comparison.append({
                "round": pick.round,
                "match_number": pick.match_number,
                "player1": pick.player1,
                "player2": pick.player2,
                "predicted_winner": pick.predicted_winner,
                "actual_winner": true_match.winner,
                "correct": is_correct
            })
            if is_correct:
                correct_picks += 1
                # Пример подсчёта очков (можно настроить логику)
                total_score += 10  # Например, 10 очков за верный пик
    
    # Сохраняем или обновляем очки пользователя (пример)
    user_score = db.query(models.UserScore).filter(
        models.UserScore.user_id == user_id,
        models.UserScore.tournament_id == tournament.id
    ).first()
    if user_score:
        user_score.score = total_score
        user_score.correct_picks = correct_picks
    else:
        user_score = models.UserScore(
            user_id=user_id,
            tournament_id=tournament.id,
            score=total_score,
            correct_picks=correct_picks
        )
        db.add(user_score)
    db.commit()
    
    return {
        "comparison": comparison,
        "score": total_score,
        "correct_picks": correct_picks
    }