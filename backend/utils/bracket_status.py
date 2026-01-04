import re
import logging
from typing import Dict, Set, List, Any

def normalize_name(name: str) -> str:
    if not name: return "tbd"
    lower_name = name.lower().strip()
    if lower_name == "tbd": return "tbd"
    if lower_name == "bye": return "bye"
    
    # Очистка от мусора
    n = re.sub(r'\s*\(.*?\)', '', lower_name)
    n = re.sub(r'[^\w]', '', n)
    return n if n else "tbd"

def reconstruct_fantasy_bracket(bracket: Dict[str, List[Dict]], user_picks: List) -> Dict[str, List[Dict]]:
    picks_map = {(p.round, p.match_number): p.predicted_winner for p in user_picks}
    fantasy_winners = {}
    rounds_order = ["R128", "R64", "R32", "R16", "QF", "SF", "F", "Champion"]
    
    for r_idx, r_name in enumerate(rounds_order):
        if r_name not in bracket: continue
        matches = bracket[r_name]
        
        for match in matches:
            m_num = match['match_number']
            
            if r_idx > 0:
                prev_round = rounds_order[r_idx - 1]
                s1, s2 = (m_num * 2) - 1, m_num * 2
                fp1 = fantasy_winners.get((prev_round, s1))
                fp2 = fantasy_winners.get((prev_round, s2))
                if fp1: match['player1']['name'] = fp1
                if fp2: match['player2']['name'] = fp2

            predicted = picks_map.get((r_name, m_num))
            
            p1 = match['player1']['name']
            p2 = match['player2']['name']
            if not predicted:
                if p2 and "bye" in p2.lower() and p1 != "TBD": predicted = p1
                elif p1 and "bye" in p1.lower() and p2 != "TBD": predicted = p2
            
            if predicted:
                fantasy_winners[(r_name, m_num)] = predicted
            
            if r_name == "Champion":
                 w_f = fantasy_winners.get(("F", 1))
                 if w_f:
                     match['player1']['name'] = w_f
                     match['predicted_winner'] = w_f

    return bracket

def enrich_bracket_with_status(bracket: Dict[str, List[Dict]], true_draws: List) -> Dict[str, List[Dict]]:
    eliminated_players: Set[str] = set()
    real_winners_map = {}
    real_match_players = {}

    for td in true_draws:
        key = f"{td.round}_{td.match_number}"
        w_norm = normalize_name(td.winner)
        p1_norm = normalize_name(td.player1)
        p2_norm = normalize_name(td.player2)

        if w_norm not in ["tbd", "bye"]:
            real_winners_map[key] = w_norm
            if p1_norm and p1_norm not in ["tbd", "bye"] and p1_norm != w_norm: eliminated_players.add(p1_norm)
            if p2_norm and p2_norm not in ["tbd", "bye"] and p2_norm != w_norm: eliminated_players.add(p2_norm)
        
        real_match_players[key] = [p1_norm, p2_norm, td.player1, td.player2]

    rounds_order = ["R128", "R64", "R32", "R16", "QF", "SF", "F", "Champion"]
    
    for r_name in rounds_order:
        if r_name not in bracket: continue
        
        for match in bracket[r_name]:
            match_key = f"{r_name}_{match['match_number']}"
            
            up1_raw = match['player1']['name']
            up2_raw = match['player2']['name']
            pick_raw = match.get("predicted_winner")

            up1_norm = normalize_name(up1_raw)
            up2_norm = normalize_name(up2_raw)
            pick_norm = normalize_name(pick_raw)
            
            real_data = real_match_players.get(match_key, ["tbd", "tbd", "TBD", "TBD"])
            rp1_norm, rp2_norm = real_data[0], real_data[1]
            real_winner_norm = real_winners_map.get(match_key, "tbd")

            # --- СТАТУС СЛОТОВ ---
            def get_slot_status(u_norm, r_norm):
                if u_norm in ["tbd", "bye", ""]: return "PENDING"
                
                # УДАЛИЛИ ПРОВЕРКУ ПЕРВОГО РАУНДА ТУТ!
                
                # 1. Совпадение (Зеленый)
                if u_norm == r_norm: return "CORRECT"
                
                # 2. Вылетел (Красный)
                if u_norm in eliminated_players: return "INCORRECT"
                
                # 3. Еще не ясно (Серый)
                if r_norm == "tbd": return "PENDING"
                
                # 4. Тут стоит кто-то другой (Красный)
                return "INCORRECT"

            p1_stat = get_slot_status(up1_norm, rp1_norm)
            p2_stat = get_slot_status(up2_norm, rp2_norm)

            m_stat = "PENDING"
            if pick_norm in ["tbd", "", "bye"]: m_stat = "NO_PICK"
            elif real_winner_norm != "tbd":
                if pick_norm == real_winner_norm: m_stat = "CORRECT"
                else: m_stat = "INCORRECT"
            else:
                if pick_norm in eliminated_players: m_stat = "INCORRECT"
                else: m_stat = "PENDING"

            match["player1_status"] = p1_stat
            match["player2_status"] = p2_stat
            match["real_player1"] = real_data[2]
            match["real_player2"] = real_data[3]
            match["status"] = m_stat
            match["is_eliminated"] = (m_stat == "INCORRECT")

    return bracket