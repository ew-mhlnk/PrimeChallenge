from typing import Dict, List, Any, Optional
import logging
from sqlalchemy.orm import Session
from database import models

logger = logging.getLogger(__name__)

def parse_player(name: Optional[str]) -> Dict[str, Any]:
    """Парсит имя игрока с seed (e.g., "A. Zverev (1)" → {name: "A. Zverev", seed: 1})."""
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

def generate_bracket(tournament, true_draws, user_picks, rounds):
    """
    Генерирует 'балванку' сетки: R32 с реальными игроками, поздние раунды — TBD.
    Структура: {round: [matches]}, match = {
        id: str, round: str, player1: {name: str, seed: int|null}, player2: {name: str, seed: int|null},
        predicted_winner: str|null, source_matches: [{round: str, match_number: int}]
    }
    """
    bracket = {round_name: [] for round_name in rounds}
    round_order = {"R32": 0, "R16": 1, "QF": 2, "SF": 3, "F": 4}  # Индексы для расчёта next_match
    match_counts = {"R32": 16, "R16": 8, "QF": 4, "SF": 2, "F": 1}

    for round_idx, round_name in enumerate(rounds):
        match_count = match_counts[round_name]
        for match_number in range(1, match_count + 1):
            # Ищем true_draw для этого матча
            true_match = next((m for m in true_draws if m.round == round_name and m.match_number == match_number), None)
            
            # Ищем user_pick для predicted_winner
            user_pick = next((p for p in user_picks if p.round == round_name and p.match_number == match_number), None)
            predicted_winner = user_pick.predicted_winner if user_pick else None

            # Игроки: Для starting_round — из true_draw, для поздних — TBD
            if round_name == tournament.starting_round and true_match:
                player1 = parse_player(true_match.player1)
                player2 = parse_player(true_match.player2)
            else:
                player1 = {"name": "TBD", "seed": None}
                player2 = {"name": "TBD", "seed": None}

            # Source_matches: Откуда берутся игроки (предыдущий раунд, матчи 2*(match_number-1)+1 и +2)
            source_matches = []
            if round_idx > 0:
                prev_round = rounds[round_idx - 1]
                source1_number = 2 * (match_number - 1) + 1
                source2_number = source1_number + 1
                source_matches = [
                    {"round": prev_round, "match_number": source1_number},
                    {"round": prev_round, "match_number": source2_number}
                ]

            match_data = {
                "id": f"{tournament.id}_{round_name}_{match_number}",
                "round": round_name,
                "player1": player1,
                "player2": player2,
                "predicted_winner": predicted_winner,
                "source_matches": source_matches
            }
            bracket[round_name].append(match_data)

    logger.info(f"Generated blank bracket for tournament {tournament.id}: R32 filled, later rounds TBD")
    return bracket