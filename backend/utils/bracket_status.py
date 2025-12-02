import re
import logging
from typing import Dict, Set, List, Any

logger = logging.getLogger(__name__)

def normalize_name(name: str) -> str:
    """
    Нормализация имени для сравнения.
    Пример: "A. Zverev (1)" -> "azverev"
    ВАЖНО: "Bye" и "TBD" остаются как есть.
    """
    if not name: return "tbd"
    lower_name = name.lower().strip()
    
    if lower_name == "tbd": return "tbd"
    if lower_name == "bye": return "bye"

    # Убираем содержимое скобок и всё кроме букв
    n = re.sub(r'\s*\(.*?\)', '', lower_name)
    n = re.sub(r'[^a-z]', '', n)
    
    return n if n else "tbd"

def enrich_bracket_with_status(bracket: Dict[str, List[Dict]], true_draws: List) -> Dict[str, List[Dict]]:
    """
    Сравнивает сетку пользователя (bracket) с реальностью (true_draws).
    Заполняет поля player1_status, player2_status, status.
    """
    
    real_winners_map: Dict[str, str] = {}
    # Карта: ключ матча -> [norm_p1, norm_p2, raw_p1, raw_p2]
    real_match_players: Dict[str, List[str]] = {}

    # 1. Собираем данные из реальности (TrueDraw)
    for td in true_draws:
        key = f"{td.round}_{td.match_number}"
        w_norm = normalize_name(td.winner)
        p1_norm = normalize_name(td.player1)
        p2_norm = normalize_name(td.player2)

        if w_norm not in ["tbd", "bye"]:
            real_winners_map[key] = w_norm
        
        # Сохраняем, кто реально попал в этот матч
        real_match_players[key] = [p1_norm, p2_norm, td.player1 or "TBD", td.player2 or "TBD"]

    rounds_order = ["R128", "R64", "R32", "R16", "QF", "SF", "F", "Champion"]
    
    # 2. Проходим по сетке пользователя
    for r_name in rounds_order:
        if r_name not in bracket: continue
        
        matches = bracket[r_name]
        for match in matches:
            match_key = f"{r_name}_{match['match_number']}"
            
            # Имена из фантазии юзера
            user_p1_raw = match['player1']['name']
            user_p2_raw = match['player2']['name']
            user_pick_raw = match.get("predicted_winner")

            up1_norm = normalize_name(user_p1_raw)
            up2_norm = normalize_name(user_p2_raw)
            pick_norm = normalize_name(user_pick_raw)
            
            # Имена из реальности
            # По умолчанию считаем, что в реальности там TBD
            real_data = real_match_players.get(match_key, ["tbd", "tbd", "TBD", "TBD"])
            rp1_norm, rp2_norm = real_data[0], real_data[1]
            rp1_raw, rp2_raw = real_data[2], real_data[3]
            
            real_winner_norm = real_winners_map.get(match_key, "tbd")

            # --- ЛОГИКА 1: СТАТУС УЧАСТНИКОВ (СЛОТОВ) ---
            # Проверяем, совпадает ли игрок в фантазии с игроком в реальности
            
            def get_slot_status(user_norm, real_norm):
                if user_norm == "tbd": return "PENDING"
                if user_norm == "bye": return "CORRECT" # Bye всегда совпадает
                
                # Если в реальности еще неизвестно (TBD), то пока ждем
                if real_norm == "tbd": return "PENDING"
                
                # Если совпало - ЗЕЛЕНЫЙ
                if user_norm == real_norm: return "CORRECT"
                
                # Если не совпало (там другое имя) - КРАСНЫЙ
                return "INCORRECT"

            p1_status = get_slot_status(up1_norm, rp1_norm)
            p2_status = get_slot_status(up2_norm, rp2_norm)

            # --- ЛОГИКА 2: СТАТУС ПРОГНОЗА ПОБЕДИТЕЛЯ (СТРЕЛКИ/ГАЛОЧКИ) ---
            # Это влияет на общую покраску матча, если нужно, и на галочку победителя
            match_status = "PENDING"
            
            if pick_norm == "tbd":
                match_status = "NO_PICK"
            elif pick_norm == "bye":
                match_status = "CORRECT"
            
            # Если матч завершен официально
            elif real_winner_norm != "tbd":
                if pick_norm == real_winner_norm:
                    match_status = "CORRECT"
                else:
                    match_status = "INCORRECT"
            
            # Если матч НЕ завершен, но мы видим, что наш избранник УЖЕ вылетел (слот красный)
            else:
                # На кого мы ставили? На P1 или P2?
                picked_slot_status = "PENDING"
                if pick_norm == up1_norm: picked_slot_status = p1_status
                elif pick_norm == up2_norm: picked_slot_status = p2_status
                
                if picked_slot_status == "INCORRECT":
                    # Мы ставили на Зверева, а в этом слоте уже стоит кто-то другой
                    match_status = "INCORRECT"
                else:
                    match_status = "PENDING"

            # Записываем результаты в объект матча
            match["player1_status"] = p1_status
            match["player2_status"] = p2_status
            
            match["real_player1"] = rp1_raw
            match["real_player2"] = rp2_raw
            
            match["status"] = match_status
            
            # Глобальный статус вылета (для совместимости)
            match["is_eliminated"] = (match_status == "INCORRECT")

            # Логируем R16 для проверки
            if r_name == "R16" and match['match_number'] <= 2:
                 logger.info(f"STATUS R16_{match['match_number']}: UserP1={up1_norm} RealP1={rp1_norm} -> {p1_status}")

    return bracket