from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict
from database.db import get_db
from database import models
from utils.score_calculator import compute_comparison_and_scores
from utils.auth import get_current_user
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/tournament/{tournament_id}/results", response_model=Dict)
async def get_comparison_results(tournament_id: int, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    logger.info(f"Fetching comparison results for tournament_id={tournament_id}, user_id={user['id']}")
    
    tournament = db.query(models.Tournament).filter(models.Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    if tournament.status not in ["CLOSED", "COMPLETED"]:
        raise HTTPException(status_code=400, detail="Tournament is not closed or completed")
    
    user_id = user["id"]
    comparison_data = compute_comparison_and_scores(tournament, user_id, db)
    
    logger.info(f"Returning comparison results, correct_picks={comparison_data['correct_picks']}, score={comparison_data['score']}")
    return comparison_data