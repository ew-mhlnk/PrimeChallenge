from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import models
from backend.database.db import get_db
from backend.utils.auth import get_current_user
from backend.schemas import UserBase, PickCreate, BulkPicksCreate
from backend.utils.constants import ROUNDS
from typing import List

router = APIRouter()

@router.post("/picks/bulk")
async def save_picks(
    bulk_picks: BulkPicksCreate, user: UserBase = Depends(get_current_user), db: Session = Depends(get_db)
):
    tournament = db.query(models.Tournament).filter(models.Tournament.id == bulk_picks.tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    if tournament.status != models.TournamentStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Picks can only be made for active tournaments")
    
    true_draws = db.query(models.TrueDraw).filter(models.TrueDraw.tournament_id == bulk_picks.tournament_id).all()
    
    # Валидация пиков
    for pick in bulk_picks.picks:
        if pick.round not in ROUNDS:
            raise HTTPException(status_code=400, detail=f"Invalid round: {pick.round}")
        
        draw = next(
            (d for d in true_draws if d.round == pick.round and d.match_number == pick.match_number),
            None
        )
        if not draw:
            raise HTTPException(status_code=400, detail=f"No match found for round {pick.round}, match {pick.match_number}")
        
        if pick.predicted_winner not in [draw.player1, draw.player2]:
            raise HTTPException(status_code=400, detail=f"Invalid predicted winner: {pick.predicted_winner}")
    
    # Удаляем существующие пики
    db.query(models.UserPick).filter(
        models.UserPick.tournament_id == bulk_picks.tournament_id,
        models.UserPick.user_id == user.user_id
    ).delete()
    
    # Сохраняем новые пики
    for pick in bulk_picks.picks:
        db_pick = models.UserPick(
            user_id=user.user_id,
            tournament_id=bulk_picks.tournament_id,
            round=pick.round,
            match_number=pick.match_number,
            player1=next(d.player1 for d in true_draws if d.round == pick.round and d.match_number == pick.match_number),
            player2=next(d.player2 for d in true_draws if d.round == pick.round and d.match_number == pick.match_number),
            predicted_winner=pick.predicted_winner
        )
        db.add(db_pick)
    
    db.commit()
    
    return {"message": "Picks saved successfully"}