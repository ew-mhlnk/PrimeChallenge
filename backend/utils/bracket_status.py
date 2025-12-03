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

# --- НОВАЯ ФУНКЦИЯ: СИМУЛЯЦИЯ ---
def reconstruct_fantasy_bracket(bracket: Dict[str, List[Dict]], user_picks: List) -> Dict[str, List[Dict]]:
    """
    Модифицирует объект bracket IN-PLACE.
    Переписывает player1/player2 в раундах R16+, основываясь на выборах юзера в прошлых раундах.
    """
    # Карта выборов: (round, match_num) -> Имя победителя
    picks_map = {(p.round, p.match_number): p.predicted_winner for p in user_picks}
    
    # Хранилище: кто прошел в следующий круг по мнению юзера
    # (round, match_num) -> Имя победителя
    fantasy_winners = {}

    rounds_order = ["R128", "R64", "R32", "R16", "QF", "SF", "F", "Champion"]
    
    for r_idx, r_name in enumerate(rounds_order):
        if r_name not in bracket: continue
        
        matches = bracket[r_name]
        for match in matches:
            m_num = match['match_number']
            
            # 1. ОБНОВЛЯЕМ УЧАСТНИКОВ (Только для раундов, которые зависят от предыдущих)
            # Первый раунд в bracket (например R32) не трогаем, там участники реальные.
            # Но если это R16, то участники приходят из R32.
            
            # Чтобы понять, первый ли это раунд в текущей сетке, проверим индекс
            # Но надежнее проверить: есть ли данные в fantasy_winners для предыдущего раунда
            if r_idx > 0:
                prev_round = rounds_order[r_idx - 1]
                
                # Формула: Матч M берет победителей из матчей (2M-1) и (2M)
                source_1 = (m_num * 2) - 1
                source_2 = (m_num * 2)
                
                # Пытаемся найти фэнтези-победителей
                fantasy_p1 = fantasy_winners.get((prev_round, source_1))
                fantasy_p2 = fantasy_winners.get((prev_round, source_2))
                
                # Если нашли - ЗАМЕНЯЕМ имена в сетке на фантазию!
                # Именно это сделает так, что в R16 будет стоять Нишиока
                if fantasy_p1:
                    match['player1']['name'] = fantasy_p1
                if fantasy_p2:
                    match['player2']['name'] = fantasy_p2

            # 2. ОПРЕДЕЛЯЕМ ПОБЕДИТЕЛЯ ЭТОГО МАТЧА (ДЛЯ БУДУЩЕГО)
            # Берем из пиков
            predicted = picks_map.get((r_name, m_num))
            
            # Логика авто-прохода BYE (если юзер не кликал, но там Bye)
            p1_curr = match['player1']['name']
            p2_curr = match['player2']['name']
            
            if not predicted:
                if p2_curr and p2_curr.lower() == "bye" and p1_curr != "TBD":
                    predicted = p1_curr
                elif p1_curr and p1_curr.lower() == "bye" and p2_curr != "TBD":
                    predicted = p2_curr
            
            if predicted:
                fantasy_winners[(r_name, m_num)] = predicted
                
            # Для Чемпиона особый случай
            if r_name == "Champion":
                 # Он берет победителя финала
                 winner_f = fantasy_winners.get(("F", 1))
                 if winner_f:
                     match['player1']['name'] = winner_f
                     match['predicted_winner'] = winner_f

    return bracket

# --- ФУНКЦИЯ СРАВНЕНИЯ (Уже знакомая) ---
def enrich_bracket_with_status(bracket: Dict[str, List[Dict]], true_draws: List) -> Dict[str, List[Dict]]:
    
    real_winners_map: Dict[str, str] = {}
    real_match_players: Dict[str, List[str]] = {}

    for td in true_draws:
        key = f"{td.round}_{td.match_number}"
        w_norm = normalize_name(td.winner)
        p1_norm = normalize_name(td.player1)
        p2_norm = normalize_name(td.player2)

        if w_norm not in ["tbd", "bye"]:
            real_winners_map[key] = w_norm
        
        real_match_players[key] = [p1_norm, p2_norm, td.player1 or "TBD", td.player2 or "TBD"]

    rounds_order = ["R128", "R64", "R32", "R16", "QF", "SF", "F", "Champion"]
    
    for r_name in rounds_order:
        if r_name not in bracket: continue
        
        matches = bracket[r_name]
        for match in matches:
            match_key = f"{r_name}_{match['match_number']}"
            
            user_p1_raw = match['player1']['name']
            user_p2_raw = match['player2']['name']
            user_pick_raw = match.get("predicted_winner")

            up1_norm = normalize_name(user_p1_raw)
            up2_norm = normalize_name(user_p2_raw)
            pick_norm = normalize_name(user_pick_raw)
            
            real_data = real_match_players.get(match_key, ["tbd", "tbd", "TBD", "TBD"])
            rp1_norm, rp2_norm = real_data[0], real_data[1]
            rp1_raw, rp2_raw = real_data[2], real_data[3]
            
            real_winner_norm = real_winners_map.get(match_key, "tbd")

            # --- СТАТУС УЧАСТНИКОВ ---
            def get_slot_status(user_norm, real_norm):
                if user_norm == "tbd": return "PENDING"
                if user_norm == "bye": return "CORRECT"
                if real_norm == "tbd": return "PENDING"
                
                if user_norm == real_norm: return "CORRECT"
                return "INCORRECT"

            p1_status = get_slot_status(up1_norm, rp1_norm)
            p2_status = get_slot_status(up2_norm, rp2_norm)

            # --- СТАТУС МАТЧА ---
            match_status = "PENDING"
            
            if pick_norm == "tbd": match_status = "NO_PICK"
            elif pick_norm == "bye": match_status = "CORRECT"
            elif real_winner_norm != "tbd":
                if pick_norm == real_winner_norm: match_status = "CORRECT"
                else: match_status = "INCORRECT"
            else:
                picked_slot_status = "PENDING"
                if pick_norm == up1_norm: picked_slot_status = p1_status
                elif pick_norm == up2_norm: picked_slot_status = p2_status
                
                if picked_slot_status == "INCORRECT": match_status = "INCORRECT"
                else: match_status = "PENDING"

            match["player1_status"] = p1_status
            match["player2_status"] = p2_status
            match["real_player1"] = rp1_raw
            match["real_player2"] = rp2_raw
            match["status"] = match_status
            match["is_eliminated"] = (match_status == "INCORRECT")

    return bracket