from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List
import logging
from database.db import get_db
from database import models
from schemas import Tournament, TrueDraw, UserPick
from utils.auth import get_current_user
from utils.bracket import generate_bracket, compute_comparison_and_scores  # Исправленный импорт

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/tournaments/", response_model=List[dict])
async def get_tournaments(db: Session = Depends(get_db)):
    logger.info("Fetching all tournaments")
    tournaments = db.query(models.Tournament).all()
    logger.info(f"Returning {len(tournaments)} tournaments")
    return [
        {
            "id": t.id,
            "name": t.name,
            "status": t.status,
            "dates": t.dates,
            "start": t.start,
            "close": t.close,
            "tag": t.tag,
        }
        for t in tournaments
    ]

@router.get("/tournament/{id}", response_model=dict)
async def get_tournament_by_id(id: int, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    logger.info(f"Fetching tournament with id={id}")
    tournament = db.query(models.Tournament).filter(models.Tournament.id == id).first()
    if not tournament:
        logger.error(f"Tournament with id={id} not found")
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    user_id = user["id"]
    logger.info(f"Using user_id={user_id} for picks")
    
    true_draws = db.query(models.TrueDraw).filter(models.TrueDraw.tournament_id == id).all()
    logger.info(f"Fetched {len(true_draws)} true_draws for tournament {id}")
    
    user_picks = db.query(models.UserPick).filter(
        models.UserPick.tournament_id == id,
        models.UserPick.user_id == user_id
    ).all()
    logger.info(f"Fetched {len(user_picks)} user_picks for user {user_id}")
    
    all_rounds = ['R128', 'R64', 'R32', 'R16', 'QF', 'SF', 'F', 'W']
    starting_index = all_rounds.index(tournament.starting_round)
    rounds = all_rounds[starting_index:]
    logger.info(f"Rounds for tournament {id}: {rounds}")
    
    bracket = generate_bracket(tournament, true_draws, user_picks, rounds)
    has_picks = any(p.predicted_winner for p in user_picks)
    comparison_data = compute_comparison_and_scores(tournament, user_id, db) if tournament.status in ["CLOSED", "COMPLETED"] else {}
    
    tournament_data = Tournament(
        id=tournament.id,
        name=tournament.name,
        dates=tournament.dates,
        status=tournament.status,
        sheet_name=tournament.sheet_name,
        starting_round=tournament.starting_round,
        type=tournament.type,
        start=tournament.start,
        close=tournament.close,
        tag=tournament.tag,
        true_draws=[TrueDraw.from_orm(draw) for draw in true_draws],
        user_picks=[UserPick.from_orm(pick) for pick in user_picks],
        scores=None
    )
    
    logger.info(f"Returning tournament with id={id}, true_draws count={len(true_draws)}, user_picks count={len(user_picks)}")
    logger.info(f"Tournament data: {tournament_data.dict()}")
    
    return {
        **tournament_data.dict(),
        "rounds": rounds,
        "bracket": bracket,
        "has_picks": has_picks,
        **comparison_data
    }

@router.get("/leaderboard/", response_model=List[dict])
async def get_leaderboard(db: Session = Depends(get_db)):
    logger.info("Fetching leaderboard")
    try:
        leaderboard = db.query(models.Leaderboard).order_by(models.Leaderboard.score.desc()).all()
        logger.info(f"Found {len(leaderboard)} leaderboard entries")
        if not leaderboard:
            return []
        result = [
            {"user_id": entry.user_id, "username": entry.user.username if entry.user else "Unknown", "score": entry.score}
            for entry in leaderboard
        ]
        logger.info(f"Returning {len(result)} leaderboard entries")
        return result
    except AttributeError as e:
        logger.error(f"AttributeError in get_leaderboard: {str(e)}")
        raise HTTPException(status_code=500, detail="Leaderboard table not found in database")
    except Exception as e:
        logger.error(f"Unexpected error in get_leaderboard: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching leaderboard: {str(e)}")