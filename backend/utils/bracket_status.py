import re
import logging
from typing import Dict, Set, List, Any

logger = logging.getLogger(__name__)

def normalize_name(name: str) -> str:
    if not name: return "tbd"
    n = str(name).lower().strip()
    if n == "tbd": return "tbd"
    if n == "bye": return "bye"
    n = re.sub(r'\s*\(.*?\)', '', n)
    n = re.sub(r'[^\w]', '', n)
    n = re.sub(r'\d', '', n)
    return n if n else "tbd"

def reconstruct_fantasy_bracket(bracket: Dict[str, List[Dict]], user_picks: List) -> Dict[str, List[Dict]]:
    """
    Строит "Фэнтези-сетку" пользователя.
    ВКЛЮЧАЕТ VISUAL SWAP: Заменяет старые имена (Q/LL) на новые, если слот совпадает.
    """
    picks_map = {}
    for p in user_picks:
        rnd = getattr(p, 'round', None) or p.get('round')
        num = getattr(p, 'match_number', None) or p.get('match_number')
        if rnd and num:
            picks_map[(rnd, num)] = p

    fantasy_winners = {}
    rounds_order = ["R128", "R64", "R32", "R16", "QF", "SF", "F", "Champion"]
    
    # Чтобы Visual Swap работал корректно, нам нужно знать "актуальные" имена в слотах.
    # В bracket (аргумент функции) уже лежат НОВЫЕ имена из true_draw (Хиджиката и т.д.)
    
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
            
            # Исходные данные прогноза (из базы, старые)
            predicted_db = None
            orig_p1 = None
            orig_p2 = None
            
            if pick_obj:
                predicted_db = getattr(pick_obj, 'predicted_winner', None) or (pick_obj.get('predicted_winner') if isinstance(pick_obj, dict) else None)
                orig_p1 = getattr(pick_obj, 'player1', None) or (pick_obj.get('player1') if isinstance(pick_obj, dict) else None)
                orig_p2 = getattr(pick_obj, 'player2', None) or (pick_obj.get('player2') if isinstance(pick_obj, dict) else None)

            # Сохраняем "историю" для статусов
            match['user_pick_original_p1'] = orig_p1
            match['user_pick_original_p2'] = orig_p2
            
            # Текущие имена в сетке (Новые, например "Хиджиката")
            current_p1_name = match['player1']['name']
            current_p2_name = match['player2']['name']

            final_predicted_name = None

            if predicted_db:
                # --- VISUAL SWAP LOGIC ---
                # Если прогноз совпадает с тем, что было в базе (по слоту) - берем НОВОЕ имя
                
                # Слот 1
                if predicted_db == orig_p1:
                    # Юзер выбирал верхнего. Берем имя того, кто СЕЙЧАС сверху.
                    final_predicted_name = current_p1_name
                # Слот 2
                elif predicted_db == orig_p2:
                    # Юзер выбирал нижнего. Берем имя того, кто СЕЙЧАС снизу.
                    final_predicted_name = current_p2_name
                else:
                    # Если слоты не совпали (редкость) или имена совпадают напрямую
                    final_predicted_name = predicted_db
            
            # Авто-проход BYE
            if not final_predicted_name:
                if current_p2_name and normalize_name(current_p2_name) == "bye" and normalize_name(current_p1_name) != "tbd": 
                    final_predicted_name = current_p1_name
                elif current_p1_name and normalize_name(current_p1_name) == "bye" and normalize_name(current_p2_name) != "tbd": 
                    final_predicted_name = current_p2_name
            
            if final_predicted_name:
                fantasy_winners[(r_name, m_num)] = final_predicted_name
                match['predicted_winner'] = final_predicted_name # <--- Подменили!
            
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
        # Поддержка объектов и словарей
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
    start_round_name = None
    for r in rounds_order:
        if r in bracket and len(bracket[r]) > 0:
            start_round_name = r
            break

    for r_name in rounds_order:
        if r_name not in bracket: continue
        
        for match in bracket[r_name]:
            match_key = f"{r_name}_{match['match_number']}"
            
            # ВАЖНО: Тут уже лежит НОВОЕ имя (благодаря reconstruct выше)
            pick_raw = match.get("predicted_winner")
            pick_norm = normalize_name(pick_raw)
            
            up1_norm = normalize_name(match['player1']['name'])
            up2_norm = normalize_name(match['player2']['name'])
            
            real_data = real_match_players.get(match_key)
            rp1_norm = real_data["p1_norm"] if real_data else "tbd"
            rp2_norm = real_data["p2_norm"] if real_data else "tbd"
            real_winner_norm = real_data["w_norm"] if real_data else "tbd"

            # Статус слота
            def get_slot_status(u_norm, r_norm):
                if u_norm == "tbd": return "PENDING"
                if u_norm == "bye": return "CORRECT"
                if u_norm == r_norm: return "CORRECT"
                if u_norm in eliminated_players: return "INCORRECT"
                if r_norm == "tbd": return "PENDING"
                return "INCORRECT"

            p1_stat = get_slot_status(up1_norm, rp1_norm)
            p2_stat = get_slot_status(up2_norm, rp2_norm)

            # Статус матча
            m_stat = "PENDING"
            
            if pick_norm == "tbd": m_stat = "NO_PICK"
            elif pick_norm == "bye": m_stat = "CORRECT"
            elif real_winner_norm != "tbd":
                # Теперь, так как мы подменили pick_norm на новое имя,
                # сравнение по имени (pick_norm == real_winner_norm) должно сработать!
                # Но оставим Slot Logic как страховку.
                
                user_slot = 0
                orig_pick = match.get("predicted_winner") # Это уже новое
                # А вот оригиналы из базы:
                orig_db_p1 = match.get("user_pick_original_p1")
                # Тут сложность: в match['predicted_winner'] уже новое имя,
                # а в user_pick_original_p1 - старое. Сравнивать их нельзя.
                
                # Поэтому мы доверяем нормализации (она уже содержит новое имя)
                if pick_norm == real_winner_norm:
                    m_stat = "CORRECT"
                else:
                    m_stat = "INCORRECT"
            else:
                if pick_norm in eliminated_players: m_stat = "INCORRECT"
                else:
                    if pick_norm == up1_norm and p1_stat == "INCORRECT": m_stat = "INCORRECT"
                    elif pick_norm == up2_norm and p2_stat == "INCORRECT": m_stat = "INCORRECT"
                    else: m_stat = "PENDING"

            match["player1_status"] = p1_stat
            match["player2_status"] = p2_stat
            match["real_player1"] = real_data["real_p1"] if real_data else "TBD"
            match["real_player2"] = real_data["real_p2"] if real_data else "TBD"
            match["status"] = m_stat
            match["is_eliminated"] = (m_stat == "INCORRECT")

    return bracket