from typing import Dict, List, Any, Optional
import logging

logger = logging.getLogger(__name__)

def parse_player(name: Optional[str]) -> Dict[str, Any]:
    """Парсит имя игрока с seed."""
    if not name:
        return {"name": "TBD", "seed": None}
    if name == "Bye":
        return {"name": "Bye", "seed": None}
    
    # Логика парсинга (A. Zverev (1))
    if "(" in name and ")" in name:
        try:
            start = name.rfind("(") + 1
            end = name.rfind(")")
            seed_str = name[start:end]
            name_clean = name[:start-1].strip()
            seed = int(seed_str) if seed_str.isdigit() else None
            return {"name": name_clean, "seed": seed}
        except:
            pass
    return {"name": name, "seed": None}

def generate_bracket(tournament, true_draws, user_picks, rounds) -> Dict[str, List[Dict]]:
    """
    Генерирует полную структуру сетки для всех раундов.
    Если в UserPicks есть данные для будущих раундов, они подставляются.
    """
    bracket = {}
    
    # Определяем количество матчей для каждого раунда
    # Например: R32 -> 16 матчей, R16 -> 8, QF -> 4, SF -> 2, F -> 1
    match_counts = {"R128": 64, "R64": 32, "R32": 16, "R16": 8, "QF": 4, "SF": 2, "F": 1}
    
    current_rounds = rounds # Список раундов, который пришел из router (начиная со starting_round)

    for round_name in current_rounds:
        bracket[round_name] = []
        count = match_counts.get(round_name, 0)
        
        for match_number in range(1, count + 1):
            # 1. Ищем реальный матч (из Google Sheets)
            true_match = next(
                (m for m in true_draws if m.round == round_name and m.match_number == match_number),
                None
            )
            
            # 2. Ищем пик пользователя
            user_pick = next(
                (p for p in user_picks if p.round == round_name and p.match_number == match_number),
                None
            )
            
            # 3. Определяем участников
            # Для первого раунда берем из true_draws, для следующих - они могут быть пустыми (TBD)
            # или заполненными, если пользователь уже сделал выбор в предыдущем раунде (это мы обработаем на фронте, но здесь подготовим слоты)
            
            player1_data = parse_player(true_match.player1 if true_match else "TBD")
            player2_data = parse_player(true_match.player2 if true_match else "TBD")
            
            # Если есть сохраненный пик, используем его
            predicted_winner = user_pick.predicted_winner if user_pick else None
            
            match_data = {
                "id": f"{tournament.id}_{round_name}_{match_number}",
                "round": round_name,
                "match_number": match_number,
                "player1": player1_data,
                "player2": player2_data,
                "predicted_winner": predicted_winner,
                # Добавляем реального победителя для сравнения (если турнир идет/завершен)
                "actual_winner": true_match.winner if true_match else None 
            }
            bracket[round_name].append(match_data)

    return bracket