import re
import logging
from typing import Dict, Set, List, Any

logger = logging.getLogger(__name__)

def normalize_name(name: str) -> str:
    """
    Очищает имя от мусора для сравнения.
    Убирает: регистр, пробелы, скобки с посевом (1), флаги (эмодзи) и спецсимволы.
    """
    if not name: return "tbd"
    n = str(name).lower().strip()
    if n == "tbd": return "tbd"
    if n == "bye": return "bye"
    
    # 1. Убираем содержимое скобок (посев, WC, Q)
    n = re.sub(r'\s*\(.*?\)', '', n)
    
    # 2. Убираем ВСЁ, кроме букв (любых языков) и цифр.
    # Это удалит эмодзи флагов 🇺🇦, точки, запятые.
    n = re.sub(r'[^\w\s]', '', n)
    
    # 3. Убираем лишние пробелы и цифры (если остались)
    n = re.sub(r'\d+', '', n)
    n = n.strip().replace(" ", "")
    
    return n if n else "tbd"

def reconstruct_fantasy_bracket(bracket: Dict[str, List[Dict]], user_picks: List) -> Dict[str, List[Dict]]:
    """
    Строит "Фэнтези-сетку" пользователя.
    Логика:
    1. Протаскиваем победителей по дереву.
    2. Если есть прогноз юзера - подставляем его.
    3. VISUAL SWAP: Если прогноз совпадает с реальным игроком (даже с флагом), берем красивое имя из сетки.
    """
    picks_map = {}
    for p in user_picks:
        rnd = getattr(p, 'round', None) or p.get('round')
        num = getattr(p, 'match_number', None) or p.get('match_number')
        if rnd and num:
            picks_map[(rnd, num)] = p

    fantasy_winners = {}
    rounds_order = ["R128", "R64", "R32", "R16", "QF", "SF", "F", "Champion"]
    
    for r_idx, r_name in enumerate(rounds_order):
        if r_name not in bracket: continue
        matches = bracket[r_name]
        
        for match in matches:
            m_num = match['match_number']
            
            # --- 1. Протаскивание (Логика дерева) ---
            if r_idx > 0:
                prev_round = rounds_order[r_idx - 1]
                source_1 = (m_num * 2) - 1
                source_2 = (m_num * 2)
                
                fp1 = fantasy_winners.get((prev_round, source_1))
                fp2 = fantasy_winners.get((prev_round, source_2))
                
                if fp1: match['player1']['name'] = fp1
                if fp2: match['player2']['name'] = fp2

            # --- 2. Обработка Прогноза ---
            pick_obj = picks_map.get((r_name, m_num))
            
            predicted_db = None
            if pick_obj:
                predicted_db = getattr(pick_obj, 'predicted_winner', None) or (pick_obj.get('predicted_winner') if isinstance(pick_obj, dict) else None)

            # Текущие имена в сетке (уже обновленные протаскиванием)
            current_p1_name = match['player1']['name']
            current_p2_name = match['player2']['name']

            final_predicted_name = None

            if predicted_db:
                # Нормализуем для сравнения (чтобы Костюк == 🇺🇦 Костюк)
                db_norm = normalize_name(predicted_db)
                p1_norm = normalize_name(current_p1_name)
                p2_norm = normalize_name(current_p2_name)
                
                # Попытка 1: Прямое совпадение имени (самое надежное)
                if db_norm == p1_norm and p1_norm != "tbd":
                    final_predicted_name = current_p1_name
                elif db_norm == p2_norm and p2_norm != "tbd":
                    final_predicted_name = current_p2_name
                else:
                    # Попытка 2 (FallBack): Если имя в базе не совпадает с тем, кто в сетке
                    # (например, из-за ошибки в Гугл таблице или смены фамилии)
                    # Мы всё равно форсируем имя из прогноза, чтобы юзер видел свой выбор!
                    final_predicted_name = predicted_db
            
            # Авто-проход BYE
            if not final_predicted_name:
                if current_p2_name and normalize_name(current_p2_name) == "bye" and normalize_name(current_p1_name) != "tbd": 
                    final_predicted_name = current_p1_name
                elif current_p1_name and normalize_name(current_p1_name) == "bye" and normalize_name(current_p2_name) != "tbd": 
                    final_predicted_name = current_p2_name
            
            if final_predicted_name:
                fantasy_winners[(r_name, m_num)] = final_predicted_name
                match['predicted_winner'] = final_predicted_name 
            
            # Champion logic
            if r_name == "Champion":
                 w_f = fantasy_winners.get(("F", 1))
                 if w_f:
                     match['player1']['name'] = w_f
                     match['predicted_winner'] = w_f

    return bracket

def enrich_bracket_with_status(bracket: Dict[str, List[Dict]], true_draws: List) -> Dict[str, List[Dict]]:
    """
    Раскрашивает сетку (Green/Red/Grey).
    """
    eliminated_players: Set[str] = set()
    real_winners_map = {}
    real_match_players = {}

    for td in true_draws:
        winner = getattr(td, 'winner', None) or (td.get('winner') if isinstance(td, dict) else None)
        p1 = getattr(td, 'player1', None) or (td.get('player1') if isinstance(td, dict) else None)
        p2 = getattr(td, 'player2', None) or (td.get('player2') if isinstance(td, dict) else None)
        rnd = getattr(td, 'round', None) or (td.get('round') if isinstance(td, dict) else None)
        mn = getattr(td, 'match_number', None) or (td.get('match_number') if isinstance(td, dict) else None)

        key = f"{rnd}_{mn}"
        w_norm = normalize_name(winner)
        p1_norm = normalize_name(p1)
        p2_norm = normalize_name(p2)

        if w_norm not in ["tbd", "bye"]:
            real_winners_map[key] = w_norm
            if p1_norm not in ["tbd", "bye"] and p1_norm != w_norm: eliminated_players.add(p1_norm)
            if p2_norm not in ["tbd", "bye"] and p2_norm != w_norm: eliminated_players.add(p2_norm)
        
        real_match_players[key] = {
            "p1_norm": p1_norm, "p2_norm": p2_norm, "w_norm": w_norm,
            "real_p1": p1, "real_p2": p2
        }

    rounds_order = ["R128", "R64", "R32", "R16", "QF", "SF", "F", "Champion"]

    for r_name in rounds_order:
        if r_name not in bracket: continue
        
        for match in bracket[r_name]:
            match_key = f"{r_name}_{match['match_number']}"
            
            pick_raw = match.get("predicted_winner")
            pick_norm = normalize_name(pick_raw)
            
            up1_norm = normalize_name(match['player1']['name'])
            up2_norm = normalize_name(match['player2']['name'])
            
            real_data = real_match_players.get(match_key)
            rp1_norm = real_data["p1_norm"] if real_data else "tbd"
            rp2_norm = real_data["p2_norm"] if real_data else "tbd"
            real_winner_norm = real_data["w_norm"] if real_data else "tbd"

            # Статус слота (Игрок еще в игре или вылетел?)
            def get_slot_status(u_norm, r_norm):
                if u_norm == "tbd": return "PENDING"
                if u_norm == "bye": return "CORRECT"
                if u_norm == r_norm: return "CORRECT"
                if u_norm in eliminated_players: return "INCORRECT"
                if r_norm == "tbd": return "PENDING"
                return "INCORRECT"

            p1_stat = get_slot_status(up1_norm, rp1_norm)
            p2_stat = get_slot_status(up2_norm, rp2_norm)

            # Статус матча (Угадал победителя или нет?)
            m_stat = "PENDING"
            
            if pick_norm == "tbd": m_stat = "NO_PICK"
            elif pick_norm == "bye": m_stat = "CORRECT"
            elif real_winner_norm != "tbd":
                if pick_norm == real_winner_norm:
                    m_stat = "CORRECT"
                else:
                    m_stat = "INCORRECT"
            else:
                if pick_norm in eliminated_players: m_stat = "INCORRECT"
                else:
                    # Если игрок, которого мы выбрали, стоит не в том слоте, где он в реальности - это не ошибка, 
                    # это просто фэнтези. Ошибка только если он eliminated.
                    m_stat = "PENDING"

            match["player1_status"] = p1_stat
            match["player2_status"] = p2_stat
            match["real_player1"] = real_data["real_p1"] if real_data else "TBD"
            match["real_player2"] = real_data["real_p2"] if real_data else "TBD"
            match["status"] = m_stat
            match["is_eliminated"] = (m_stat == "INCORRECT")

    return bracket