from typing import Dict, List, Any, Optional
import logging

logger = logging.getLogger(__name__)

def parse_player_display(name: Optional[str]) -> Dict[str, Any]:
    """
    Возвращает имя для ОТОБРАЖЕНИЯ.
    """
    if not name or name.lower() == "bye":
        return {"name": "Bye", "seed": None}
    
    # Просто возвращаем имя как есть в базе.
    return {"name": name, "seed": None}

def generate_bracket(tournament, true_draws, user_picks, rounds) -> Dict[str, List[Dict]]:
    """
    Генерирует базовую структуру сетки.
    Заполняет начальные значения полей статусов, чтобы Pydantic не ругался.
    """
    bracket = {}
    
    # Создаем карты для быстрого поиска
    draws_map = {(d.round, d.match_number): d for d in true_draws}
    picks_map = {(p.round, p.match_number): p.predicted_winner for p in user_picks}
    
    match_counts = {"R128": 64, "R64": 32, "R32": 16, "R16": 8, "QF": 4, "SF": 2, "F": 1, "Champion": 1}
    
    for round_name in rounds:
        bracket[round_name] = []
        count = match_counts.get(round_name, 0)
        if count == 0: continue

        for match_number in range(1, count + 1):
            true_match = draws_map.get((round_name, match_number))
            user_pick_winner = picks_map.get((round_name, match_number))
            
            p1_raw = true_match.player1 if true_match else "TBD"
            p2_raw = true_match.player2 if true_match else "TBD"
            winner_raw = true_match.winner if true_match else None

            scores = []
            if true_match:
                scores = [s for s in [true_match.set1, true_match.set2, true_match.set3, true_match.set4, true_match.set5] if s]

            # Создаем объект матча с полным набором полей
            match_obj = {
                "id": f"{tournament.id}_{round_name}_{match_number}",
                "round": round_name,
                "match_number": match_number,
                "player1": parse_player_display(p1_raw),
                "player2": parse_player_display(p2_raw),
                "predicted_winner": user_pick_winner,
                "actual_winner": winner_raw,
                "scores": scores,
                
                # --- ВАЖНО: Инициализация полей для логики статусов ---
                "status": "PENDING",
                "player1_status": "PENDING",
                "player2_status": "PENDING",
                "real_player1": p1_raw, # Записываем реальность как базу
                "real_player2": p2_raw,
                "is_eliminated": False
                # -----------------------------------------------------
            }

            bracket[round_name].append(match_obj)

    return bracket