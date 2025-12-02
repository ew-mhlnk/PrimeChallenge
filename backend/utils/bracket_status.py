import re
import logging
from typing import Dict, Set, List, Any

logger = logging.getLogger(__name__)

def normalize_name(name: str) -> str:
    if not name: return "tbd"
    lower_name = name.lower().strip()
    if lower_name == "tbd": return "tbd"
    if lower_name == "bye": return "bye"
    n = re.sub(r'\s*\(.*?\)', '', lower_name)
    n = re.sub(r'[^a-z]', '', n)
    return n if n else "tbd"

def enrich_bracket_with_status(bracket: Dict[str, List[Dict]], true_draws: List) -> Dict[str, List[Dict]]:
    eliminated_players: Set[str] = set()
    real_winners_map: Dict[str, str] = {}
    real_match_players: Dict[str, List[str]] = {}

    # 1. Сбор данных
    for td in true_draws:
        key = f"{td.round}_{td.match_number}"
        w_norm = normalize_name(td.winner)
        p1_norm = normalize_name(td.player1)
        p2_norm = normalize_name(td.player2)

        if w_norm not in ["tbd", "bye"]:
            real_winners_map[key] = w_norm
            # Кто играл, но не выиграл - вылетел
            if p1_norm not in ["tbd", "bye"] and p1_norm != w_norm: eliminated_players.add(p1_norm)
            if p2_norm not in ["tbd", "bye"] and p2_norm != w_norm: eliminated_players.add(p2_norm)
        
        real_match_players[key] = [p1_norm, p2_norm]

    # 2. Проставление статусов
    rounds_order = ["R128", "R64", "R32", "R16", "QF", "SF", "F", "Champion"]
    
    for r_name in rounds_order:
        if r_name not in bracket: continue
        
        matches = bracket[r_name]
        for match in matches:
            match_key = f"{r_name}_{match['match_number']}"
            pick_raw = match.get("predicted_winner")
            pick_norm = normalize_name(pick_raw)
            
            real_winner_norm = real_winners_map.get(match_key, "tbd")
            
            # Логирование для отладки
            if pick_norm != "tbd" and pick_norm != "bye":
                 logger.info(f"CHECK {match_key}: Pick={pick_norm} RealWinner={real_winner_norm}")

            status = "PENDING"
            is_eliminated = False
            
            if pick_norm == "tbd":
                match["status"] = "NO_PICK"
                match["is_eliminated"] = False
                continue
            
            if pick_norm == "bye":
                 match["status"] = "CORRECT"
                 match["is_eliminated"] = False
                 continue

            if real_winner_norm != "tbd":
                if pick_norm == real_winner_norm:
                    status = "CORRECT"
                else:
                    status = "INCORRECT"
                    real_participants = real_match_players.get(match_key, [])
                    # Если юзер выбрал того, кого даже нет в матче (вылетел раньше)
                    if pick_norm not in real_participants:
                        is_eliminated = True
            else:
                # Матч еще не сыгран
                if pick_norm in eliminated_players:
                    status = "INCORRECT"
                    is_eliminated = True
                else:
                    status = "PENDING"

            match["status"] = status
            match["is_eliminated"] = is_eliminated

    return bracket