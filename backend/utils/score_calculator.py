from sqlalchemy.orm import Session
from sqlalchemy import func
from database import models
from utils.audit import audit_summary, TARGET_USER_ID
import re
import logging

logger = logging.getLogger(__name__)

# === СИСТЕМА ОЧКОВ ===
SCORING_SYSTEM = {
    "GRAND_SLAM": { "R128": 1, "R64": 2, "R32": 4, "R16": 8, "QF": 12, "SF": 16, "F": 20, "Champion": 0 },
    "LEVEL_1000": { "R128": 1, "R64": 1, "R32": 2, "R16": 4, "QF": 8, "SF": 12, "F": 16, "Champion": 0 },
    "LEVEL_500": { "R64": 1, "R48": 1, "R32": 1, "R16": 2, "QF": 4, "SF": 8, "F": 12, "Champion": 0 },
    "LEVEL_250": { "R64": 1, "R32": 1, "R16": 2, "QF": 3, "SF": 4, "F": 6, "Champion": 0 },
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
        
        # 1. Проверка по имени
        if pick_norm == winner_norm:
            is_hit = True
        else:
            # 2. Проверка по слоту (страховка на случай LL/Q)
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
            if pick.round != "Champion":
                correct += 1

    return score, correct

def update_tournament_leaderboard(tournament_id: int, db: Session):
    logger.info(f"🚀 START Calculation for Tournament {tournament_id}...")
    
    try:
        tournament = db.query(models.Tournament).filter(models.Tournament.id == tournament_id).first()
        if not tournament:
            logger.error(f"Tournament {tournament_id} not found!")
            return

        weights = get_tournament_weights(tournament)
        
        # Загружаем реальные результаты
        true_draws = db.query(models.TrueDraw).filter_by(tournament_id=tournament_id).all()
        true_draws_map = {(m.round, m.match_number): m for m in true_draws}
        
        # Загружаем пики пользователей
        picks = db.query(models.UserPick).filter_by(tournament_id=tournament_id).all()
        user_picks_map = {}
        for p in picks:
            if p.user_id not in user_picks_map: user_picks_map[p.user_id] = []
            user_picks_map[p.user_id].append(p)
            
        logger.info(f"Calculating scores for {len(user_picks_map)} users...")

        leaderboard_entries = []
        user_score_objects = []

        # СЧИТАЕМ В ПАМЯТИ
        for user_id, user_picks in user_picks_map.items():
            score, correct = calculate_score_for_user(user_picks, true_draws_map, weights, user_id=user_id)
            
            # Обновляем или создаем UserScore (пока по одному, это не так страшно)
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
        
        # Сортировка для рангов
        leaderboard_entries.sort(key=lambda x: (x["score"], x["correct_picks"]), reverse=True)
        
        # === АТОМАРНОЕ ОБНОВЛЕНИЕ ЛИДЕРБОРДА ===
        # Удаляем старое
        db.query(models.Leaderboard).filter_by(tournament_id=tournament_id).delete()
        
        # Создаем новые объекты
        current_rank = 1
        lb_objects = []
        for i, entry in enumerate(leaderboard_entries):
            if i > 0:
                prev = leaderboard_entries[i-1]
                # Плотное ранжирование (1, 1, 2, 3...)
                if entry["score"] != prev["score"] or entry["correct_picks"] != prev["correct_picks"]:
                    current_rank += 1 
            
            lb = models.Leaderboard(
                tournament_id=tournament_id,
                user_id=entry["user_id"],
                rank=current_rank,
                score=entry["score"],
                correct_picks=entry["correct_picks"]
            )
            lb_objects.append(lb)
        
        # Массовая вставка (быстро)
        db.add_all(lb_objects)
        
        # Финальный коммит (все изменения применяются разом)
        db.commit()
        logger.info(f"✅ Leaderboard updated successfully. {len(lb_objects)} rows.")

    except Exception as e:
        logger.error(f"❌ Error calculating scores: {e}")
        db.rollback()