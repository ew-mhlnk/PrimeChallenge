from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
import logging
from typing import List
from database.db import get_db
from database.models import Match

router = APIRouter(prefix="/matches")
logger = logging.getLogger(__name__)

@router.get("/", response_model=List[dict])
async def get_matches_by_tournament(tournament_id: int = Query(...), db: Session = Depends(get_db)):
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
