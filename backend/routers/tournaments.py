from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
import logging
from typing import List
from database.db import get_db
from database.models import Tournament, Match

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/", response_model=List[dict])
async def get_all_tournaments(db: Session = Depends(get_db)):
    logger.info("Fetching tournaments from DB")
    db_tournaments = db.query(Tournament).all()
    tournaments_data = [
        {
            "id": t.id,
            "name": t.name,
            "dates": t.dates,
            "status": t.status,
            "starting_round": t.starting_round,
            "type": t.type,
            "active": t.status == "ACTIVE"
        }
        for t in db_tournaments
    ]
    return JSONResponse(content=tournaments_data)

@router.get("/matches", response_model=List[dict])
async def get_matches(tournament_id: int = Query(...), db: Session = Depends(get_db)):
    logger.info(f"Fetching matches for tournament_id: {tournament_id}")
    db_matches = db.query(Match).filter(Match.tournament_id == tournament_id).all()
    matches_data = [
        {
            "id": m.id,
            "tournament_id": m.tournament_id,
            "round": m.round,
            "match_number": m.match_number,
            "player1": m.player1,
            "player2": m.player2,
            "set1": m.set1,
            "set2": m.set2,
            "set3": m.set3,
            "set4": m.set4,
            "set5": m.set5,
            "winner": m.winner
        }
        for m in db_matches
    ]
    return JSONResponse(content=matches_data)