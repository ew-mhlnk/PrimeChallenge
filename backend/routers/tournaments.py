from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database.db import get_db
from database import models
import logging
from schemas import Tournament, TrueDraw
from utils.auth import get_current_user

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
async def get_tournament_by_id(id: int, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    logger.info(f"Fetching tournament with id={id}")
    tournament = db.query(models.Tournament).filter(models.Tournament.id == id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    user_id = user["id"]
    logger.info(f"Using user_id={user_id} for picks")
    
    # Загружаем матчи первого раунда (R32)
    true_draws = (
        db.query(models.TrueDraw)
        .filter(models.TrueDraw.tournament_id == id, models.TrueDraw.round == 'R32')
        .all()
    )
    
    # Загружаем пики пользователя (если есть)
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
        "true_draws": true_draws,  # Матчи R32
        "user_picks": user_picks,  # Пики пользователя
    }
    
    logger.info(f"Returning tournament with id={id}, true_draws count={len(true_draws)}, user_picks count={len(user_picks)}")
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
async def save_pick(pick: dict, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    logger.info("Saving pick")
    try:
        pick["user_id"] = user["id"]
        
        # Проверяем существование матча
        match = db.query(models.TrueDraw).filter(
            models.TrueDraw.tournament_id == pick['tournament_id'],
            models.TrueDraw.round == pick['round'],
            models.TrueDraw.match_number == pick['match_number']
        ).first()
        if not match:
            raise HTTPException(status_code=404, detail="Match not found")
        
        # Проверяем, что predicted_winner — один из игроков
        if pick['predicted_winner'] not in [match.player1, match.player2]:
            raise HTTPException(status_code=400, detail="Predicted winner must be one of the players")
        
        # Сохраняем или обновляем пик
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
        result = [
            {"user_id": entry.user_id, "username": entry.username, "score": entry.score}
            for entry in leaderboard
        ]
        logger.info(f"Returning {len(result)} leaderboard entries")
        return result
    except AttributeError:
        raise HTTPException(status_code=500, detail="Leaderboard table not found in database")