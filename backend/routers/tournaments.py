from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database.db import get_db
from database import models
import logging
from schemas import Tournament, TrueDraw

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/", response_model=List[Tournament])
async def get_tournaments(tag: str = None, status: str = None, db: Session = Depends(get_db)):
    logger.info("Fetching all tournaments")
    query = db.query(models.Tournament)
    
    if tag:
        query = query.filter(models.Tournament.tag == tag)
    
    if status:
        query = query.filter(models.Tournament.status == status)
    
    tournaments = query.all()
    logger.info(f"Returning {len(tournaments)} tournaments")
    return tournaments

@router.get("/matches/by-id", response_model=List[TrueDraw])
async def get_matches_by_tournament_id(tournament_id: int, db: Session = Depends(get_db)):
    logger.info(f"Fetching matches for tournament_id={tournament_id}")
    matches = (
        db.query(models.TrueDraw)
        .filter(models.TrueDraw.tournament_id == tournament_id)
        .all()
    )
    logger.info(f"Returning {len(matches)} matches")
    return matches