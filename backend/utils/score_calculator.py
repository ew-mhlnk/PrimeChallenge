from sqlalchemy.orm import Session
from sqlalchemy import func
from database import models
import re
import logging

logger = logging.getLogger(__name__)

SCORING_SYSTEM = {
    # GRAND SLAM (128 сетка)
    # Победитель получает: 32 (за финал) + 64 (за титул) = 96 очков.
    # Максимум очков за турнир: ~320.
    "GRAND_SLAM": { 
        "R128": 1, 
        "R64": 1,   # Второй раунд тоже по 1, как ты хотела
        "R32": 2, 
        "R16": 4, 
        "QF": 8, 
        "SF": 16, 
        "F": 32,    # Достойно за финал
        "Champion": 64 # Джекпот за победу
    },
    
    # ATP 1000 (64 сетка)
    # Начинаем с R64 (или R128, если сетка неполная, ставим 1)
    # Победитель: 16 + 32 = 48 очков.
    "ATP_1000": { 
        "R128": 1, 
        "R64": 1, 
        "R32": 1,   # Первые раунды дешевые
        "R16": 2, 
        "QF": 4, 
        "SF": 8, 
        "F": 16, 
        "Champion": 32 
    },
    
    # ATP 500 (32 сетка)
    # Победитель: 8 + 16 = 24 очка.
    "ATP_500": { 
        "R64": 1, "R48": 1, 
        "R32": 1, 
        "R16": 1, 
        "QF": 2, 
        "SF": 4, 
        "F": 8, 
        "Champion": 16 
    },
    
    # ATP 250 (То же, что и 500, или чуть меньше, но схема 1-1-2-4 красивая)
    "ATP_250": { 
        "R64": 1, 
        "R32": 1, 
        "R16": 1, 
        "QF": 2, 
        "SF": 4, 
        "F": 8, 
        "Champion": 16 
    },
    
    "DEFAULT": { "R128": 1, "R64": 1, "R32": 2, "R16": 4, "QF": 8, "SF": 16, "F": 32, "Champion": 64 }
}

def normalize_name(name: str) -> str:
    if not name: return ""
    name = re.sub(r'\s*\(.*?\)$', '', name)
    return re.sub(r'[^\w\s]', '', name).strip().lower()

def get_tournament_weights(tournament: models.Tournament) -> dict:
    if not tournament: return SCORING_SYSTEM["DEFAULT"]
    t_type = (tournament.type or "").upper()
    t_tag = (tournament.tag or "").upper()
    if "SLAM" in t_type or "ТБШ" in t_tag or "GRAND" in t_type: return SCORING_SYSTEM["GRAND_SLAM"]
    if "1000" in t_type: return SCORING_SYSTEM["ATP_1000"]
    if "500" in t_type: return SCORING_SYSTEM["ATP_500"]
    if "250" in t_type: return SCORING_SYSTEM["ATP_250"]
    return SCORING_SYSTEM["DEFAULT"]

def calculate_score_for_user(user_picks, true_draws_map, weights):
    score = 0
    correct = 0
    for pick in user_picks:
        key = (pick.round, pick.match_number)
        match = true_draws_map.get(key)
        if not match or not match.winner: continue
        
        # ЛОГИКА СЛОТОВ (из предыдущих обсуждений)
        is_hit = False
        pick_norm = normalize_name(pick.predicted_winner)
        winner_norm = normalize_name(match.winner)
        
        if pick_norm == winner_norm:
            is_hit = True
        else:
            # Slot fallback
            user_slot = 0
            if pick.predicted_winner == pick.player1: user_slot = 1
            elif pick.predicted_winner == pick.player2: user_slot = 2
            
            winner_slot = 0
            p1_real = normalize_name(match.player1)
            p2_real = normalize_name(match.player2)
            if winner_norm == p1_real: winner_slot = 1
            elif winner_norm == p2_real: winner_slot = 2
            
            if user_slot != 0 and user_slot == winner_slot: is_hit = True
            
        if is_hit:
            points = weights.get(pick.round, 0)
            score += points
            correct += 1
            
    return score, correct

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
        score, correct = calculate_score_for_user(user_picks, true_draws_map, weights)
        
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
    
    leaderboard_entries.sort(key=lambda x: (x["score"], x["correct_picks"]), reverse=True)
    
    db.query(models.Leaderboard).filter_by(tournament_id=tournament_id).delete()
    for rank, entry in enumerate(leaderboard_entries, 1):
        # ВЕРНУЛИ СТАРУЮ ЗАПИСЬ (БЕЗ total_picks)
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