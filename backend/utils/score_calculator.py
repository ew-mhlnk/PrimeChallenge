from sqlalchemy.orm import Session
from sqlalchemy import func
from database import models
import re
import logging
from utils.audit import audit_pick, audit_summary # <--- Импорт нашего аудитора

logger = logging.getLogger(__name__)

SCORING_SYSTEM = {
    # GRAND SLAM (Сетка 128)
    "GRAND_SLAM": { 
        "R128": 1,  # Угадал исход матча 1/64 финала -> 1 балл
        "R64": 2,   # Угадал исход матча 1/32 финала -> 2 балла
        "R32": 4,   # ... -> 4 балла
        "R16": 8, 
        "QF": 12, 
        "SF": 16, 
        "F": 20,    # Победа в финале дает 64 очка
        "Champion": 0 # Не дублируем очки
    },
    
    # 1000 (Сетка 64)
    "LEVEL_1000": { 
        "R128": 1, # (Квалы/Доп)
        "R64": 1,  # Первый круг
        "R32": 2,  # Второй круг
        "R16": 4, 
        "QF": 8, 
        "SF": 12, 
        "F": 16, 
        "Champion": 0 
    },
    
    # 500 (Сетка 32)
    "LEVEL_500": { 
        "R64": 1, "R48": 1, 
        "R32": 1, 
        "R16": 2, 
        "QF": 4, 
        "SF": 8, 
        "F": 12, 
        "Champion": 0 
    },
    
    # 250 (Сетка 32)
    "LEVEL_250": { 
        "R64": 1, 
        "R32": 1, 
        "R16": 2, 
        "QF": 3, 
        "SF": 4, 
        "F": 6, 
        "Champion": 0 
    },
    
    "DEFAULT": { "R128": 1, "R64": 1, "R32": 2, "R16": 4, "QF": 8, "SF": 16, "F": 32, "Champion": 0 }
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

# Добавили аргумент user_id=None
def calculate_score_for_user(user_picks, true_draws_map, weights, user_id=None):
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
            user_slot = 0
            if pick.predicted_winner == pick.player1: user_slot = 1
            elif pick.predicted_winner == pick.player2: user_slot = 2
            
            winner_slot = 0
            p1_real = normalize_name(match.player1)
            p2_real = normalize_name(match.player2)
            if winner_norm == p1_real: winner_slot = 1
            elif winner_norm == p2_real: winner_slot = 2
            
            if user_slot != 0 and user_slot == winner_slot: is_hit = True
        
        # Определяем баллы
        points = 0
        if is_hit:
            points = weights.get(pick.round, 0)
            score += points
            correct += 1
        
        # === ВЫЗОВ АУДИТА (Всего одна строка!) ===
        # Аудитор сам решит, писать лог или нет (если это тот самый юзер)
        if user_id:
            audit_pick(user_id, pick.round, pick.match_number, pick.predicted_winner, match.winner, points, is_hit)
            
    # === ФИНАЛЬНЫЙ АУДИТ ===
    if user_id:
        audit_summary(user_id, score, correct)

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
        score, correct = calculate_score_for_user(user_picks, true_draws_map, weights, user_id=user_id)
        
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