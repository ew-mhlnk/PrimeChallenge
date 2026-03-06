from sqlalchemy.orm import Session
from database import models
from fastapi import HTTPException
import logging

logger = logging.getLogger(__name__)

def save_picks_bulk_transaction(picks_data: list, db: Session, user_id: int):
    """
    Безопасное сохранение прогнозов (Upsert).
    Не удаляет старые данные, только обновляет измененные или добавляет новые.
    """
    if not picks_data:
        return []

    # 1. Проверка турнира
    t_id = picks_data[0].tournament_id
    tournament = db.query(models.Tournament).filter(models.Tournament.id == t_id).first()
    
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
        
    status_str = str(tournament.status.value if hasattr(tournament.status, 'value') else tournament.status)
    
    # === GOD MODE: ТЕСТЕРЫ ===
    TESTERS = [1783228089, 1009165444, 360269274]
    TEST_TOURNAMENTS = [116, 29]
    
    # Если это тестер в нужном турнире - разрешаем (пропускаем проверку)
    is_tester = (user_id in TESTERS and t_id in TEST_TOURNAMENTS)
    
    # Проверка статуса (только если НЕ тестер)
    if status_str != "ACTIVE" and not is_tester:
        logger.warning(f"User {user_id} tried to save to closed tournament {t_id}")
        raise HTTPException(status_code=403, detail="Tournament is closed")
    # ==========================

    try:
        # 2. Получаем ВСЕ существующие пики юзера для этого турнира
        existing_picks = db.query(models.UserPick).filter(
            models.UserPick.user_id == user_id,
            models.UserPick.tournament_id == t_id
        ).all()

        existing_map = {
            (p.round, p.match_number): p for p in existing_picks
        }

        # 3. Загружаем данные о матчах
        true_draws = db.query(models.TrueDraw).filter(models.TrueDraw.tournament_id == t_id).all()
        match_map = {
            (m.round, m.match_number): (m.player1, m.player2) for m in true_draws
        }

        result_objs = []
        updates_count = 0
        inserts_count = 0

        for pick in picks_data:
            key = (pick.round, pick.match_number)
            
            players = match_map.get(key, ("TBD", "TBD"))
            p1 = players[0] if players[0] else "TBD"
            p2 = players[1] if players[1] else "TBD"

            if key in existing_map:
                # UPDATE
                db_pick = existing_map[key]
                if db_pick.predicted_winner != pick.predicted_winner:
                    db_pick.predicted_winner = pick.predicted_winner
                    db_pick.player1 = p1 
                    db_pick.player2 = p2
                    updates_count += 1
                result_objs.append(db_pick)
            else:
                # INSERT
                new_pick = models.UserPick(
                    user_id=user_id,
                    tournament_id=pick.tournament_id,
                    round=pick.round,
                    match_number=pick.match_number,
                    player1=p1,
                    player2=p2,
                    predicted_winner=pick.predicted_winner
                )
                db.add(new_pick)
                inserts_count += 1
                result_objs.append(new_pick)

        db.commit()
        
        if updates_count > 0 or inserts_count > 0:
            logger.info(f"Save User {user_id}: Inserts={inserts_count}, Updates={updates_count}")
        
        return result_objs

    except Exception as e:
        db.rollback()
        logger.error(f"CRITICAL ERROR saving picks for user {user_id}: {str(e)}")
        raise e