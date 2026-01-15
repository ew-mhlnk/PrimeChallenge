from sqlalchemy.orm import Session
from sqlalchemy import func
from database import models
import re
import logging

logger = logging.getLogger(__name__)

# === СИСТЕМА ОЧКОВ (МАТЕМАТИЧЕСКАЯ) ===
# Настроена так, чтобы совпадать с твоими ручными расчетами.
# Принцип: За каждый угаданный матч начисляются очки.
# Чем дальше прошел игрок, тем дороже стоит победа.

SCORING_SYSTEM = {
    # GRAND SLAM (Сетка 128)
    # Прогрессия: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 8 -> 15
    "GRAND_SLAM": { 
        "R128": 1, # 1-й круг (64 матча)
        "R64": 2,  # 2-й круг (32 матча)
        "R32": 3,  # 3-й круг (16 матчей)
        "R16": 4, 
        "QF": 5, 
        "SF": 6, 
        "F": 8, 
        "Champion": 15 
    },
    
    # ATP/WTA 1000 (Сетка 64 или 96)
    # Прогрессия: 1 -> 2 -> 3 -> 4 -> 5 -> 8 -> 12
    "LEVEL_1000": { 
        "R128": 1, # Если есть квалифаеры/расширенная сетка
        "R64": 1,  # 1-й основной круг = 1 балл
        "R32": 2,  # 2-й круг = 2 балла
        "R16": 3,  # 3-й круг = 3 балла
        "QF": 4, 
        "SF": 5, 
        "F": 8, 
        "Champion": 12 
    },
    
    # ATP/WTA 500 (Сетка 32 или 48)
    # Твой пример (получится 69 очков):
    # R64 (25 угаданных) * 1 = 25
    # R32 (11 угаданных) * 2 = 22
    # R16 (6 угаданных) * 3 = 18
    # QF (1 угаданный) * 4 = 4
    # ИТОГО: 69
    "LEVEL_500": { 
        "R64": 1, "R48": 1, 
        "R32": 2, 
        "R16": 3, 
        "QF": 4, 
        "SF": 5, 
        "F": 6, 
        "Champion": 12 
    },
    
    # ATP/WTA 250 (Сетка 32)
    # Твой пример (получится 17 очков):
    # R32 (6 угаданных) * 1 = 6
    # R16 (2 угаданных) * 2 = 4
    # QF (1 угаданный) * 3 = 3
    # SF (1 угаданный) * 4 = 4
    # ИТОГО: 17
    "LEVEL_250": { 
        "R64": 1, 
        "R32": 1, 
        "R16": 2, 
        "QF": 3, 
        "SF": 4, 
        "F": 5, 
        "Champion": 8 
    },
    
    # Дефолт
    "DEFAULT": { "R128": 1, "R64": 1, "R32": 2, "R16": 3, "QF": 4, "SF": 5, "F": 6, "Champion": 10 }
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
    if "1000" in t_type: return SCORING_SYSTEM["LEVEL_1000"]
    if "500" in t_type: return SCORING_SYSTEM["LEVEL_500"]
    if "250" in t_type: return SCORING_SYSTEM["LEVEL_250"]
    
    return SCORING_SYSTEM["DEFAULT"]

def calculate_score_for_user(user_picks, true_draws_map, weights):
    score = 0
    correct = 0
    for pick in user_picks:
        key = (pick.round, pick.match_number)
        match = true_draws_map.get(key)
        if not match or not match.winner: continue
        
        is_hit = False
        pick_norm = normalize_name(pick.predicted_winner)
        winner_norm = normalize_name(match.winner)
        
        if pick_norm == winner_norm:
            is_hit = True
        else:
            # Сравнение по слотам (на случай смены имен)
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
            # Берем вес раунда из нашей таблицы
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
    
    # Сортировка: Очки -> Верные пики
    leaderboard_entries.sort(key=lambda x: (x["score"], x["correct_picks"]), reverse=True)
    
    db.query(models.Leaderboard).filter_by(tournament_id=tournament_id).delete()
    
    # === ПЛОТНОЕ РАНЖИРОВАНИЕ (1, 1, 2, 3) ===
    current_rank = 1
    for i, entry in enumerate(leaderboard_entries):
        if i > 0:
            prev = leaderboard_entries[i-1]
            if entry["score"] != prev["score"] or entry["correct_picks"] != prev["correct_picks"]:
                current_rank += 1 # +1 место
        
        lb_row = models.Leaderboard(
            tournament_id=tournament_id,
            user_id=entry["user_id"],
            rank=current_rank,
            score=entry["score"],
            correct_picks=entry["correct_picks"]
        )
        db.add(lb_row)
        
    db.commit()
    logger.info(f"Leaderboard updated. {len(leaderboard_entries)} users ranked.")