# utils/bracket_generator.py
def generate_bracket(tournament, true_draws, user_picks, rounds):
    match_counts = {"R128": 64, "R64": 32, "R32": 16, "R16": 8, "QF": 4, "SF": 2, "F": 1, "W": 1}
    bracket = {}
    
    for round_idx, round_name in enumerate(rounds):
        match_count = match_counts.get(round_name, 1)
        bracket[round_name] = {}
        
        for match_number in range(1, match_count + 1):
            match = next((m for m in true_draws if m.round == round_name and m.match_number == match_number), None)
            pick = next((p for p in user_picks if p.round == round_name and p.match_number == match_number), None)
            
            if round_name == tournament.starting_round:
                bracket[round_name][match_number] = {
                    "player1": match.player1 if match else "TBD",
                    "player2": match.player2 if match else "TBD",
                    "predicted_winner": pick.predicted_winner if pick else None,
                    "source_matches": []
                }
            else:
                prev_round = rounds[round_idx - 1]
                prev_match1_number = (match_number - 1) * 2 + 1
                prev_match2_number = prev_match1_number + 1
                
                prev_match1 = bracket[prev_round].get(prev_match1_number, {"predicted_winner": None})
                prev_match2 = bracket[prev_round].get(prev_match2_number, {"predicted_winner": None})
                
                player1 = prev_match1["predicted_winner"] if prev_match1["predicted_winner"] else (pick.player1 if pick else None)
                player2 = prev_match2["predicted_winner"] if prev_match2["predicted_winner"] else (pick.player2 if pick else None)
                
                bracket[round_name][match_number] = {
                    "player1": player1,
                    "player2": player2,
                    "predicted_winner": pick.predicted_winner if pick else None,
                    "source_matches": [
                        {"round": prev_round, "match_number": prev_match1_number},
                        {"round": prev_round, "match_number": prev_match2_number}
                    ]
                }
    
    return bracket