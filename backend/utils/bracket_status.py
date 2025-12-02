import re
from typing import Dict, Set, List, Any

def normalize_name(name: str) -> str:
    """
    Приводит имя к единому виду для сравнения:
    "Daniil Medvedev (3)" -> "daniilmedvedev"
    """
    if not name or name.lower() in ["bye", "tbd"]: return "tbd"
    # Убираем содержимое скобок (сеяные номера) и всё кроме букв
    n = re.sub(r'\s*\(.*?\)', '', name)
    n = re.sub(r'[^a-zA-Z]', '', n).lower()
    return n

def enrich_bracket_with_status(bracket: Dict[str, List[Dict]], true_draws: List) -> Dict[str, List[Dict]]:
    """
    Проходит по сгенерированной сетке и добавляет статусы для каждого матча:
    - status: "CORRECT" | "INCORRECT" | "PENDING" | "NO_PICK"
    - is_eliminated: True (если игрок вылетел на ранней стадии) | False
    """
    
    # 1. Собираем базу знаний о реальности
    # Кто вылетел (проиграл любой матч)
    eliminated_players: Set[str] = set()
    # Кто реально выиграл конкретный матч: "R16_1" -> "rublev"
    real_winners_map: Dict[str, str] = {}
    # Кто реально играл в конкретном матче: "R16_1" -> ["rublev", "draper"]
    real_match_players: Dict[str, List[str]] = {}

    for td in true_draws:
        key = f"{td.round}_{td.match_number}"
        w_norm = normalize_name(td.winner)
        p1_norm = normalize_name(td.player1)
        p2_norm = normalize_name(td.player2)

        if w_norm != "tbd":
            real_winners_map[key] = w_norm
            # Логика выбывания: Если игрок был в матче (p1/p2), но winner != player, значит он проиграл.
            if p1_norm != "tbd" and p1_norm != w_norm: eliminated_players.add(p1_norm)
            if p2_norm != "tbd" and p2_norm != w_norm: eliminated_players.add(p2_norm)
        
        real_match_players[key] = [p1_norm, p2_norm]

    # 2. Проходим по сетке пользователя и проставляем статусы
    rounds_order = ["R128", "R64", "R32", "R16", "QF", "SF", "F", "Champion"]
    
    for r_name in rounds_order:
        if r_name not in bracket: continue
        
        matches = bracket[r_name]
        for match in matches:
            match_key = f"{r_name}_{match['match_number']}"
            
            # То, что выбрал юзер (или TBD, если не выбрал)
            pick_raw = match.get("predicted_winner")
            pick_norm = normalize_name(pick_raw)
            
            # Кто выиграл в реальности
            real_winner_norm = real_winners_map.get(match_key, "tbd")
            
            # Значения по умолчанию
            status = "PENDING"
            is_eliminated = False
            
            # --- СЦЕНАРИЙ 1: Нет прогноза (или юзер не участвовал) ---
            if pick_norm == "tbd":
                match["status"] = "NO_PICK"
                match["is_eliminated"] = False
                continue

            # --- СЦЕНАРИЙ 2: Матч завершен (есть победитель) ---
            if real_winner_norm != "tbd":
                if pick_norm == real_winner_norm:
                    status = "CORRECT"
                else:
                    status = "INCORRECT"
                    # Проверяем, "жив" ли еще игрок в этом слоте или вылетел раньше?
                    # Список реальных участников этого матча
                    real_participants = real_match_players.get(match_key, [])
                    
                    # Если нашего игрока ВООБЩЕ не было в этом матче (он вылетел раньше)
                    if pick_norm not in real_participants:
                        is_eliminated = True
                    # Если он был, но проиграл - он вылетел ИМЕННО СЕЙЧАС (не делаем его полупрозрачным, просто красным)
                    # Логика: is_eliminated = True делаем только для "мертвых душ" (фантомов)

            # --- СЦЕНАРИЙ 3: Матч еще не сыгран / не завершен ---
            else:
                # Но игрок мог уже вылететь в предыдущих раундах!
                if pick_norm in eliminated_players:
                    status = "INCORRECT"
                    is_eliminated = True
                else:
                    status = "PENDING"

            match["status"] = status
            match["is_eliminated"] = is_eliminated

    return bracket