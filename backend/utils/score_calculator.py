from sqlalchemy.orm import Session
from sqlalchemy import func
from database import models
import re
import logging

logger = logging.getLogger(__name__)

ROUND_WEIGHTS = {
    "R128": 1, "R64": 2, "R32": 4, "R16": 8, "QF": 16, "SF": 32, "F": 64, "Champion": 128
}

def normalize_name(name: str) -> str:
    if not name: return ""
    name = re.sub(r'\s*\(.*?\)$', '', name)
    return re.sub(r'[^\w\s]', '', name).strip().lower()

def calculate_score_for_user(user_picks, true_draws_map):
    score = 0
    correct = 0
    
    for pick in user_picks:
        # Ключ для поиска матча: (round, match_number)
        key = (pick.round, pick.match_number)
        match = true_draws_map.get(key)
        
        if not match or not match.winner:
            continue
            
        # Логика сравнения
        pick_name = normalize_name(pick.predicted_winner)
        winner_name = normalize_name(match.winner)
        
        # Учитываем BYE: Если соперник BYE, то победа зачисляется автоматически,
        # если юзер выбрал того, кто не BYE.
        # Но в true_draws winner уже записан sync_service-ом корректно (как прошедший игрок).
        # Так что просто сравниваем winner.
        
        if pick_name == winner_name:
            score += ROUND_WEIGHTS.get(pick.round, 0)
            correct += 1
            
    return score, correct

def update_tournament_leaderboard(tournament_id: int, db: Session):
    """
    Пересчитывает очки ВСЕХ пользователей для турнира и обновляет Leaderboard.
    Вызывается после синхронизации.
    """
    logger.info(f"Updating leaderboard for tournament {tournament_id}...")
    
    # 1. Получаем правильные результаты (True Draw)
    true_draws = db.query(models.TrueDraw).filter_by(tournament_id=tournament_id).all()
    # Создаем карту для быстрого поиска: (round, match_num) -> MatchObj
    true_draws_map = {(m.round, m.match_number): m for m in true_draws}
    
    # 2. Получаем все пики всех юзеров для этого турнира
    # Группируем их по user_id
    picks = db.query(models.UserPick).filter_by(tournament_id=tournament_id).all()
    
    user_picks_map = {}
    for p in picks:
        if p.user_id not in user_picks_map:
            user_picks_map[p.user_id] = []
        user_picks_map[p.user_id].append(p)
        
    # 3. Считаем очки для каждого
    leaderboard_entries = []
    
    for user_id, user_picks in user_picks_map.items():
        score, correct = calculate_score_for_user(user_picks, true_draws_map)
        
        # Сохраняем/Обновляем в UserScore (для профиля)
        user_score_entry = db.query(models.UserScore).filter_by(user_id=user_id, tournament_id=tournament_id).first()
        if not user_score_entry:
            user_score_entry = models.UserScore(user_id=user_id, tournament_id=tournament_id)
            db.add(user_score_entry)
        
        user_score_entry.score = score
        user_score_entry.correct_picks = correct
        
        leaderboard_entries.append({
            "user_id": user_id,
            "score": score,
            "correct_picks": correct
        })
    
    # 4. Сортируем по очкам (desc), затем по кол-ву верных (desc)
    leaderboard_entries.sort(key=lambda x: (x["score"], x["correct_picks"]), reverse=True)
    
    # 5. Обновляем таблицу Leaderboard
    # Сначала удаляем старые записи для этого турнира (проще перезаписать)
    db.query(models.Leaderboard).filter_by(tournament_id=tournament_id).delete()
    
    for rank, entry in enumerate(leaderboard_entries, 1):
        lb_row = models.Leaderboard(
            tournament_id=tournament_id,
            user_id=entry["user_id"],
            rank=rank,
            score=entry["score"],
            correct_picks=entry["correct_picks"]
        )
        db.add(lb_row)
        
    db.commit()
    logger.info(f"Leaderboard updated. {len(leaderboard_entries)} users ranked.")

# --- Старая функция для одиночного просмотра (оставляем для совместимости) ---
def compute_comparison_and_scores(tournament: models.Tournament, user_id: int, db: Session) -> dict:
    # Эта функция нужна только для визуализации "Comparison" на фронте.
    # Очки мы теперь берем из UserScore, который обновлен выше.
    
    user_picks = db.query(models.UserPick).filter(
        models.UserPick.tournament_id == tournament.id,
        models.UserPick.user_id == user_id
    ).all()
    true_draws = db.query(models.TrueDraw).filter_by(tournament_id=tournament.id).all()
    
    comparison = []
    
    # Просто берем уже посчитанные очки из базы
    user_score_obj = db.query(models.UserScore).filter_by(user_id=user_id, tournament_id=tournament.id).first()
    total_score = user_score_obj.score if user_score_obj else 0
    correct_count = user_score_obj.correct_picks if user_score_obj else 0

    # Генерируем сравнение для фронта
    for match in true_draws:
        pick = next((p for p in user_picks if p.round == match.round and p.match_number == match.match_number), None)
        
        is_correct = False
        if pick and match.winner and pick.predicted_winner:
            if normalize_name(pick.predicted_winner) == normalize_name(match.winner):
                is_correct = True
        
        # Специальная логика BYE для визуализации
        is_bye = (match.player2 and match.player2.lower() == "bye") or (match.player1 and match.player1.lower() == "bye")
        if is_bye and pick:
             real_player = match.player1 if match.player2.lower() == "bye" else match.player2
             if normalize_name(pick.predicted_winner) == normalize_name(real_player):
                 is_correct = True

        sets = [s for s in [match.set1, match.set2, match.set3, match.set4, match.set5] if s]

        comparison.append({
            "round": match.round,
            "match_number": match.match_number,
            "player1": match.player1 or "TBD",
            "player2": match.player2 or "TBD",
            "predicted_winner": pick.predicted_winner if pick else "-",
            "actual_winner": match.winner or "-",
            "scores": sets,
            "correct": is_correct
        })
        
    return {"comparison": comparison, "score": total_score, "correct_picks": correct_count}