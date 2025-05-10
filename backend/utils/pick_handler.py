# utils/pick_handler.py
from sqlalchemy.orm import Session
from database import models
from fastapi import HTTPException

def save_pick(pick: dict, db: Session, user_id: int):
    tournament = db.query(models.Tournament).filter(models.Tournament.id == pick['tournament_id']).first()
    if not tournament or tournament.status != "ACTIVE":
        raise HTTPException(status_code=403, detail="Tournament is not active")
    
    match = db.query(models.TrueDraw).filter(
        models.TrueDraw.tournament_id == pick['tournament_id'],
        models.TrueDraw.round == pick['round'],
        models.TrueDraw.match_number == pick['match_number']
    ).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    if pick['predicted_winner'] not in [match.player1, match.player2]:
        raise HTTPException(status_code=400, detail="Predicted winner must be one of the players")
    
    existing_pick = db.query(models.UserPick).filter(
        models.UserPick.user_id == user_id,
        models.UserPick.tournament_id == pick['tournament_id'],
        models.UserPick.round == pick['round'],
        models.UserPick.match_number == pick['match_number']
    ).first()
    if existing_pick:
        existing_pick.predicted_winner = pick['predicted_winner']
        existing_pick.player1 = match.player1
        existing_pick.player2 = match.player2
    else:
        db_pick = models.UserPick(
            user_id=user_id,
            tournament_id=pick['tournament_id'],
            round=pick['round'],
            match_number=pick['match_number'],
            player1=match.player1,
            player2=match.player2,
            predicted_winner=pick['predicted_winner']
        )
        db.add(db_pick)
    
    all_rounds = ['R128', 'R64', 'R32', 'R16', 'QF', 'SF', 'F', 'W']
    current_round_idx = all_rounds.index(pick['round'])
    for round_name in all_rounds[current_round_idx + 1:]:
        db.query(models.UserPick).filter(
            models.UserPick.user_id == user_id,
            models.UserPick.tournament_id == pick['tournament_id'],
            models.UserPick.round == round_name
        ).delete()
    
    db.commit()
    return pick