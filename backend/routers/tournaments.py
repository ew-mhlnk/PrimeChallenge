from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict
from database.db import get_db
from database import models
import logging
from schemas import Tournament, TrueDraw, UserPick, UserScore
from utils.auth import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)

def compute_comparison_and_scores(tournament: models.Tournament, user_id: int, db: Session) -> Dict:
    user_picks = db.query(models.UserPick).filter(
        models.UserPick.tournament_id == tournament.id,
        models.UserPick.user_id == user_id
    ).all()
    
    true_draws = db.query(models.TrueDraw).filter_by(tournament_id=tournament.id).all()
    
    comparison = []
    correct_count = 0
    for match in true_draws:
        pick = next((p for p in user_picks if p.round == match.round and p.match_number == match.match_number), None)
        is_correct = pick and pick.predicted_winner == match.winner and match.winner is not None
        if is_correct:
            correct_count += 1
        comparison.append({
            "round": match.round,
            "match_number": match.match_number,
            "player1": match.player1 or "TBD",
            "player2": match.player2 or "TBD",
            "predicted_winner": pick.predicted_winner if pick else "",
            "actual_winner": match.winner or "",
            "correct": is_correct
        })
    
    user_score = db.query(models.UserScore).filter_by(
        user_id=user_id,
        tournament_id=tournament.id
    ).first()
    if user_score:
        user_score.correct_picks = correct_count
        user_score.score = correct_count * 10
        db.commit()
    else:
        new_score = models.UserScore(
            user_id=user_id,
            tournament_id=tournament.id,
            score=correct_count * 10,
            correct_picks=correct_count
        )
        db.add(new_score)
        db.commit()
    
    return {"comparison": comparison, "correct_picks": correct_count, "score": correct_count * 10}

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

@router.get("/tournament/{id}", response_model=Tournament)
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
    
    comparison_data = compute_comparison_and_scores(tournament, user_id, db) if tournament.status in ["CLOSED", "COMPLETED"] else {}
    
    # Явное преобразование в Pydantic-модель
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
        scores=None  # Если не используется
    )
    
    logger.info(f"Returning tournament with id={id}, true_draws count={len(true_draws)}, user_picks count={len(user_picks)}")
    return {**tournament_data.dict(), **comparison_data}

@router.get("/picks/", response_model=List[dict])
async def get_picks(tournament_id: int, user_id: int, db: Session = Depends(get_db)):
    logger.info(f"Fetching picks for tournament_id={tournament_id}, user_id={user_id}")
    picks = db.query(models.UserPick).filter(
        models.UserPick.tournament_id == tournament_id,
        models.UserPick.user_id == user_id
    ).all()
    logger.info(f"Returning {len(picks)} picks")
    return picks

@router.post("/picks/", response_model=dict)
async def save_pick(pick: dict, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    logger.info("Saving pick")
    try:
        pick["user_id"] = user["id"]
        match = db.query(models.TrueDraw).filter(
            models.TrueDraw.tournament_id == pick['tournament_id'],
            models.TrueDraw.round == pick['round'],
            models.TrueDraw.match_number == pick['match_number']
        ).first()
        if not match:
            raise HTTPException(status_code=404, detail="Match not found")
        if pick['predicted_winner'] not in [match.player1, match.player2]:
            raise HTTPException(status_code=400, detail="Predicted winner must be one of the players")
        
        existing_pick = db.query(models.UserPick).filter(
            models.UserPick.user_id == pick['user_id'],
            models.UserPick.tournament_id == pick['tournament_id'],
            models.UserPick.round == pick['round'],
            models.UserPick.match_number == pick['match_number']
        ).first()
        if existing_pick:
            existing_pick.predicted_winner = pick['predicted_winner']
        else:
            db_pick = models.UserPick(
                user_id=pick['user_id'],
                tournament_id=pick['tournament_id'],
                round=pick['round'],
                match_number=pick['match_number'],
                player1=match.player1,
                player2=match.player2,
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
async def save_picks_bulk(picks: List[dict], db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    logger.info("Saving picks in bulk")
    try:
        for pick in picks:
            pick["user_id"] = user["id"]
            existing_pick = db.query(models.UserPick).filter(
                models.UserPick.user_id == pick['user_id'],
                models.UserPick.tournament_id == pick['tournament_id'],
                models.UserPick.round == pick['round'],
                models.UserPick.match_number == pick['match_number']
            ).first()
            if existing_pick:
                existing_pick.predicted_winner = pick['predicted_winner']
            else:
                match = db.query(models.TrueDraw).filter(
                    models.TrueDraw.tournament_id == pick['tournament_id'],
                    models.TrueDraw.round == pick['round'],
                    models.TrueDraw.match_number == pick['match_number']
                ).first()
                if not match:
                    raise HTTPException(status_code=404, detail=f"Match not found for round={pick['round']}, match_number={pick['match_number']}")
                db_pick = models.UserPick(
                    user_id=pick['user_id'],
                    tournament_id=pick['tournament_id'],
                    round=pick['round'],
                    match_number=pick['match_number'],
                    player1=match.player1,
                    player2=match.player2,
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
        result = [{"user_id": entry.user_id, "username": entry.username, "score": entry.score} for entry in leaderboard]
        logger.info(f"Returning {len(result)} leaderboard entries")
        return result
    except AttributeError:
        raise HTTPException(status_code=500, detail="Leaderboard table not found in database")