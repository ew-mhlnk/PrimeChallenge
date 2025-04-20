from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict
import logging
from database.db import get_db
from database.models import UserPick, TrueDraw, Tournament
from utils.auth import verify_telegram_data

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/{tournament_id}", response_model=List[Dict])
async def get_results(tournament_id: int, request: Dict, db: Session = Depends(get_db)):
    init_data = request.get("initData")
    if not init_data:
        logger.error("Missing initData in request")
        raise HTTPException(status_code=400, detail="Missing initData")

    telegram_user = verify_telegram_data(init_data)
    if not telegram_user:
        logger.error("Invalid Telegram initData")
        raise HTTPException(status_code=401, detail="Invalid Telegram initData")

    user_id = telegram_user.get("id")
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        logger.error(f"Tournament with ID {tournament_id} not found")
        raise HTTPException(status_code=404, detail="Tournament not found")

    if tournament.status != "CLOSED":
        logger.warning(f"Tournament {tournament_id} is not closed")
        raise HTTPException(status_code=400, detail="Tournament is not closed")

    true_draws = db.query(TrueDraw).filter(TrueDraw.tournament_id == tournament_id).all()
    user_picks = db.query(UserPick).filter(
        UserPick.tournament_id == tournament_id,
        UserPick.user_id == user_id
    ).all()

    results = []
    for pick in user_picks:
        true_match = next((td for td in true_draws if td.round == pick.round and td.match_number == pick.match_number), None)
        if true_match and true_match.winner:
            is_correct = true_match.winner == pick.predicted_winner
            results.append({
                "match_number": pick.match_number,
                "round": pick.round,
                "player1": pick.player1,
                "player2": pick.player2,
                "predicted_winner": pick.predicted_winner,
                "actual_winner": true_match.winner,
                "is_correct": is_correct
            })

    logger.info(f"Retrieved results for user {user_id} in tournament {tournament_id}")
    return results