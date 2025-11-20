# utils/pick_handler.py
from sqlalchemy.orm import Session
from database import models
from fastapi import HTTPException
import logging

logger = logging.getLogger(__name__)

def save_pick(pick: dict, db: Session, user_id: int):
    tournament = db.query(models.Tournament).filter(models.Tournament.id == pick['tournament_id']).first()
    
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")

    # Проверка статуса
    status_str = str(tournament.status.value if hasattr(tournament.status, 'value') else tournament.status)
    if status_str != "ACTIVE":
        raise HTTPException(status_code=403, detail=f"Tournament is not active (Status: {status_str})")
    
    # Ищем матч. Если раунд Champion, то это финал
    # Но в нашей логике фронтенда мы шлем round="Champion".
    # Нужно убедиться, что такой раунд существует или маппить его.
    
    # ЛОГИКА СОХРАНЕНИЯ
    # Сначала проверяем, есть ли старый пик
    existing_pick = db.query(models.UserPick).filter(
        models.UserPick.user_id == user_id,
        models.UserPick.tournament_id == pick['tournament_id'],
        models.UserPick.round == pick['round'],
        models.UserPick.match_number == pick['match_number']
    ).first()

    player1_name = "TBD"
    player2_name = "TBD"
    
    # Пытаемся найти реальный матч для имен игроков (опционально)
    match_db = db.query(models.TrueDraw).filter(
        models.TrueDraw.tournament_id == pick['tournament_id'],
        models.TrueDraw.round == pick['round'],
        models.TrueDraw.match_number == pick['match_number']
    ).first()
    if match_db:
        player1_name = match_db.player1
        player2_name = match_db.player2

    if existing_pick:
        existing_pick.predicted_winner = pick['predicted_winner']
        existing_pick.player1 = player1_name
        existing_pick.player2 = player2_name
    else:
        db_pick = models.UserPick(
            user_id=user_id,
            tournament_id=pick['tournament_id'],
            round=pick['round'],
            match_number=pick['match_number'],
            player1=player1_name,
            player2=player2_name,
            predicted_winner=pick['predicted_winner']
        )
        db.add(db_pick)
    
    # Очистка будущих раундов (Cascading deletion)
    # Исправленный список раундов, совпадающий с routers/tournaments.py
    all_rounds = ['R128', 'R64', 'R32', 'R16', 'QF', 'SF', 'F', 'Champion']
    
    if pick['round'] in all_rounds:
        current_round_idx = all_rounds.index(pick['round'])
        # Удаляем прогнозы на ВСЕ следующие раунды, так как сетка изменилась
        for round_name in all_rounds[current_round_idx + 1:]:
            db.query(models.UserPick).filter(
                models.UserPick.user_id == user_id,
                models.UserPick.tournament_id == pick['tournament_id'],
                models.UserPick.round == round_name
            ).delete()
    
    db.commit()
    return pick