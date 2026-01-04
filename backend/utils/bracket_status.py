import re
import logging
from typing import Dict, Set, List, Any

# Логгер для отладки
logger = logging.getLogger(__name__)

def normalize_name(name: str) -> str:
    """
    Агрессивная нормализация.
    """
    if not name: return "tbd"
    # Нижний регистр
    n = str(name).lower().strip()
    if n == "tbd": return "tbd"
    if n == "bye": return "bye"
    
    # 1. Убираем скобки (1), (Q)
    n = re.sub(r'\s*\(.*?\)', '', n)
    # 2. Оставляем буквы (все языки) и цифры
    n = re.sub(r'[^\w]', '', n)
    # 3. Убираем цифры, если они не часть имени (на всякий случай)
    n = re.sub(r'\d', '', n)
    
    return n if n else "tbd"

def reconstruct_fantasy_bracket(bracket: Dict[str, List[Dict]], user_picks: List) -> Dict[str, List[Dict]]:
    """
    1. Протаскивает победителей по сетке (визуализация).
    2. Сохраняет оригинальные данные прогноза для проверки слотов.
    """
    # Создаем карту прогнозов.
    # user_picks - это список объектов SQLAlchemy или Pydantic моделей.
    # Мы сохраняем ВЕСЬ объект, чтобы потом достать player1/player2.
    picks_map = {}
    for p in user_picks:
        # Безопасное получение атрибутов (работает и с объектами, и со словарями)
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
            
            # --- ЛОГИКА ДЕРЕВА (ПРОТАСКИВАНИЕ) ---
            if r_idx > 0:
                prev_round = rounds_order[r_idx - 1]
                source_1 = (m_num * 2) - 1
                source_2 = (m_num * 2)
                
                fp1 = fantasy_winners.get((prev_round, source_1))
                fp2 = fantasy_winners.get((prev_round, source_2))
                
                # Если победитель прошлого раунда известен, ставим его в этот матч
                if fp1: match['player1']['name'] = fp1
                if fp2: match['player2']['name'] = fp2

            # --- ЛОГИКА ПРОГНОЗА ---
            pick_obj = picks_map.get((r_name, m_num))
            
            # Извлекаем данные безопасно
            predicted = None
            orig_p1 = None
            orig_p2 = None
            
            if pick_obj:
                predicted = getattr(pick_obj, 'predicted_winner', None) or (pick_obj.get('predicted_winner') if isinstance(pick_obj, dict) else None)
                orig_p1 = getattr(pick_obj, 'player1', None) or (pick_obj.get('player1') if isinstance(pick_obj, dict) else None)
                orig_p2 = getattr(pick_obj, 'player2', None) or (pick_obj.get('player2') if isinstance(pick_obj, dict) else None)

            # Сохраняем "исторические" данные для слот-логики (невидимо для фронта)
            match['user_pick_original_p1'] = orig_p1
            match['user_pick_original_p2'] = orig_p2
            
            # Авто-проход BYE (если юзер не выбирал, но соперник BYE)
            p1_curr = match['player1']['name']
            p2_curr = match['player2']['name']
            
            if not predicted:
                if p2_curr and normalize_name(p2_curr) == "bye" and normalize_name(p1_curr) != "tbd": predicted = p1_curr
                elif p1_curr and normalize_name(p1_curr) == "bye" and normalize_name(p2_curr) != "tbd": predicted = p2_curr
            
            if predicted:
                fantasy_winners[(r_name, m_num)] = predicted
                match['predicted_winner'] = predicted
            
            # Логика Чемпиона
            if r_name == "Champion":
                 w_f = fantasy_winners.get(("F", 1))
                 if w_f:
                     match['player1']['name'] = w_f
                     match['predicted_winner'] = w_f

    return bracket

def enrich_bracket_with_status(bracket: Dict[str, List[Dict]], true_draws: List) -> Dict[str, List[Dict]]:
    """
    Раскрашивает сетку (Green/Red/Grey) на основе сравнения Имен И Слотов.
    """
    eliminated_players: Set[str] = set()
    real_winners_map = {}
    real_match_players = {}

    # 1. Собираем реальность
    for td in true_draws:
        # Поддержка и объектов, и словарей (на всякий случай)
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
            # Если игрок был в матче, но не выиграл -> вылетел
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
            
            # Имена из текущей визуализации
            up1_norm = normalize_name(match['player1']['name'])
            up2_norm = normalize_name(match['player2']['name'])
            pick_norm = normalize_name(match.get("predicted_winner"))
            
            # Данные реальности
            real_data = real_match_players.get(match_key)
            rp1_norm = real_data["p1_norm"] if real_data else "tbd"
            rp2_norm = real_data["p2_norm"] if real_data else "tbd"
            real_winner_norm = real_data["w_norm"] if real_data else "tbd"

            # --- СТАТУС СЛОТА ---
            def get_slot_status(u_norm, r_norm):
                if u_norm == "tbd": return "PENDING"
                if u_norm == "bye": return "CORRECT"
                if u_norm == r_norm: return "CORRECT"
                if u_norm in eliminated_players: return "INCORRECT"
                if r_norm == "tbd": return "PENDING"
                # В реальности тут кто-то другой -> значит наш игрок не дошел
                return "INCORRECT"

            p1_stat = get_slot_status(up1_norm, rp1_norm)
            p2_stat = get_slot_status(up2_norm, rp2_norm)

            # --- СТАТУС ПРОГНОЗА (ГАЛОЧКА) ---
            m_stat = "PENDING"
            
            if pick_norm == "tbd": m_stat = "NO_PICK"
            elif pick_norm == "bye": m_stat = "CORRECT"
            elif real_winner_norm != "tbd":
                # Матч завершен. ПРОВЕРЯЕМ СЛОТЫ.
                
                # 1. Какой слот выбрал юзер?
                user_slot = 0
                orig_pick = match.get("predicted_winner")
                orig_p1 = match.get("user_pick_original_p1")
                orig_p2 = match.get("user_pick_original_p2")
                
                # Сравниваем строки
                if orig_pick and orig_p1 and orig_pick == orig_p1: user_slot = 1
                elif orig_pick and orig_p2 and orig_pick == orig_p2: user_slot = 2
                
                # 2. Какой слот выиграл?
                winner_slot = 0
                if real_winner_norm == rp1_norm: winner_slot = 1
                elif real_winner_norm == rp2_norm: winner_slot = 2
                
                # 3. Финальное решение
                if user_slot != 0 and user_slot == winner_slot:
                    # Ура! Слот совпал (даже если имена разные)
                    m_stat = "CORRECT"
                elif pick_norm == real_winner_norm:
                    # Ура! Имя совпало
                    m_stat = "CORRECT"
                else:
                    m_stat = "INCORRECT"
            else:
                # Матч не сыгран
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