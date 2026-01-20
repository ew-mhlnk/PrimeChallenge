from sqlalchemy.orm import Session
from sqlalchemy import text
from database import models
from datetime import datetime
import re
import logging
import time

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
    start_time = time.time()
    # logger.info(f"🚀 [T{tournament_id}] Calculating scores...")
    
    try:
        # 1. Загружаем данные
        tournament = db.query(models.Tournament).filter(models.Tournament.id == tournament_id).first()
        if not tournament: return

        weights = get_tournament_weights(tournament)
        true_draws = db.query(models.TrueDraw).filter_by(tournament_id=tournament_id).all()
        
        # === 🛡️ ПРЕДОХРАНИТЕЛЬ (SAFETY VALVE) ===
        # Проверяем, есть ли вообще победители в базе
        winners_count = sum(1 for m in true_draws if m.winner)
        
        # Если победителей нет, А турнир уже идет (или завершен)
        # Значит, данные "сломались" или не загрузились.
        # МЫ ЗАПРЕЩАЕМ ОБНУЛЯТЬ ОЧКИ.
        status_str = str(tournament.status.value if hasattr(tournament.status, 'value') else tournament.status)
        
        if winners_count == 0 and status_str in ["ACTIVE", "COMPLETED", "CLOSED"]:
            logger.warning(f"⚠️ [T{tournament_id}] SAFETY STOP: No winners found in DB, but tournament is {status_str}. Skipping update to prevent zeroing scores.")
            return
        # ========================================

        true_draws_map = {(m.round, m.match_number): m for m in true_draws}
        picks = db.query(models.UserPick).filter_by(tournament_id=tournament_id).all()
        
        user_picks_map = {}
        for p in picks:
            if p.user_id not in user_picks_map: user_picks_map[p.user_id] = []
            user_picks_map[p.user_id].append(p)
            
        # 2. Считаем очки
        leaderboard_data = []
        user_score_updates = []
        now_time = datetime.now()

        for user_id, user_picks in user_picks_map.items():
            score, correct = calculate_score_for_user(user_picks, true_draws_map, weights)
            
            leaderboard_data.append({
                "user_id": user_id,
                "score": score,
                "correct_picks": correct
            })
            
            user_score_updates.append({
                "user_id": user_id,
                "tournament_id": tournament_id,
                "score": score,
                "correct_picks": correct,
                "updated_at": now_time
            })

        leaderboard_data.sort(key=lambda x: (x["score"], x["correct_picks"]), reverse=True)
        
        # 3. Готовим данные
        final_leaderboard_rows = []
        current_rank = 1
        for i, entry in enumerate(leaderboard_data):
            if i > 0:
                prev = leaderboard_data[i-1]
                if entry["score"] != prev["score"] or entry["correct_picks"] != prev["correct_picks"]:
                    current_rank += 1 
            
            final_leaderboard_rows.append({
                "tournament_id": tournament_id,
                "user_id": entry["user_id"],
                "rank": current_rank,
                "score": entry["score"],
                "correct_picks": entry["correct_picks"],
                "updated_at": now_time
            })

        # 4. ЗАПИСЬ (Только если проверки пройдены)
        db.execute(text("DELETE FROM leaderboard WHERE tournament_id = :tid"), {"tid": tournament_id})
        if final_leaderboard_rows:
            db.bulk_insert_mappings(models.Leaderboard, final_leaderboard_rows)

        db.execute(text("DELETE FROM user_scores WHERE tournament_id = :tid"), {"tid": tournament_id})
        if user_score_updates:
            db.bulk_insert_mappings(models.UserScore, user_score_updates)

        db.commit()
        
        elapsed = time.time() - start_time
        logger.info(f"✅ [T{tournament_id}] Updated {len(final_leaderboard_rows)} rows in {elapsed:.2f}s")

    except Exception as e:
        logger.error(f"❌ Calculation Error: {e}")
        db.rollback()