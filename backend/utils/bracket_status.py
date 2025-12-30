import re
import logging
from typing import Dict, Set, List, Any

# Используем print для гарантированного вывода в логи Render
def debug_log(msg):
    print(f"[DEBUG_BRACKET] {msg}", flush=True)

def normalize_name(name: str) -> str:
    """
    Агрессивная нормализация для сравнения.
    """
    if not name: return "tbd"
    lower_name = name.lower().strip()
    if lower_name == "tbd": return "tbd"
    if lower_name == "bye": return "bye"
    
    # 1. Убираем (1), (WC), (Q)
    n = re.sub(r'\s*\(.*?\)', '', lower_name)
    # 2. Убираем ВСЁ кроме букв. 'A. Zverev' -> 'azverev'
    n = re.sub(r'[^a-z]', '', n)
    
    return n if n else "tbd"

def reconstruct_fantasy_bracket(bracket: Dict[str, List[Dict]], user_picks: List) -> Dict[str, List[Dict]]:
    """
    Заменяет имена в сетке на выбор пользователя (Симуляция).
    """
    picks_map = {(p.round, p.match_number): p.predicted_winner for p in user_picks}
    fantasy_winners = {}
    rounds_order = ["R128", "R64", "R32", "R16", "QF", "SF", "F", "Champion"]
    
    for r_idx, r_name in enumerate(rounds_order):
        if r_name not in bracket: continue
        matches = bracket[r_name]
        
        for match in matches:
            m_num = match['match_number']
            
            # 1. Протаскивание победителей из прошлого раунда
            if r_idx > 0:
                prev_round = rounds_order[r_idx - 1]
                source_1 = (m_num * 2) - 1
                source_2 = (m_num * 2)
                
                fp1 = fantasy_winners.get((prev_round, source_1))
                fp2 = fantasy_winners.get((prev_round, source_2))
                
                if fp1: match['player1']['name'] = fp1
                if fp2: match['player2']['name'] = fp2

            # 2. Определение победителя матча в фантазии
            predicted = picks_map.get((r_name, m_num))
            
            # Авто-проход BYE
            p1 = match['player1']['name']
            p2 = match['player2']['name']
            if not predicted:
                if p2 and p2.lower() == "bye" and p1 != "TBD": predicted = p1
                elif p1 and p1.lower() == "bye" and p2 != "TBD": predicted = p2
            
            if predicted:
                fantasy_winners[(r_name, m_num)] = predicted
            
            # Champion logic
            if r_name == "Champion":
                 w_f = fantasy_winners.get(("F", 1))
                 if w_f:
                     match['player1']['name'] = w_f
                     match['predicted_winner'] = w_f

    return bracket

def enrich_bracket_with_status(bracket: Dict[str, List[Dict]], true_draws: List) -> Dict[str, List[Dict]]:
    """
    Сравнивает фантазию с реальностью и ставит статусы.
    """
    eliminated_players: Set[str] = set()
    real_winners_map = {}
    real_match_players = {}

    # 1. Собираем реальность
    for td in true_draws:
        key = f"{td.round}_{td.match_number}"
        w_norm = normalize_name(td.winner)
        p1_norm = normalize_name(td.player1)
        p2_norm = normalize_name(td.player2)

        if w_norm not in ["tbd", "bye"]:
            real_winners_map[key] = w_norm
            # Логика вылета: Если игрок был в матче, но не выиграл -> он вылетел
            if p1_norm not in ["tbd", "bye"] and p1_norm != w_norm: eliminated_players.add(p1_norm)
            if p2_norm not in ["tbd", "bye"] and p2_norm != w_norm: eliminated_players.add(p2_norm)
        
        real_match_players[key] = [p1_norm, p2_norm, td.player1 or "TBD", td.player2 or "TBD"]

    rounds_order = ["R128", "R64", "R32", "R16", "QF", "SF", "F", "Champion"]
    
    # --- FIX: ОПРЕДЕЛЯЕМ ПЕРВЫЙ РАУНД ---
    # Находим самый ранний раунд, который есть в сетке (обычно R32 или R64)
    # Для этого раунда мы НЕ будем красить ячейки в зеленый/красный, так как это стартовая позиция.
    start_round_name = None
    for r in rounds_order:
        if r in bracket and len(bracket[r]) > 0:
            start_round_name = r
            break
    # ------------------------------------

    for r_name in rounds_order:
        if r_name not in bracket: continue
        
        # Флаг: является ли этот раунд стартовым
        is_start_round = (r_name == start_round_name)

        for match in bracket[r_name]:
            match_key = f"{r_name}_{match['match_number']}"
            
            # Данные Фантазии
            up1_raw = match['player1']['name']
            up2_raw = match['player2']['name']
            pick_raw = match.get("predicted_winner")

            up1_norm = normalize_name(up1_raw)
            up2_norm = normalize_name(up2_raw)
            pick_norm = normalize_name(pick_raw)
            
            # Данные Реальности
            real_data = real_match_players.get(match_key, ["tbd", "tbd", "TBD", "TBD"])
            rp1_norm, rp2_norm = real_data[0], real_data[1]
            real_winner_norm = real_winners_map.get(match_key, "tbd")

            # --- СТАТУС СЛОТОВ (ИГРОКОВ) ---
            def get_status(u_norm, r_norm):
                if u_norm == "tbd": return "PENDING"
                if u_norm == "bye": return "CORRECT"
                
                # --- FIX: Если это первый раунд, статус всегда НЕЙТРАЛЬНЫЙ ---
                # (Frontend отрисует его синим, если это выбор юзера, или серым)
                if is_start_round: return "PENDING"
                # -------------------------------------------------------------

                # 1. Если совпало с реальностью в этом слоте (игрок прошел сюда)
                if u_norm == r_norm: return "CORRECT"
                
                # 2. Если игрок УЖЕ ВЫЛЕТЕЛ (в любом прошлом матче)
                if u_norm in eliminated_players: return "INCORRECT"
                
                # 3. Если в реальности тут пусто, а игрок жив -> Ждем
                if r_norm == "tbd": return "PENDING"
                
                # 4. Если в реальности тут стоит КТО-ТО ДРУГОЙ -> Неверно
                return "INCORRECT"

            p1_stat = get_status(up1_norm, rp1_norm)
            p2_stat = get_status(up2_norm, rp2_norm)

            # --- СТАТУС МАТЧА (ГАЛОЧКА) ---
            # Галочку оставляем работать даже в первом раунде (угадал победителя или нет)
            m_stat = "PENDING"
            if pick_norm == "tbd": m_stat = "NO_PICK"
            elif pick_norm == "bye": m_stat = "CORRECT"
            elif real_winner_norm != "tbd":
                if pick_norm == real_winner_norm: m_stat = "CORRECT"
                else: m_stat = "INCORRECT"
            else:
                if pick_norm in eliminated_players:
                    m_stat = "INCORRECT"
                else:
                    target_stat = "PENDING"
                    if pick_norm == up1_norm: target_stat = p1_stat
                    elif pick_norm == up2_norm: target_stat = p2_stat
                    
                    # Если в первом раунде статус PENDING (из-за фикса выше), 
                    # то статус матча тоже PENDING пока матч не сыгран.
                    if target_stat == "INCORRECT": m_stat = "INCORRECT"
                    else: m_stat = "PENDING"

            match["player1_status"] = p1_stat
            match["player2_status"] = p2_stat
            match["real_player1"] = real_data[2]
            match["real_player2"] = real_data[3]
            match["status"] = m_stat
            match["is_eliminated"] = (m_stat == "INCORRECT")

    return bracket