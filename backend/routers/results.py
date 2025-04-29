from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database.db import get_db
from database import models
from schemas import TrueDraw
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/tournament/{tournament_id}", response_model=List[TrueDraw])
async def get_results_by_tournament(tournament_id: int, db: Session = Depends(get_db)):
    logger.info(f"Fetching results for tournament_id={tournament_id}")
    results = (
        db.query(models.TrueDraw)
        .filter(models.TrueDraw.tournament_id == tournament_id)
        .filter(models.TrueDraw.winner != None)  # Только матчи с результатами
        .all()
    )
    logger.info(f"Returning {len(results)} results")
    return results