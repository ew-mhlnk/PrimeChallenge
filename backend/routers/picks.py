from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.db import get_db
from database import models
from auth import get_current_user
import logging

router = APIRouter()

logger = logging.getLogger(__name__)

# Получение пиков пользователя для турнира
@router.get("/")
async def get_picks(
    tournament_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user),
):
    logger.info(f"Fetching picks for user_id={user_id}, tournament_id={tournament_id}")
    picks = (
        db.query(models.UserPick)
        .filter(
            models.UserPick.user_id == user_id,
            models.UserPick.tournament_id == tournament_id,
        )
        .all()
    )
    return [p.__dict__ for p in picks]

# Сохранение пиков пользователя
@router.post("/")
async def save_picks(
    picks: list[dict],
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user),
):
    logger.info(f"Saving picks for user_id={user_id}")
    try:
        # Получаем ID турнира из первого пика
        tournament_id = picks[0]["tournament_id"]
        
        # Проверяем статус турнира
        tournament = db.query(models.Tournament).filter(models.Tournament.id == tournament_id).first()
        if not tournament:
            raise HTTPException(status_code=404, detail="Tournament not found")
        if tournament.status != models.TournamentStatus.ACTIVE:
            raise HTTPException(status_code=403, detail="Cannot modify picks: tournament is not active")

        # Удаляем старые пики пользователя для этого турнира
        db.query(models.UserPick).filter(
            models.UserPick.user_id == user_id,
            models.UserPick.tournament_id == tournament_id,
        ).delete()

        # Сохраняем новые пики
        for pick in picks:
            new_pick = models.UserPick(
                user_id=user_id,
                tournament_id=pick["tournament_id"],
                round=pick["round"],
                match_number=pick["match_number"],
                player1=pick["player1"],
                player2=pick["player2"],
                predicted_winner=pick["predicted_winner"],
            )
            db.add(new_pick)
        
        db.commit()
        
        # Пересчитываем очки для пользователя
        calculate_user_scores(tournament_id, user_id, db)
        
        return {"status": "success"}
    except Exception as e:
        db.rollback()
        logger.error(f"Error saving picks: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error saving picks: {str(e)}")

# Сравнение пиков пользователя с реальными результатами
@router.get("/compare")
async def compare_picks(
    tournament_id: int,
    user_id: int,
    db: Session = Depends(get_db),
):
    logger.info(f"Comparing picks for user_id={user_id}, tournament_id={tournament_id}")
    user_picks = (
        db.query(models.UserPick)
        .filter(
            models.UserPick.user_id == user_id,
            models.UserPick.tournament_id == tournament_id,
        )
        .all()
    )
    true_draws = (
        db.query(models.TrueDraw)
        .filter(models.TrueDraw.tournament_id == tournament_id)
        .all()
    )

    comparison = []
    for pick in user_picks:
        true_match = next(
            (td for td in true_draws if td.round == pick.round and td.match_number == pick.match_number),
            None,
        )
        if true_match and true_match.winner:
            comparison.append({
                "round": pick.round,
                "match_number": pick.match_number,
                "player1": pick.player1,
                "player2": pick.player2,
                "predicted_winner": pick.predicted_winner,
                "actual_winner": true_match.winner,
                "correct": pick.predicted_winner == true_match.winner,
            })

    return comparison

# Функция для подсчета очков пользователя
def calculate_user_scores(tournament_id: int, user_id: int, db: Session):
    logger.info(f"Calculating scores for user_id={user_id}, tournament_id={tournament_id}")
    
    # Получаем турнир
    tournament = db.query(models.Tournament).filter(models.Tournament.id == tournament_id).first()
    if not tournament:
        logger.error(f"Tournament {tournament_id} not found")
        return

    # Определяем систему начисления очков в зависимости от типа турнира
    scoring_system = {
        "ATP 250": {"R16": 2, "QF": 3, "SF": 4, "F": 6},
        "WTA 250": {"R16": 2, "QF": 3, "SF": 4, "F": 6},
        "ATP 500": {"R16": 2, "QF": 3, "SF": 4, "F": 6},
        "WTA 500": {"R16": 2, "QF": 3, "SF": 4, "F": 6},
        "ATP 1000": {"R32": 2, "R16": 4, "QF": 8, "SF": 12, "F": 16},
        "WTA 1000": {"R32": 2, "R16": 4, "QF": 8, "SF": 12, "F": 16},
        "Grand Slam": {"R64": 1, "R32": 4, "R16": 8, "QF": 12, "SF": 16, "F": 20},
    }

    tournament_type = tournament.type
    if tournament_type not in scoring_system:
        logger.warning(f"Unknown tournament type {tournament_type}, defaulting to ATP 250 scoring")
        tournament_type = "ATP 250"

    # Получаем пики пользователя и реальные результаты
    user_picks = (
        db.query(models.UserPick)
        .filter(
            models.UserPick.user_id == user_id,
            models.UserPick.tournament_id == tournament_id,
        )
        .all()
    )
    true_draws = (
        db.query(models.TrueDraw)
        .filter(models.TrueDraw.tournament_id == tournament_id)
        .all()
    )

    total_score = 0
    correct_picks = 0

    # Сравниваем пики с реальными результатами
    for pick in user_picks:
        true_match = next(
            (td for td in true_draws if td.round == pick.round and td.match_number == pick.match_number),
            None,
        )
        if true_match and true_match.winner and pick.predicted_winner:
            if pick.predicted_winner == true_match.winner:
                # Пик верный, начисляем баллы
                round_score = scoring_system[tournament_type].get(pick.round, 0)
                total_score += round_score
                correct_picks += 1

    # Обновляем или создаем запись в user_scores
    user_score = (
        db.query(models.UserScore)
        .filter(
            models.UserScore.user_id == user_id,
            models.UserScore.tournament_id == tournament_id,
        )
        .first()
    )
    if user_score:
        user_score.score = total_score
        user_score.correct_picks = correct_picks
    else:
        user_score = models.UserScore(
            user_id=user_id,
            tournament_id=tournament_id,
            score=total_score,
            correct_picks=correct_picks,
        )
        db.add(user_score)
    
    db.commit()
    logger.info(f"Updated scores for user_id={user_id}, tournament_id={tournament_id}: score={total_score}, correct_picks={correct_picks}")