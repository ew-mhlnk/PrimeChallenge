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
    tournaments_data = [t.__dict__ for t in db_tournaments]  # Используем __dict__ вместо dict()
    return JSONResponse(
        content=tournaments_data,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "*"
        }
    )