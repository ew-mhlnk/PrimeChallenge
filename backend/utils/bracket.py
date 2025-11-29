from typing import Dict, List, Any, Optional
import logging

logger = logging.getLogger(__name__)

def parse_player(name: Optional[str]) -> Dict[str, Any]:
    if not name or name == "Bye":
        return {"name": name or "TBD", "seed": None}
    if "(" in name and ")" in name:
        try:
            start = name.rfind("(") + 1
            end = name.rfind(")")
            seed_str = name[start:end]
            name_clean = name[:start-1].strip()
            seed = int(seed_str) if seed_str.isdigit() else None
            return {"name": name_clean, "seed": seed}
        except Exception:
            return {"name": name, "seed": None}
    return {"name": name, "seed": None}

def generate_bracket(tournament, true_draws, user_picks, rounds) -> Dict[str, List[Dict]]:
    bracket = {}
    match_counts = {"R128": 64, "R64": 32, "R32": 16, "R16": 8, "QF": 4, "SF": 2, "F": 1, "Champion": 1}
    
    for round_name in rounds:
        bracket[round_name] = []
        count = match_counts.get(round_name, 0)
        if count == 0: continue

        for match_number in range(1, count + 1):
            true_match = next(
                (m for m in true_draws if m.round == round_name and m.match_number == match_number),
                None
            )
            user_pick = next(
                (p for p in user_picks if p.round == round_name and p.match_number == match_number),
                None
            )
            
            predicted_winner = user_pick.predicted_winner if user_pick else None
            p1_raw = true_match.player1 if true_match else "TBD"
            p2_raw = true_match.player2 if true_match else "TBD"

            # Собираем счета
            scores = []
            if true_match:
                scores = [s for s in [true_match.set1, true_match.set2, true_match.set3, true_match.set4, true_match.set5] if s]

            match_data = {
                "id": f"{tournament.id}_{round_name}_{match_number}",
                "round": round_name,
                "match_number": match_number,
                "player1": parse_player(p1_raw),
                "player2": parse_player(p2_raw),
                "predicted_winner": predicted_winner,
                "actual_winner": true_match.winner if true_match else None,
                "scores": scores # <--- ДОБАВИЛИ
            }
            bracket[round_name].append(match_data)

    return bracket