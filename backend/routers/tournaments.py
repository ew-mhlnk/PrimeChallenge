from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict
from database.db import get_db
from database import models
from schemas import Tournament, TrueDraw, UserPick
from utils.auth import get_current_user
from utils.bracket_generator import generate_bracket
from utils.score_calculator import compute_comparison_and_scores
from utils.pick_handler import save_pick
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/", response_model=List[Tournament])
async def get_tournaments(tag: str = None, status: str = None, id: int = None, db: Session = Depends(get_db)):
    logger.info("Fetching all tournaments")
    query = db.query(models.Tournament)
    if tag: query = query.filter(models.Tournament.tag == tag)
    if status: query = query.filter(models.Tournament.status == status)
    if id is not None: query = query.filter(models.Tournament.id == id)
    tournaments = query.all()
    logger.info(f"Returning {len(tournaments)} tournaments")
    return tournaments

@router.get("/tournament/{id}", response_model=dict)
async def get_tournament_by_id(id: int, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    logger.info(f"Fetching tournament with id={id}")
    tournament = db.query(models.Tournament).filter(models.Tournament.id == id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    user_id = user["id"]
    logger.info(f"Using user_id={user_id} for picks")
    
    true_draws = db.query(models.TrueDraw).filter(models.TrueDraw.tournament_id == id).all()
    user_picks = db.query(models.UserPick).filter(
        models.UserPick.tournament_id == id,
        models.UserPick.user_id == user_id
    ).all()
    
    all_rounds = ['R128', 'R64', 'R32', 'R16', 'QF', 'SF', 'F', 'W']
    starting_index = all_rounds.index(tournament.starting_round)
    rounds = all_rounds[starting_index:]
    
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
    return {
        **tournament_data.dict(),
        "rounds": rounds,
        "bracket": bracket,
        "has_picks": has_picks,
        **comparison_data
    }

@router.post("/picks/", response_model=dict)
async def save_pick(pick: dict, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    logger.info("Saving pick")
    pick["user_id"] = user["id"]
    saved_pick = save_pick(pick, db, user["id"])
    logger.info("Pick saved successfully")
    return saved_pick

@router.post("/picks/bulk")
async def save_picks_bulk(picks: List[dict], db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    logger.info("Saving picks in bulk")
    try:
        user_id = user["id"]
        if not picks:
            raise HTTPException(status_code=400, detail="No picks provided")
        
        tournament_id = picks[0]["tournament_id"]
        tournament = db.query(models.Tournament).filter(models.Tournament.id == tournament_id).first()
        if not tournament or tournament.status != "ACTIVE":
            raise HTTPException(status_code=403, detail="Tournament is not active")
        
        for pick in picks:
            pick["user_id"] = user_id
            save_pick(pick, db, user_id)
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
        result = [{"user_id": entry.user_id, "username": entry.username, "score": entry.score} for entry in leaderboard]
        logger.info(f"Returning {len(result)} leaderboard entries")
        return result
    except AttributeError:
        raise HTTPException(status_code=500, detail="Leaderboard table not found in database")