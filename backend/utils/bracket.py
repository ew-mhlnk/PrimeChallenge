from typing import Dict, List, Any, Optional
import logging
import re

logger = logging.getLogger(__name__)

def normalize_name_for_comparison(name: Optional[str]) -> str:
    if not name or name.lower() in ["bye", "tbd"]: return "tbd"
    n = re.sub(r'\s*\(.*?\)', '', name)
    n = re.sub(r'[^a-zA-Z]', '', n).lower()
    return n if n else "tbd"

def parse_player_display(name: Optional[str]) -> Dict[str, Any]:
    if not name or name.lower() == "bye": return {"name": "Bye", "seed": None}
    
    seed = None
    display_name = name
    if "(" in name and ")" in name:
        try:
            match = re.search(r'\((\d+)\)$', name)
            if match:
                seed = int(match.group(1))
                display_name = name[:match.start()].strip()
        except: pass
    return {"name": display_name, "seed": seed}

def generate_bracket(tournament, true_draws, user_picks, rounds) -> Dict[str, List[Dict]]:
    bracket = {}
    match_counts = {"R128": 64, "R64": 32, "R32": 16, "R16": 8, "QF": 4, "SF": 2, "F": 1, "Champion": 1}
    
    for round_name in rounds:
        bracket[round_name] = []
        count = match_counts.get(round_name, 0)
        if count == 0: continue

        for match_number in range(1, count + 1):
            true_match = next((m for m in true_draws if m.round == round_name and m.match_number == match_number), None)
            user_pick = next((p for p in user_picks if p.round == round_name and p.match_number == match_number), None)
            
            p1_raw = true_match.player1 if true_match else "TBD"
            p2_raw = true_match.player2 if true_match else "TBD"
            winner_raw = true_match.winner if true_match else None
            predicted = user_pick.predicted_winner if user_pick else None

            scores = []
            if true_match:
                scores = [s for s in [true_match.set1, true_match.set2, true_match.set3, true_match.set4, true_match.set5] if s]

            bracket[round_name].append({
                "id": f"{tournament.id}_{round_name}_{match_number}",
                "round": round_name,
                "match_number": match_number,
                "player1": parse_player_display(p1_raw),
                "player2": parse_player_display(p2_raw),
                "predicted_winner": predicted,
                "actual_winner": winner_raw,
                "scores": scores
            })

    return bracket