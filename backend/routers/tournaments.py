from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
import logging
from typing import List
from database.db import get_db
from database.models import Tournament

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
