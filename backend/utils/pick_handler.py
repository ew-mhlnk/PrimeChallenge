# utils/pick_handler.py
from sqlalchemy.orm import Session
from database import models
from fastapi import HTTPException
import logging

logger = logging.getLogger(__name__)

def save_pick(pick: dict, db: Session, user_id: int):
    try:
        # 1. Проверяем турнир
        tournament = db.query(models.Tournament).filter(models.Tournament.id == pick['tournament_id']).first()
        if not tournament:
            logger.error(f"Tournament {pick['tournament_id']} not found")
            raise HTTPException(status_code=404, detail="Tournament not found")

        # 2. Проверяем статус (строгая конвертация в строку для надежности)
        status_str = str(tournament.status.value if hasattr(tournament.status, 'value') else tournament.status)
        if status_str != "ACTIVE":
            logger.warning(f"Attempt to pick in non-ACTIVE tournament: {status_str}")
            raise HTTPException(status_code=403, detail=f"Tournament is not active (Status: {status_str})")
        
        # 3. Получаем имена игроков (если матч есть в базе)
        # Если матча нет (например, будущий раунд), используем TBD
        match_db = db.query(models.TrueDraw).filter(
            models.TrueDraw.tournament_id == pick['tournament_id'],
            models.TrueDraw.round == pick['round'],
            models.TrueDraw.match_number == pick['match_number']
        ).first()

        player1_name = match_db.player1 if match_db else "TBD"
        player2_name = match_db.player2 if match_db else "TBD"

        # 4. Ищем существующий пик пользователя
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
            logger.info(f"Updated pick for user {user_id}: {pick['round']} #{pick['match_number']} -> {pick['predicted_winner']}")
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
            logger.info(f"Created new pick for user {user_id}: {pick['round']} #{pick['match_number']} -> {pick['predicted_winner']}")
        
        # 5. Каскадное удаление (очистка будущих раундов)
        # Важно: список должен включать 'Champion'
        all_rounds = ['R128', 'R64', 'R32', 'R16', 'QF', 'SF', 'F', 'Champion']
        
        if pick['round'] in all_rounds:
            current_round_idx = all_rounds.index(pick['round'])
            # Удаляем прогнозы на ВСЕ следующие раунды
            rounds_to_clear = all_rounds[current_round_idx + 1:]
            
            if rounds_to_clear:
                deleted = db.query(models.UserPick).filter(
                    models.UserPick.user_id == user_id,
                    models.UserPick.tournament_id == pick['tournament_id'],
                    models.UserPick.round.in_(rounds_to_clear)
                ).delete(synchronize_session=False)
                logger.info(f"Cascading delete: removed {deleted} future picks for user {user_id}")
        
        # Commit делается вызывающей функцией (bulk) или здесь, если это одиночный вызов
        # Но для надежности bulk-операций лучше делать flush здесь
        db.flush()
        return pick

    except Exception as e:
        logger.error(f"Error in save_pick: {str(e)}")
        raise e