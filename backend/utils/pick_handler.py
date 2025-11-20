from sqlalchemy.orm import Session
from database import models
from fastapi import HTTPException
import logging

logger = logging.getLogger(__name__)

def save_pick(pick: dict, db: Session, user_id: int):
    tournament = db.query(models.Tournament).filter(models.Tournament.id == pick['tournament_id']).first()
    
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")

    # Надежная проверка статуса (работает и с Enum, и со строкой)
    status_str = str(tournament.status.value if hasattr(tournament.status, 'value') else tournament.status)
    
    if status_str != "ACTIVE":
        logger.warning(f"Attempt to save pick for CLOSED tournament {tournament.id}. Status: {status_str}")
        raise HTTPException(status_code=403, detail=f"Tournament is not active (Status: {status_str})")
    
    # Ищем матч в "Истинной сетке"
    match = db.query(models.TrueDraw).filter(
        models.TrueDraw.tournament_id == pick['tournament_id'],
        models.TrueDraw.round == pick['round'],
        models.TrueDraw.match_number == pick['match_number']
    ).first()

    # Если матч не найден в БД (например, это будущий раунд TBD),
    # мы все равно разрешаем сохранить выбор пользователя, 
    # так как он может "пронести" победителя в несуществующий пока матч.
    player1_name = match.player1 if match else "TBD"
    player2_name = match.player2 if match else "TBD"

    # Проверяем или создаем пик
    existing_pick = db.query(models.UserPick).filter(
        models.UserPick.user_id == user_id,
        models.UserPick.tournament_id == pick['tournament_id'],
        models.UserPick.round == pick['round'],
        models.UserPick.match_number == pick['match_number']
    ).first()

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
    
    # Важно: Если меняем пик, нужно очистить зависимые пики в следующих раундах?
    # Пока оставим простую логику перезаписи.
    
    db.commit()
    return pick