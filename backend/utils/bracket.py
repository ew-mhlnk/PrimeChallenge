from typing import Dict, List, Tuple
import logging
from backend.utils.constants import ROUNDS, ROUND_ORDER
from backend.database.models import Tournament, TrueDraw, UserPick

logger = logging.getLogger(__name__)

def generate_bracket(
    tournament: Tournament,
    true_draws: List[TrueDraw],
    user_picks: List[UserPick]
) -> Tuple[Dict, List, List]:
    """
    Формирует турнирную сетку и сравнение для турнира и пользователя.
    Args:
        tournament: Объект Tournament с полями id, status, starting_round.
        true_draws: Список объектов TrueDraw с полями round, match_number, player1, player2, winner.
        user_picks: Список объектов UserPick с полями round, match_number, predicted_winner.
    Returns:
        Tuple: (bracket, comparison, rounds)
        - bracket: Dict[str, Dict[str, Dict]] - структура сетки {round: {match_number: {player1, player2, predicted_winner}}}.
        - comparison: List[Dict] - сравнение пиков с результатами (для CLOSED/COMPLETED).
        - rounds: List[str] - список раундов, начиная с starting_round.
    """
    logger.info(f"Generating bracket for tournament {tournament.id}, status: {tournament.status}")

    # Определяем раунды на основе starting_round
    start_idx = ROUND_ORDER.get(tournament.starting_round, 0)
    rounds = ROUNDS[start_idx:]
    
    bracket = {}
    comparison = []

    for round_name in rounds:
        bracket[round_name] = {}
        round_draws = [draw for draw in true_draws if draw.round == round_name]
        
        # Количество матчей в раунде: 2^(количество_раундов - индекс_раунда - 1)
        match_count = 2 ** (len(rounds) - rounds.index(round_name) - 1)
        
        for match_number in range(1, match_count + 1):
            draw = next(
                (d for d in round_draws if d.match_number == match_number),
                None
            )
            pick = next(
                (p for p in user_picks if p.round == round_name and p.match_number == match_number),
                None
            )
            
            player1 = draw.player1 if draw else "TBD"
            player2 = draw.player2 if draw else "TBD"
            predicted_winner = pick.predicted_winner if pick else None
            
            # Формируем матч для bracket
            bracket[round_name][str(match_number)] = {
                "player1": player1,
                "player2": player2,
                "predicted_winner": predicted_winner,
            }
            
            # Для CLOSED и COMPLETED добавляем сравнение
            if tournament.status.value in ["CLOSED", "COMPLETED"] and draw and draw.winner:
                is_correct = predicted_winner and predicted_winner == draw.winner
                comparison.append({
                    "round": round_name,
                    "match_number": match_number,
                    "player1": player1,
                    "player2": player2,
                    "predicted_winner": predicted_winner,
                    "actual_winner": draw.winner,
                    "correct": is_correct
                })

    return bracket, comparison, rounds