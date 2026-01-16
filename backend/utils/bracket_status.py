import re
import logging
from typing import Dict, Set, List, Any

logger = logging.getLogger(__name__)

def normalize_name(name: str) -> str:
    if not name: return "tbd"
    n = str(name).lower().strip()
    if n == "tbd": return "tbd"
    if n == "bye": return "bye"
    
    # Убираем скобки (1), флаги, спецсимволы
    n = re.sub(r'\s*\(.*?\)', '', n)
    n = re.sub(r'[^\w\s]', '', n)
    n = re.sub(r'\d+', '', n)
    n = n.strip().replace(" ", "")
    
    return n if n else "tbd"

def reconstruct_fantasy_bracket(bracket: Dict[str, List[Dict]], user_picks: List) -> Dict[str, List[Dict]]:
    # ... (Эта функция остается без изменений, она просто рисует имена) ...
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
            
            if r_idx > 0:
                prev_round = rounds_order[r_idx - 1]
                source_1 = (m_num * 2) - 1
                source_2 = (m_num * 2)
                
                fp1 = fantasy_winners.get((prev_round, source_1))
                fp2 = fantasy_winners.get((prev_round, source_2))
                
                if fp1: match['player1']['name'] = fp1
                if fp2: match['player2']['name'] = fp2

            pick_obj = picks_map.get((r_name, m_num))
            predicted_db = None
            orig_p1 = None
            orig_p2 = None

            if pick_obj:
                predicted_db = getattr(pick_obj, 'predicted_winner', None) or (pick_obj.get('predicted_winner') if isinstance(pick_obj, dict) else None)
                orig_p1 = getattr(pick_obj, 'player1', None) or (pick_obj.get('player1') if isinstance(pick_obj, dict) else None)
                orig_p2 = getattr(pick_obj, 'player2', None) or (pick_obj.get('player2') if isinstance(pick_obj, dict) else None)

            current_p1_name = match['player1']['name']
            current_p2_name = match['player2']['name']

            final_predicted_name = None

            if predicted_db:
                db_norm = normalize_name(predicted_db)
                p1_norm = normalize_name(current_p1_name)
                p2_norm = normalize_name(current_p2_name)
                
                if db_norm == p1_norm and p1_norm != "tbd":
                    final_predicted_name = current_p1_name
                elif db_norm == p2_norm and p2_norm != "tbd":
                    final_predicted_name = current_p2_name
                else:
                    user_slot = 0
                    if predicted_db == orig_p1: user_slot = 1
                    elif predicted_db == orig_p2: user_slot = 2
                    
                    if user_slot == 1 and p1_norm != "tbd":
                        final_predicted_name = current_p1_name
                    elif user_slot == 2 and p2_norm != "tbd":
                        final_predicted_name = current_p2_name
                    else:
                        final_predicted_name = predicted_db
            
            if not final_predicted_name:
                if current_p2_name and normalize_name(current_p2_name) == "bye" and normalize_name(current_p1_name) != "tbd": 
                    final_predicted_name = current_p1_name
                elif current_p1_name and normalize_name(current_p1_name) == "bye" and normalize_name(current_p2_name) != "tbd": 
                    final_predicted_name = current_p2_name
            
            if final_predicted_name:
                fantasy_winners[(r_name, m_num)] = final_predicted_name
                match['predicted_winner'] = final_predicted_name 
            
            if r_name == "Champion":
                 w_f = fantasy_winners.get(("F", 1))
                 if w_f:
                     match['player1']['name'] = w_f
                     match['predicted_winner'] = w_f

    return bracket

def enrich_bracket_with_status(bracket: Dict[str, List[Dict]], true_draws: List, user_picks: List) -> Dict[str, List[Dict]]:
    """
    Раскрашивает сетку на основе ИСТОРИИ прогнозов.
    """
    # 1. Готовим карты данных
    # Нам нужны ПОЛНЫЕ объекты пиков, чтобы знать, кто был в слотах 1 и 2
    picks_map = {} 
    for p in user_picks:
        rnd = getattr(p, 'round', None) or p.get('round')
        num = getattr(p, 'match_number', None) or p.get('match_number')
        if rnd and num:
            picks_map[(rnd, num)] = p # Сохраняем весь объект

    real_winners_map = {} 
    real_match_data = {} # Храним данные о реальном матче (кто был p1, p2)
    for td in true_draws:
        rnd = getattr(td, 'round', None) or td.get('round')
        num = getattr(td, 'match_number', None) or td.get('match_number')
        w = getattr(td, 'winner', None) or td.get('winner')
        p1 = getattr(td, 'player1', None) or td.get('player1')
        p2 = getattr(td, 'player2', None) or td.get('player2')
        if rnd and num:
            real_winners_map[(rnd, num)] = normalize_name(w)
            real_match_data[(rnd, num)] = {'p1': normalize_name(p1), 'p2': normalize_name(p2)}

    rounds_order = ["R128", "R64", "R32", "R16", "QF", "SF", "F", "Champion"]
    
    starting_round = None
    for r in rounds_order:
        if r in bracket and len(bracket[r]) > 0:
            starting_round = r
            break

    # === ФУНКЦИЯ ПРОВЕРКИ ИСХОДА ПРЕДЫДУЩЕГО МАТЧА ===
    def check_source_status(r_name, match_num):
        real_w = real_winners_map.get((r_name, match_num))
        
        # 1. Если победитель "Bye" - это авто-проход (Зеленый)
        if real_w == "bye": return "CORRECT"
            
        # 2. Если победителя еще нет - Серый
        if not real_w or real_w == "tbd": return "PENDING"
            
        # 3. Достаем прогноз юзера
        pick_obj = picks_map.get((r_name, match_num))
        user_w_name = None
        if pick_obj:
            user_w_name = getattr(pick_obj, 'predicted_winner', None) or pick_obj.get('predicted_winner')
        
        user_w_norm = normalize_name(user_w_name)

        # 4. Если выбора НЕТ (пусто), а матч завершен -> КРАСНЫЙ
        if not user_w_name or user_w_norm == "tbd":
            return "INCORRECT"
            
        # 5. Сравнение (Логика Слотов + Логика Имен)
        # А. Имена совпали
        if user_w_norm == real_w: return "CORRECT"
        
        # Б. Проверка слотов (для Q/LL и замен)
        # Нам нужно узнать, кого юзер считал P1 и P2, и кто реально был P1 и P2
        # (В упрощенной версии, если имена разные, проверим: "А не угадал ли он слот?")
        
        # Данные из реальной сетки
        real_match = real_match_data.get((r_name, match_num))
        if real_match:
            real_winner_slot = 0
            if real_w == real_match['p1']: real_winner_slot = 1
            elif real_w == real_match['p2']: real_winner_slot = 2
            
            # Данные из прогноза юзера
            user_pick_slot = 0
            u_p1 = getattr(pick_obj, 'player1', None) or pick_obj.get('player1')
            u_p2 = getattr(pick_obj, 'player2', None) or pick_obj.get('player2')
            
            # Сравниваем прогноз юзера с тем, кто был в его карточке
            if user_w_name == u_p1: user_pick_slot = 1
            elif user_w_name == u_p2: user_pick_slot = 2
            
            if user_pick_slot != 0 and user_pick_slot == real_winner_slot:
                return "CORRECT"

        return "INCORRECT"

    for r_idx, r_name in enumerate(rounds_order):
        if r_name not in bracket: continue
        is_start_round = (r_name == starting_round)
        
        for match in bracket[r_name]:
            m_num = match['match_number']
            
            p1_stat = "PENDING"
            p2_stat = "PENDING"
            m_stat = "PENDING"

            if is_start_round:
                # Старт раунд всегда серый (нейтральный)
                pass 
            else:
                prev_round = rounds_order[r_idx - 1]
                # Слот 1 - это победитель верхнего матча из прошлого раунда
                p1_stat = check_source_status(prev_round, (m_num * 2) - 1)
                # Слот 2 - это победитель нижнего матча
                p2_stat = check_source_status(prev_round, (m_num * 2))

            # Логика самого матча (квадратика победителя)
            # Мы проверяем этот же самый матч по той же логике
            if r_name == "Champion":
                m_stat = check_source_status("F", 1)
            else:
                m_stat = check_source_status(r_name, m_num)

            # --- ФИНАЛЬНАЯ ЗАЧИСТКА ---
            # 1. Если это Старт Раунд, мы не красим сам матч (если не Bye)
            if is_start_round:
                pick_raw = match.get("predicted_winner")
                if normalize_name(pick_raw) == "bye":
                    m_stat = "CORRECT"
                else:
                    m_stat = "PENDING"
                    p1_stat = "PENDING"
                    p2_stat = "PENDING"

            match["player1_status"] = p1_stat
            match["player2_status"] = p2_stat
            match["status"] = m_stat
            match["is_eliminated"] = (m_stat == "INCORRECT")

    return bracket