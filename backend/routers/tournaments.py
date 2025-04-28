from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from database.db import get_db
from database import models
import logging

router = APIRouter()

logger = logging.getLogger(__name__)

# Получение всех турниров с возможной фильтрацией по тегу и статусу
@router.get("/")
async def get_tournaments(tag: str = None, status: str = None, db: Session = Depends(get_db)):
    logger.info("Fetching all tournaments")
    query = db.query(models.Tournament)
    
    # Фильтрация по тегу, если указан
    if tag:
        query = query.filter(models.Tournament.tag == tag)
    
    # Фильтрация по статусу, если указан
    if status:
        query = query.filter(models.Tournament.status == status)
    
    tournaments = query.all()
    logger.info(f"Returning {len(tournaments)} tournaments")
    # Добавляем заголовок, чтобы избежать кэширования
    return JSONResponse(content=[t.__dict__ for t in tournaments], headers={"Cache-Control": "no-store"})

# Получение матчей турнира по ID
@router.get("/matches/by-id")
async def get_matches_by_tournament_id(tournament_id: int, db: Session = Depends(get_db)):
    logger.info(f"Fetching matches for tournament_id={tournament_id}")
    matches = (
        db.query(models.TrueDraw)
        .filter(models.TrueDraw.tournament_id == tournament_id)
        .all()
    )
    logger.info(f"Returning {len(matches)} matches")
    return [m.__dict__ for m in matches]