from typing import Dict, List, Any, Optional
import logging
import re

logger = logging.getLogger(__name__)

def normalize_name(name: Optional[str]) -> str:
    """
    Очищает имя для отправки и СРАВНЕНИЯ.
    '🇪🇸 A. Zverev (1)' -> 'a. zverev'
    """
    if not name or name.lower() == "bye":
        return "tbd"
    
    # 1. Убираем скобки в конце (Seed)
    clean = re.sub(r'\s*\(.*?\)$', '', name)
    
    # 2. Убираем эмодзи и мусор, оставляем буквы, точки, пробелы, дефисы
    # Важно: приводим к нижнему регистру для надежного сравнения
    clean = re.sub(r'[^\w\s\.\-]', '', clean).strip().lower()
    
    return clean if clean else "tbd"

def parse_player(name: Optional[str]) -> Dict[str, Any]:
    """Парсит имя игрока для отображения (красивое)"""
    if not name or name.lower() == "bye":
        return {"name": name or "TBD", "seed": None}
    
    seed = None
    display_name = name

    # Вытаскиваем Seed (1) для UI
    if "(" in name and ")" in name:
        try:
            start = name.rfind("(")
            end = name.rfind(")")
            seed_str = name[start+1:end]
            # Имя для отображения (без сида, но с флагами если есть)
            display_name = name[:start].strip() 
            if seed_str.isdigit():
                seed = int(seed_str)
        except Exception:
            pass
            
    # display_name оставляем красивым (с большой буквы), а normalize будем делать на фронте или в логике
    return {"name": display_name, "seed": seed}

def generate_bracket(tournament, true_draws, user_picks, rounds) -> Dict[str, List[Dict]]:
    bracket = {}
    match_counts = {"R128": 64, "R64": 32, "R32": 16, "R16": 8, "QF": 4, "SF": 2, "F": 1, "Champion": 1}
    
    for round_name in rounds:
        bracket[round_name] = []
        count = match_counts.get(round_name, 0)
        if count == 0: continue

        for match_number in range(1, count + 1):
            # 1. Ищем реальный матч в БД (REALITY)
            true_match = next(
                (m for m in true_draws if m.round == round_name and m.match_number == match_number),
                None
            )
            
            # 2. Ищем прогноз юзера (FANTASY)
            user_pick = next(
                (p for p in user_picks if p.round == round_name and p.match_number == match_number),
                None
            )
            
            predicted_winner = user_pick.predicted_winner if user_pick else None
            
            # Исходные данные из БД
            p1_raw = true_match.player1 if true_match else "TBD"
            p2_raw = true_match.player2 if true_match else "TBD"
            winner_raw = true_match.winner if true_match else None

            # Важно: Счета
            scores = []
            if true_match:
                scores = [s for s in [true_match.set1, true_match.set2, true_match.set3, true_match.set4, true_match.set5] if s]

            match_data = {
                "id": f"{tournament.id}_{round_name}_{match_number}",
                "round": round_name,
                "match_number": match_number,
                
                # Игроки (сырые данные для отображения)
                "player1": parse_player(p1_raw),
                "player2": parse_player(p2_raw),
                
                # Победители (сырые данные)
                "predicted_winner": predicted_winner, 
                "actual_winner": winner_raw, 
                
                "scores": scores
            }
            bracket[round_name].append(match_data)

    return bracket