from sqlalchemy.orm import Session
from database import models

# СНЕЖНЫЙ КОМ (Веса раундов)
# Чем сложнее раунд, тем больше очков.
ROUND_WEIGHTS = {
    "R128": 1,
    "R64": 2,
    "R32": 4,
    "R16": 8,
    "QF": 16,
    "SF": 32,
    "F": 64,
    "Champion": 128
}

def compute_comparison_and_scores(tournament: models.Tournament, user_id: int, db: Session) -> dict:
    user_picks = db.query(models.UserPick).filter(
        models.UserPick.tournament_id == tournament.id,
        models.UserPick.user_id == user_id
    ).all()
    
    true_draws = db.query(models.TrueDraw).filter_by(tournament_id=tournament.id).all()
    
    comparison = []
    total_score = 0
    correct_count = 0
    
    for match in true_draws:
        # Ищем прогноз пользователя
        pick = next((p for p in user_picks if p.round == match.round and p.match_number == match.match_number), None)
        
        is_correct = False
        
        # Главная проверка:
        # 1. У матча должен быть определен победитель (winner is not None)
        # 2. У пользователя должен быть прогноз (pick is not None)
        # 3. Имена должны совпадать (Sinner == Sinner). 
        #    Если Sinner заменен на LL Khachanov, то (Sinner != LL Khachanov) -> False.
        if pick and match.winner and pick.predicted_winner:
            # Сравниваем без учета регистра и лишних пробелов
            if pick.predicted_winner.strip().lower() == match.winner.strip().lower():
                is_correct = True

        if is_correct:
            correct_count += 1
            total_score += ROUND_WEIGHTS.get(match.round, 0)
            
        comparison.append({
            "round": match.round,
            "match_number": match.match_number,
            "player1": match.player1 or "TBD",
            "player2": match.player2 or "TBD",
            "predicted_winner": pick.predicted_winner if pick else "-",
            "actual_winner": match.winner or "-",
            "correct": is_correct
        })
    
    # Обновляем/Создаем запись в таблице очков
    user_score = db.query(models.UserScore).filter_by(user_id=user_id, tournament_id=tournament.id).first()
    if user_score:
        user_score.correct_picks = correct_count
        user_score.score = total_score
    else:
        db.add(models.UserScore(
            user_id=user_id,
            tournament_id=tournament.id,
            score=total_score,
            correct_picks=correct_count
        ))
    
    db.commit()
    
    return {
        "comparison": comparison, 
        "score": total_score, 
        "correct_picks": correct_count
    }