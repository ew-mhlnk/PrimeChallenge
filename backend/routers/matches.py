from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import logging
from database.db import get_db
from database.models import Match

router = APIRouter(prefix="/matches")  # Добавлен prefix

logger = logging.getLogger(__name__)

@router.get("/{tournament_id}")
async def get_matches_by_tournament(tournament_id: int, db: Session = Depends(get_db)):
    logger.info(f"Fetching matches for tournament {tournament_id}")
    matches = db.query(Match).filter(Match.tournament_id == tournament_id).all()
    return matches
