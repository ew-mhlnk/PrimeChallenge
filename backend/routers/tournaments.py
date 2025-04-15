from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
import logging
from typing import List
from database.db import get_db
from database.models import Tournament, Match
from pydantic import BaseModel

router = APIRouter()
logger = logging.getLogger(__name__)

class TournamentResponse(BaseModel):
    id: int
    name: str
    dates: str
    status: str
    starting_round: str
    type: str

class MatchResponse(BaseModel):
    id: int
    round: str
    match_number: int
    player1: str
    player2: str
    set1: str | None
    set2: str | None
    set3: str | None
    set4: str | None
    set5: str | None
    winner: str | None

@router.get("/", response_model=List[TournamentResponse])
async def get_all_tournaments(db: Session = Depends(get_db)):
    logger.info("Fetching tournaments from DB")
    db_tournaments = db.query(Tournament).all()
    import json
    return Response(
        content=json.dumps([t.dict() for t in db_tournaments]),
        media_type="application/json",
        headers={
            "Access-Control-Allow-Origin": "https://prime-challenge.vercel.app",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "*"
        }
    )

@router.get("/{tournament_id}/matches", response_model=List[MatchResponse])
async def get_tournament_matches_endpoint(tournament_id: int, db: Session = Depends(get_db)):
    logger.info(f"Fetching matches for tournament {tournament_id} from DB")
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    db_matches = db.query(Match).filter(Match.tournament_id == tournament_id).all()
    import json
    return Response(
        content=json.dumps([m.dict() for m in db_matches]),
        media_type="application/json",
        headers={
            "Access-Control-Allow-Origin": "https://prime-challenge.vercel.app",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "*"
        }
    )