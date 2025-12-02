import re
import logging
from typing import Dict, Set, List, Any

logger = logging.getLogger(__name__)

def normalize_name(name: str) -> str:
    if not name: return "tbd"
    lower_name = name.lower().strip()
    if lower_name == "tbd": return "tbd"
    if lower_name == "bye": return "bye"
    # Убираем всё содержимое скобок и всё кроме букв
    n = re.sub(r'\s*\(.*?\)', '', lower_name)
    n = re.sub(r'[^a-z]', '', n)
    return n if n else "tbd"

def enrich_bracket_with_status(bracket: Dict[str, List[Dict]], true_draws: List) -> Dict[str, List[Dict]]:
    """
    status:
    - CORRECT: Угадал победителя ИЛИ угадал участника матча (проход).
    - INCORRECT: Игрок вылетел.
    - PENDING: Игрок еще в игре, но до этой стадии еще не дошел (будущее).
    """
    
    eliminated_players: Set[str] = set()
    real_winners_map: Dict[str, str] = {}
    real_match_players: Dict[str, List[str]] = {}

    # 1. Собираем факты из реальности
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

    rounds_order = ["R128", "R64", "R32", "R16", "QF", "SF", "F", "Champion"]
    
    for r_name in rounds_order:
        if r_name not in bracket: continue
        
        matches = bracket[r_name]
        for match in matches:
            match_key = f"{r_name}_{match['match_number']}"
            pick_raw = match.get("predicted_winner")
            pick_norm = normalize_name(pick_raw)
            
            real_winner_norm = real_winners_map.get(match_key, "tbd")
            real_participants = real_match_players.get(match_key, [])
            
            # --- ЛОГИРОВАНИЕ ДЛЯ ОТЛАДКИ ---
            if pick_norm not in ["tbd", "bye"]:
                 # Чтобы не спамить, логируем только R16 и выше
                 if r_name not in ["R128", "R64", "R32"]:
                     logger.info(f"STATUS CHECK [{match_key}]: UserPick='{pick_norm}' RealParticipants={real_participants} RealWinner='{real_winner_norm}'")

            status = "PENDING"
            is_eliminated = False
            
            # 1. Нет прогноза
            if pick_norm == "tbd":
                match["status"] = "NO_PICK"
                match["is_eliminated"] = False
                continue
            
            # 2. Прогноз на Bye (всегда верно)
            if pick_norm == "bye":
                 match["status"] = "CORRECT"
                 match["is_eliminated"] = False
                 continue

            # --- ГЛАВНАЯ ЛОГИКА ---

            # A. Игрок ВЫИГРАЛ этот матч? -> CORRECT
            if real_winner_norm != "tbd" and pick_norm == real_winner_norm:
                status = "CORRECT"
            
            # B. Игрок ПРИСУТСТВУЕТ в этом матче? (Дошел до этой стадии) -> CORRECT
            # (Это делает Zverev зеленым в R16, даже если матч не сыгран)
            elif pick_norm in real_participants:
                status = "CORRECT"

            # C. Игрок вылетел РАНЕЕ? -> INCORRECT + Eliminated
            elif pick_norm in eliminated_players:
                status = "INCORRECT"
                is_eliminated = True
            
            # D. Игрок просто не дошел сюда (но может еще играет в прошлом круге - редкий кейс, обычно C ловит)
            # Или это матч будущего, до которого никто не дошел.
            else:
                # Если в реальном матче уже известны оба соперника, и нашего там нет -> INCORRECT
                # (Например, играют Sinner vs Alcaraz, а мы ждали Medvedev)
                if len(real_participants) == 2 and "tbd" not in real_participants:
                     if pick_norm not in real_participants:
                         status = "INCORRECT"
                         is_eliminated = True
                else:
                    status = "PENDING"

            match["status"] = status
            match["is_eliminated"] = is_eliminated

    return bracket