# utils/score_calculator.py
from sqlalchemy.orm import Session
from database import models

def compute_comparison_and_scores(tournament: models.Tournament, user_id: int, db: Session) -> dict:
    user_picks = db.query(models.UserPick).filter(
        models.UserPick.tournament_id == tournament.id,
        models.UserPick.user_id == user_id
    ).all()
    
    true_draws = db.query(models.TrueDraw).filter_by(tournament_id=tournament.id).all()
    
    comparison = []
    correct_count = 0
    for match in true_draws:
        pick = next((p for p in user_picks if p.round == match.round and p.match_number == match.match_number), None)
        is_correct = pick and pick.predicted_winner == match.winner and match.winner is not None
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
    
    user_score = db.query(models.UserScore).filter_by(
        user_id=user_id,
        tournament_id=tournament.id
    ).first()
    if user_score:
        user_score.correct_picks = correct_count
        user_score.score = correct_count * 10
    else:
        new_score = models.UserScore(
            user_id=user_id,
            tournament_id=tournament.id,
            score=correct_count * 10,
            correct_picks=correct_count
        )
        db.add(new_score)
    db.commit()
    
    return {"comparison": comparison, "correct_picks": correct_count, "score": correct_count * 10}