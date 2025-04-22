from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import logging
from database.db import get_db
from database import models

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/")
async def get_tournaments(db: Session = Depends(get_db)):
    logger.info("Fetching all tournaments")
    tournaments = db.query(models.Tournament).all()
    logger.info(f"Returning {len(tournaments)} tournaments")
    return tournaments

@router.get("/{id}")
async def get_tournament(id: int, db: Session = Depends(get_db)):
    logger.info(f"Fetching tournament with id {id}")
    tournament = db.query(models.Tournament).filter(models.Tournament.id == id).first()
    if not tournament:
        logger.error(f"Tournament with id {id} not found")
        raise HTTPException(status_code=404, detail="Tournament not found")
    logger.info(f"Returning tournament with id {id}")
    return tournament

@router.get("/{id}/matches")
async def get_tournament_matches(id: int, db: Session = Depends(get_db)):
    logger.info(f"Fetching matches for tournament {id}")
    tournament = db.query(models.Tournament).filter(models.Tournament.id == id).first()
    if not tournament:
        logger.error(f"Tournament with id {id} not found")
        raise HTTPException(status_code=404, detail="Tournament not found")

    matches = db.query(models.TrueDraw).filter(models.TrueDraw.tournament_id == id).all()
    if not matches:
        logger.info(f"No matches found for tournament {id}")
        return []
    logger.info(f"Returning {len(matches)} matches for tournament {id}")
    return matches

@router.get("/matches/by-id")
async def get_matches(tournament_id: int = Query(...), db: Session = Depends(get_db)):
    logger.info(f"Fetching matches for tournament {tournament_id}")
    tournament = db.query(models.Tournament).filter(models.Tournament.id == tournament_id).first()
    if not tournament:
        logger.error(f"Tournament with id {tournament_id} not found")
        raise HTTPException(status_code=404, detail="Tournament not found")

    matches = db.query(models.TrueDraw).filter(models.TrueDraw.tournament_id == tournament_id).all()
    if not matches:
        logger.info(f"No matches found for tournament {tournament_id}")
        return []
    logger.info(f"Returning {len(matches)} matches for tournament {tournament_id}")
    return matches

@router.get("/{id}/starting-matches")
async def get_starting_matches(id: int, db: Session = Depends(get_db)):
    logger.info(f"Fetching starting matches for tournament {id}")
    tournament = db.query(models.Tournament).filter(models.Tournament.id == id).first()
    if not tournament:
        logger.error(f"Tournament with id {id} not found")
        raise HTTPException(status_code=404, detail="Tournament not found")

    starting_round = tournament.starting_round
    matches = db.query(models.TrueDraw).filter(
        models.TrueDraw.tournament_id == id,
        models.TrueDraw.round == starting_round
    ).all()
    
    if not matches:
        logger.info(f"No starting matches found for tournament {id} in round {starting_round}")
        return []
    logger.info(f"Returning {len(matches)} starting matches for tournament {id}")
    return matches