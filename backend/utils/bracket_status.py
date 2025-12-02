# backend/utils/bracket_status.py

import re
from typing import Dict, Set, List, Any

def normalize_name(name: str) -> str:
    """
    Приводит имя к единому виду для сравнения.
    ВАЖНО: "Bye" остается "bye", чтобы его можно было отличить от "tbd" (отсутствия).
    """
    if not name: return "tbd"
    lower_name = name.lower().strip()
    
    if lower_name == "tbd": return "tbd"
    if lower_name == "bye": return "bye"

    # Убираем содержимое скобок (сеяные номера) и всё кроме букв
    n = re.sub(r'\s*\(.*?\)', '', lower_name)
    n = re.sub(r'[^a-z]', '', n)
    return n if n else "tbd"

def enrich_bracket_with_status(bracket: Dict[str, List[Dict]], true_draws: List) -> Dict[str, List[Dict]]:
    """
    Проходит по сгенерированной сетке и добавляет статусы для каждого матча:
    - status: "CORRECT" | "INCORRECT" | "PENDING" | "NO_PICK"
    - is_eliminated: True (если игрок вылетел на ранней стадии) | False
    """
    
    # 1. Собираем базу знаний о реальности
    eliminated_players: Set[str] = set()
    real_winners_map: Dict[str, str] = {}     # "R16_1" -> "rublev"
    real_match_players: Dict[str, List[str]] = {} # "R16_1" -> ["rublev", "draper"]

    for td in true_draws:
        key = f"{td.round}_{td.match_number}"
        w_norm = normalize_name(td.winner)
        p1_norm = normalize_name(td.player1)
        p2_norm = normalize_name(td.player2)

        if w_norm not in ["tbd", "bye"]:
            real_winners_map[key] = w_norm
            # Кто был в матче, но не выиграл -> вылетел
            if p1_norm not in ["tbd", "bye"] and p1_norm != w_norm: eliminated_players.add(p1_norm)
            if p2_norm not in ["tbd", "bye"] and p2_norm != w_norm: eliminated_players.add(p2_norm)
        
        real_match_players[key] = [p1_norm, p2_norm]

    # 2. Проходим по сетке пользователя
    rounds_order = ["R128", "R64", "R32", "R16", "QF", "SF", "F", "Champion"]
    
    for r_name in rounds_order:
        if r_name not in bracket: continue
        
        matches = bracket[r_name]
        for match in matches:
            match_key = f"{r_name}_{match['match_number']}"
            
            pick_raw = match.get("predicted_winner")
            pick_norm = normalize_name(pick_raw)
            
            real_winner_norm = real_winners_map.get(match_key, "tbd")
            
            status = "PENDING"
            is_eliminated = False
            
            # 1. Если нет прогноза
            if pick_norm == "tbd":
                match["status"] = "NO_PICK"
                match["is_eliminated"] = False
                continue
            
            # 2. Если прогноз BYE (автоматически верно, если в реальности тоже BYE проходит)
            if pick_norm == "bye":
                 match["status"] = "CORRECT" # Bye всегда выигрывает сам у себя
                 match["is_eliminated"] = False
                 continue

            # 3. Матч завершен
            if real_winner_norm != "tbd":
                if pick_norm == real_winner_norm:
                    status = "CORRECT"
                else:
                    status = "INCORRECT"
                    # Если нашего игрока не было в этом матче (вылетел раньше)
                    real_participants = real_match_players.get(match_key, [])
                    if pick_norm not in real_participants:
                        is_eliminated = True
            
            # 4. Матч не завершен, но игрок мог уже вылететь
            else:
                if pick_norm in eliminated_players:
                    status = "INCORRECT"
                    is_eliminated = True
                else:
                    status = "PENDING"

            match["status"] = status
            match["is_eliminated"] = is_eliminated

    return bracket