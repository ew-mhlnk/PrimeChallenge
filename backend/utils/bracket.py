from typing import Dict, List, Any, Optional
import logging
import re

logger = logging.getLogger(__name__)

def normalize_name_for_comparison(name: Optional[str]) -> str:
    """
    Агрессивная очистка для СРАВНЕНИЯ.
    '🇪🇸 A. Zverev (1)' -> 'azverev'
    'F. Fognini (WC)' -> 'ffognini'
    """
    if not name or name.lower() in ["bye", "tbd"]:
        return "tbd"
    
    # 1. Убираем всё содержимое скобок (сиды, WC)
    name_no_bracket = re.sub(r'\s*\(.*?\)', '', name)
    
    # 2. Оставляем ТОЛЬКО буквы (убираем флаги, точки, пробелы, дефисы)
    # Это самый надежный способ сравнить "A. Zverev" и "A.Zverev"
    clean = re.sub(r'[^a-zA-Z]', '', name_no_bracket).lower()
    
    return clean if clean else "tbd"

def parse_player_display(name: Optional[str]) -> Dict[str, Any]:
    """
    Подготовка имени для ОТОБРАЖЕНИЯ (сохраняем красоту).
    """
    if not name or name.lower() == "bye":
        return {"name": "TBD", "seed": None}
    
    seed = None
    display_name = name

    # Пытаемся вытащить Seed (1) красиво
    if "(" in name and ")" in name:
        try:
            # Ищем последние скобки
            match = re.search(r'\((\d+)\)$', name)
            if match:
                seed = int(match.group(1))
                # Убираем сид из имени отображения
                display_name = name[:match.start()].strip()
            else:
                # Если это (WC) или (Q) - оставляем в имени или убираем по вкусу
                # Сейчас просто уберем сид если это цифра
                display_name = re.sub(r'\s*\(\d+\)$', '', name).strip()
        except Exception:
            pass
            
    return {"name": display_name, "seed": seed}

def generate_bracket(tournament, true_draws, user_picks, rounds) -> Dict[str, List[Dict]]:
    bracket = {}
    match_counts = {"R128": 64, "R64": 32, "R32": 16, "R16": 8, "QF": 4, "SF": 2, "F": 1, "Champion": 1}
    
    for round_name in rounds:
        bracket[round_name] = []
        count = match_counts.get(round_name, 0)
        if count == 0: continue

        for match_number in range(1, count + 1):
            # 1. Данные из БД (REALITY)
            true_match = next(
                (m for m in true_draws if m.round == round_name and m.match_number == match_number),
                None
            )
            
            # 2. Прогноз юзера (FANTASY)
            user_pick = next(
                (p for p in user_picks if p.round == round_name and p.match_number == match_number),
                None
            )
            
            predicted_winner = user_pick.predicted_winner if user_pick else None
            
            p1_raw = true_match.player1 if true_match else "TBD"
            p2_raw = true_match.player2 if true_match else "TBD"
            winner_raw = true_match.winner if true_match else None

            # Счета
            scores = []
            if true_match:
                scores = [s for s in [true_match.set1, true_match.set2, true_match.set3, true_match.set4, true_match.set5] if s]

            match_data = {
                "id": f"{tournament.id}_{round_name}_{match_number}",
                "round": round_name,
                "match_number": match_number,
                
                "player1": parse_player_display(p1_raw),
                "player2": parse_player_display(p2_raw),
                
                "predicted_winner": predicted_winner, # Сырое имя (как сохранил юзер)
                "actual_winner": winner_raw,          # Сырое имя (из true_draw)
                
                "scores": scores
            }
            bracket[round_name].append(match_data)

    return bracket