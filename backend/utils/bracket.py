from typing import Dict, List, Any, Optional
import logging
import re

logger = logging.getLogger(__name__)

def normalize_name(name: Optional[str]) -> str:
    """
    Очищает имя для отправки на фронтенд.
    Убирает (1), (WC), флаги, лишние пробелы.
    '🇪🇸 A. Zverev (1)' -> 'A. Zverev'
    """
    if not name or name.lower() == "bye":
        return name or "TBD"
    
    # 1. Убираем скобки в конце
    clean = re.sub(r'\s*\(.*?\)$', '', name)
    
    # 2. Убираем эмодзи и спецсимволы в начале (если есть)
    # Оставляем буквы, точки, дефисы, пробелы
    # Это регулярка удаляет всё, что НЕ является буквой/цифрой/пробелом/точкой/дефисом
    # clean = re.sub(r'[^\w\s\.\-]', '', clean) 
    
    # Но самый надежный способ для отображения - просто убрать скобки,
    # а для сравнения использовать .strip()
    return clean.strip()

def parse_player(name: Optional[str]) -> Dict[str, Any]:
    """Парсит имя игрока и посев для отображения"""
    if not name or name == "Bye":
        return {"name": name or "TBD", "seed": None}
    
    seed = None
    clean_name = name

    # Пытаемся вытащить Seed (1)
    if "(" in name and ")" in name:
        try:
            start = name.rfind("(")
            end = name.rfind(")")
            seed_str = name[start+1:end]
            clean_name = name[:start].strip() # Имя без сида
            if seed_str.isdigit():
                seed = int(seed_str)
        except Exception:
            pass
    
    # Возвращаем уже очищенное имя, чтобы на фронте было красиво и совпадало с пиком
    return {"name": normalize_name(clean_name), "seed": seed}

def generate_bracket(tournament, true_draws, user_picks, rounds) -> Dict[str, List[Dict]]:
    bracket = {}
    match_counts = {"R128": 64, "R64": 32, "R32": 16, "R16": 8, "QF": 4, "SF": 2, "F": 1, "Champion": 1}
    
    for round_name in rounds:
        bracket[round_name] = []
        count = match_counts.get(round_name, 0)
        if count == 0: continue

        for match_number in range(1, count + 1):
            # 1. Ищем реальный матч в БД
            true_match = next(
                (m for m in true_draws if m.round == round_name and m.match_number == match_number),
                None
            )
            
            # 2. Ищем прогноз юзера
            user_pick = next(
                (p for p in user_picks if p.round == round_name and p.match_number == match_number),
                None
            )
            
            predicted_winner = user_pick.predicted_winner if user_pick else None
            
            # Исходные данные из БД
            p1_raw = true_match.player1 if true_match else "TBD"
            p2_raw = true_match.player2 if true_match else "TBD"
            winner_raw = true_match.winner if true_match else None

            # 3. Очищаем победителя перед отправкой!
            # Чтобы "🇪🇸 A. Zverev (1)" превратилось в "A. Zverev"
            actual_winner_clean = normalize_name(winner_raw) if winner_raw else None

            # Счета
            scores = []
            if true_match:
                scores = [s for s in [true_match.set1, true_match.set2, true_match.set3, true_match.set4, true_match.set5] if s]

            match_data = {
                "id": f"{tournament.id}_{round_name}_{match_number}",
                "round": round_name,
                "match_number": match_number,
                "player1": parse_player(p1_raw), # Внутри тоже вызовется normalize
                "player2": parse_player(p2_raw),
                "predicted_winner": normalize_name(predicted_winner) if predicted_winner else None, # И пик тоже чистим на всякий
                "actual_winner": actual_winner_clean, 
                "scores": scores
            }
            bracket[round_name].append(match_data)

    return bracket