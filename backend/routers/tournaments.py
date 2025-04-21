from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict
import logging
from database.db import get_db
from database.models import Tournament, TrueDraw

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/", response_model=List[Dict])
async def get_tournaments(db: Session = Depends(get_db)):
    tournaments = db.query(Tournament).all()
    logger.info(f"Retrieved {len(tournaments)} tournaments")
    return [
        {
            "id": tournament.id,
            "name": tournament.name,
            "dates": tournament.dates,
            "status": tournament.status,
            "starting_round": tournament.starting_round,
            "type": tournament.type,
            "start": tournament.start,
        }
        for tournament in tournaments
    ]

@router.get("/matches", response_model=List[Dict])
async def get_matches(tournament_id: int, db: Session = Depends(get_db)):
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        logger.error(f"Tournament with ID {tournament_id} not found")
        raise HTTPException(status_code=404, detail="Tournament not found")

    matches = db.query(TrueDraw).filter(TrueDraw.tournament_id == tournament_id).all()
    logger.info(f"Retrieved {len(matches)} matches for tournament {tournament_id}")
    return [
        {
            "id": match.id,
            "tournament_id": match.tournament_id,
            "round": match.round,
            "match_number": match.match_number,
            "player1": match.player1,
            "player2": match.player2,
            "set1": match.set1,
            "set2": match.set2,
            "set3": match.set3,
            "set4": match.set4,
            "set5": match.set5,
            "winner": match.winner,
        }
        for match in matches
    ]