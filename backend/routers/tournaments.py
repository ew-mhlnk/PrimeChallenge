from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import logging
from typing import List
from database.db import SessionLocal
from database.models import Tournament, Match, Status
from services.sheets_service import get_tournaments, get_tournament_matches
from pydantic import BaseModel

router = APIRouter()
logger = logging.getLogger(__name__)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class TournamentResponse(BaseModel):
    id: int
    name: str
    dates: str
    status: str

class MatchResponse(BaseModel):
    id: int
    round: str
    match_number: int
    player1: str
    player2: str
    score: str | None
    winner: str | None

@router.get("/", response_model=List[TournamentResponse])
def get_all_tournaments(db: Session = Depends(get_db)):
    logger.info("Fetching tournaments")
    sheet_tournaments = get_tournaments()
    db_tournaments = []
    for t in sheet_tournaments:
        logger.info(f"Processing tournament {t['name']} with status {t['status']}")
        existing = db.query(Tournament).filter(Tournament.name == t["name"]).first()
        status_map = {
            "ACTIVE": Status.ACTIVE,
            "CLOSED": Status.CLOSED,
            "COMPLETED": Status.COMPLETED
        }
        status = status_map.get(t["status"], Status.ACTIVE)
        if not existing:
            db_tournament = Tournament(
                name=t["name"],
                dates=t["dates"],
                status=status
            )
            db.add(db_tournament)
            db.commit()
            db.refresh(db_tournament)
        else:
            existing.dates = t["dates"]
            existing.status = status
            db.commit()
            db.refresh(existing)
            db_tournament = existing
        db_tournaments.append(db_tournament)
    return db_tournaments

@router.get("/{tournament_id}/matches", response_model=List[MatchResponse])
def get_tournament_matches_endpoint(tournament_id: int, db: Session = Depends(get_db)):
    logger.info(f"Fetching matches for tournament {tournament_id}")
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    sheet_matches = get_tournament_matches(tournament.name)
    db_matches = []
    for m in sheet_matches:
        existing = db.query(Match).filter(
            Match.tournament_id == tournament_id,
            Match.round == m["round"],
            Match.match_number == m["match_number"]
        ).first()
        if not existing:
            db_match = Match(
                tournament_id=tournament_id,
                round=m["round"],
                match_number=m["match_number"],
                player1=m["player1"],
                player2=m["player2"],
                score=m.get("score"),
                winner=m.get("winner")
            )
            db.add(db_match)
            db.commit()
            db.refresh(db_match)
        else:
            existing.player1 = m["player1"]
            existing.player2 = m["player2"]
            existing.score = m.get("score")
            existing.winner = m.get("winner")
            db.commit()
            db.refresh(existing)
            db_match = existing
        db_matches.append(db_match)
    return db_matches