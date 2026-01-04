from sqlalchemy.orm import Session
from sqlalchemy import func
from database import models
import re
import logging

logger = logging.getLogger(__name__)

# --- ВЕСА ОЧКОВ (твои настройки) ---
SCORING_SYSTEM = {
    "GRAND_SLAM": { "R128": 1, "R64": 2, "R32": 4, "R16": 8, "QF": 12, "SF": 16, "F": 20, "Champion": 20 },
    "ATP_1000": { "R128": 1, "R64": 1, "R32": 2, "R16": 4, "QF": 8, "SF": 12, "F": 16, "Champion": 16 },
    "ATP_500": { "R64": 1, "R48": 1, "R32": 1, "R16": 2, "QF": 4, "SF": 8, "F": 12, "Champion": 12 },
    "ATP_250": { "R64": 0, "R32": 1, "R16": 2, "QF": 3, "SF": 4, "F": 6, "Champion": 6 },
    "DEFAULT": { "R128": 1, "R64": 1, "R32": 1, "R16": 2, "QF": 3, "SF": 4, "F": 6, "Champion": 6 }
}

def normalize_name(name: str) -> str:
    if not name: return ""
    # Очищаем от мусора, но аккуратно
    n = name.lower().strip()
    n = re.sub(r'\s*\(.*?\)', '', n) # убираем скобки (1), (Q)
    n = re.sub(r'[^\w]', '', n)      # оставляем только буквы/цифры
    return n

def get_tournament_weights(tournament: models.Tournament) -> dict:
    if not tournament: return SCORING_SYSTEM["DEFAULT"]
    t_type = (tournament.type or "").upper()
    t_tag = (tournament.tag or "").upper()
    
    if "SLAM" in t_type or "ТБШ" in t_tag: return SCORING_SYSTEM["GRAND_SLAM"]
    if "1000" in t_type: return SCORING_SYSTEM["ATP_1000"]
    if "500" in t_type: return SCORING_SYSTEM["ATP_500"]
    if "250" in t_type: return SCORING_SYSTEM["ATP_250"]
    return SCORING_SYSTEM["DEFAULT"]

def calculate_score_for_user(user_picks, true_draws_map, weights):
    score = 0
    correct = 0
    total_finished_picks = 0
    
    for pick in user_picks:
        key = (pick.round, pick.match_number)
        match = true_draws_map.get(key)
        
        # Если матча нет или победитель не определен - пропускаем
        if not match or not match.winner:
            continue
            
        total_finished_picks += 1

        # --- НОВАЯ ЛОГИКА СРАВНЕНИЯ (SLOT LOGIC) ---
        is_hit = False
        
        # 1. Попытка сравнить имена "в лоб" (для простых случаев)
        pick_norm = normalize_name(pick.predicted_winner)
        winner_norm = normalize_name(match.winner)
        
        if pick_norm == winner_norm:
            is_hit = True
        else:
            # 2. Логика СЛОТОВ (спасает Q/LL и замены)
            # Определяем, какой слот выбрал юзер В ПРОШЛОМ (по своим сохраненным данным)
            user_picked_slot = 0
            # Сравниваем сырые строки или нормализованные
            if pick.predicted_winner == pick.player1: user_picked_slot = 1
            elif pick.predicted_winner == pick.player2: user_picked_slot = 2
            
            # Определяем, какой слот выиграл В РЕАЛЬНОСТИ
            real_winner_slot = 0
            # Тут сравниваем нормализованные имена, так как в true_draw winner точно совпадает с p1 или p2
            p1_real = normalize_name(match.player1)
            p2_real = normalize_name(match.player2)
            
            if winner_norm == p1_real: real_winner_slot = 1
            elif winner_norm == p2_real: real_winner_slot = 2
            
            # Сравнение слотов
            if user_picked_slot != 0 and user_picked_slot == real_winner_slot:
                is_hit = True
                
        if is_hit:
            points = weights.get(pick.round, 0)
            score += points
            correct += 1
            
    return score, correct, total_finished_picks

def update_tournament_leaderboard(tournament_id: int, db: Session):
    logger.info(f"Updating leaderboard for tournament {tournament_id}...")
    
    tournament = db.query(models.Tournament).filter(models.Tournament.id == tournament_id).first()
    if not tournament: return

    weights = get_tournament_weights(tournament)
    
    true_draws = db.query(models.TrueDraw).filter_by(tournament_id=tournament_id).all()
    true_draws_map = {(m.round, m.match_number): m for m in true_draws}
    
    picks = db.query(models.UserPick).filter_by(tournament_id=tournament_id).all()
    
    user_picks_map = {}
    for p in picks:
        if p.user_id not in user_picks_map: user_picks_map[p.user_id] = []
        user_picks_map[p.user_id].append(p)
        
    leaderboard_entries = []
    
    for user_id, user_picks in user_picks_map.items():
        score, correct, total_finished = calculate_score_for_user(user_picks, true_draws_map, weights)
        
        user_score_entry = db.query(models.UserScore).filter_by(user_id=user_id, tournament_id=tournament_id).first()
        if not user_score_entry:
            user_score_entry = models.UserScore(user_id=user_id, tournament_id=tournament_id)
            db.add(user_score_entry)
        
        user_score_entry.score = score
        user_score_entry.correct_picks = correct
        
        leaderboard_entries.append({
            "user_id": user_id,
            "score": score,
            "correct_picks": correct,
            "total_picks": total_finished
        })
    
    leaderboard_entries.sort(key=lambda x: (x["score"], x["correct_picks"]), reverse=True)
    
    db.query(models.Leaderboard).filter_by(tournament_id=tournament_id).delete()
    
    for rank, entry in enumerate(leaderboard_entries, 1):
        lb_row = models.Leaderboard(
            tournament_id=tournament_id,
            user_id=entry["user_id"],
            rank=rank,
            score=entry["score"],
            correct_picks=entry["correct_picks"],
            total_picks=entry["total_picks"]
        )
        db.add(lb_row)
        
    db.commit()
    logger.info(f"Leaderboard updated. {len(leaderboard_entries)} users ranked.")