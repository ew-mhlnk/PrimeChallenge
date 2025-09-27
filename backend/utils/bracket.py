from typing import Dict, List, Any, Optional
import logging
from sqlalchemy.orm import Session
from database import models

logger = logging.getLogger(__name__)

def parse_player(name: Optional[str]) -> Dict[str, Any]:
    """Парсит имя игрока с seed (e.g., 'A. Zverev (1)' → {name: 'A. Zverev', seed: 1})."""
    if not name or name == "Bye":
        return {"name": name or "TBD", "seed": None}
    if "(" in name and ")" in name:
        start = name.rfind("(") + 1
        end = name.rfind(")")
        seed_str = name[start:end]
        name_clean = name[:start-1].strip()
        seed = int(seed_str) if seed_str.isdigit() else None
        return {"name": name_clean, "seed": seed}
    return {"name": name, "seed": None}

def generate_bracket(tournament, true_draws, user_picks, rounds) -> Dict[str, List[Dict]]:
    """
    Генерирует 'балванку' сетки ТОЛЬКО для первого раунда (starting_round).
    Структура: {starting_round: [matches]}, match = {
        id: str, round: str, player1: {name: str, seed: int|null}, player2: {name: str, seed: int|null},
        predicted_winner: str|null
    }
    """
    bracket = {tournament.starting_round: []}
    # Динамическое количество матчей в зависимости от starting_round
    match_counts = {"R128": 64, "R64": 32, "R32": 16, "R16": 8, "QF": 4, "SF": 2, "F": 1}
    match_count = match_counts.get(tournament.starting_round, 16)  # По умолчанию R32

    for match_number in range(1, match_count + 1):
        true_match = next(
            (m for m in true_draws if m.round == tournament.starting_round and m.match_number == match_number),
            None
        )
        user_pick = next(
            (p for p in user_picks if p.round == tournament.starting_round and p.match_number == match_number),
            None
        )
        predicted_winner = user_pick.predicted_winner if user_pick else None

        player1 = parse_player(true_match.player1 if true_match else "TBD")
        player2 = parse_player(true_match.player2 if true_match else "TBD")

        match_data = {
            "id": f"{tournament.id}_{tournament.starting_round}_{match_number}",
            "round": tournament.starting_round,
            "player1": player1,
            "player2": player2,
            "predicted_winner": predicted_winner
        }
        bracket[tournament.starting_round].append(match_data)

    logger.info(f"Generated first round bracket for tournament {tournament.id}: {tournament.starting_round} with {len(bracket[tournament.starting_round])} matches")
    return bracket