from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database.db import get_db
from database import models
import logging
from schemas import Tournament, TrueDraw

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/", response_model=List[Tournament])
async def get_tournaments(tag: str = None, status: str = None, id: int = None, db: Session = Depends(get_db)):
    logger.info("Fetching all tournaments")
    query = db.query(models.Tournament)
    
    if tag:
        query = query.filter(models.Tournament.tag == tag)
    
    if status:
        query = query.filter(models.Tournament.status == status)
    
    if id is not None:
        query = query.filter(models.Tournament.id == id)
    
    tournaments = query.all()
    logger.info(f"Returning {len(tournaments)} tournaments")
    return tournaments

@router.get("/tournament/{id}", response_model=Tournament)
async def get_tournament_by_id(id: int, db: Session = Depends(get_db)):
    logger.info(f"Fetching tournament with id={id}")
    tournament = db.query(models.Tournament).filter(models.Tournament.id == id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    # Загружаем матчи (true_draws)
    true_draws = (
        db.query(models.TrueDraw)
        .filter(models.TrueDraw.tournament_id == id)
        .all()
    )
    
    # Загружаем пики пользователя (предполагаем, что user_id берётся из initData, но для простоты пока заглушка)
    user_id = 0  # Нужно извлечь user_id из initData (например, через middleware)
    user_picks = (
        db.query(models.UserPick)
        .filter(models.UserPick.tournament_id == id, models.UserPick.user_id == user_id)
        .all()
    )
    
    # Формируем ответ
    tournament_dict = {
        "id": tournament.id,
        "name": tournament.name,
        "dates": tournament.dates,
        "status": tournament.status,
        "tag": tournament.tag,
        "starting_round": tournament.starting_round,
        "true_draws": true_draws,
        "user_picks": user_picks,
    }
    
    logger.info(f"Returning tournament with id={id}")
    return tournament_dict

@router.get("/matches/by-id", response_model=List[TrueDraw])
async def get_matches_by_tournament_id(tournament_id: int, db: Session = Depends(get_db)):
    logger.info(f"Fetching matches for tournament_id={tournament_id}")
    matches = (
        db.query(models.TrueDraw)
        .filter(models.TrueDraw.tournament_id == tournament_id)
        .all()
    )
    logger.info(f"Returning {len(matches)} matches")
    return matches

@router.get("/picks/", response_model=List[dict])
async def get_picks(tournament_id: int, user_id: int, db: Session = Depends(get_db)):
    logger.info(f"Fetching picks for tournament_id={tournament_id}, user_id={user_id}")
    picks = (
        db.query(models.UserPick)
        .filter(models.UserPick.tournament_id == tournament_id, models.UserPick.user_id == user_id)
        .all()
    )
    logger.info(f"Returning {len(picks)} picks")
    return picks

@router.post("/picks/", response_model=dict)
async def save_pick(pick: dict, db: Session = Depends(get_db)):
    logger.info("Saving pick")
    try:
        existing_pick = (
            db.query(models.UserPick)
            .filter(
                models.UserPick.user_id == pick['user_id'],
                models.UserPick.tournament_id == pick['tournament_id'],
                models.UserPick.round == pick['round'],
                models.UserPick.match_number == pick['match_number']
            )
            .first()
        )
        if existing_pick:
            existing_pick.predicted_winner = pick['predicted_winner']
        else:
            db_pick = models.UserPick(
                user_id=pick['user_id'],
                tournament_id=pick['tournament_id'],
                round=pick['round'],
                match_number=pick['match_number'],
                player1=pick.get('player1', ''),
                player2=pick.get('player2', ''),
                predicted_winner=pick['predicted_winner']
            )
            db.add(db_pick)
        db.commit()
        logger.info("Pick saved successfully")
        return pick
    except Exception as e:
        logger.error(f"Error saving pick: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to save pick")

@router.post("/picks/bulk")
async def save_picks_bulk(picks: List[dict], db: Session = Depends(get_db)):
    logger.info("Saving picks in bulk")
    try:
        for pick in picks:
            existing_pick = (
                db.query(models.UserPick)
                .filter(
                    models.UserPick.user_id == pick['user_id'],
                    models.UserPick.tournament_id == pick['tournament_id'],
                    models.UserPick.round == pick['round'],
                    models.UserPick.match_number == pick['match_number']
                )
                .first()
            )
            if existing_pick:
                existing_pick.predicted_winner = pick['predicted_winner']
            else:
                db_pick = models.UserPick(
                    user_id=pick['user_id'],
                    tournament_id=pick['tournament_id'],
                    round=pick['round'],
                    match_number=pick['match_number'],
                    player1=pick.get('player1', ''),
                    player2=pick.get('player2', ''),
                    predicted_winner=pick['predicted_winner']
                )
                db.add(db_pick)
        db.commit()
        logger.info("Picks saved successfully")
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Error saving picks: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to save picks")

@router.get("/leaderboard/", response_model=List[dict])
async def get_leaderboard(db: Session = Depends(get_db)):
    logger.info("Fetching leaderboard")
    try:
        leaderboard = db.query(models.Leaderboard).order_by(models.Leaderboard.score.desc()).all()
        if not leaderboard:
            return []
        result = [
            {"user_id": entry.user_id, "username": entry.username, "score": entry.score}
            for entry in leaderboard
        ]
        logger.info(f"Returning {len(result)} leaderboard entries")
        return result
    except AttributeError:
        raise HTTPException(status_code=500, detail="Leaderboard table not found in database")