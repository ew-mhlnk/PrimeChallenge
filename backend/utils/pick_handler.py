from sqlalchemy.orm import Session
from database import models
from fastapi import HTTPException
import logging

logger = logging.getLogger(__name__)

# Старая функция (можно оставить для совместимости, но мы используем новую)
def save_pick(pick: dict, db: Session, user_id: int):
    # ... (старый код, не меняем)
    pass 

# === ГЛАВНАЯ ФУНКЦИЯ ДЛЯ СОХРАНЕНИЯ ===
def save_picks_bulk_transaction(picks_data: list, db: Session, user_id: int):
    if not picks_data:
        return []

    # 1. Проверка турнира (берем ID из первого пика)
    t_id = picks_data[0].tournament_id
    tournament = db.query(models.Tournament).filter(models.Tournament.id == t_id).first()
    
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
        
    # Проверка статуса
    status_str = str(tournament.status.value if hasattr(tournament.status, 'value') else tournament.status)
    if status_str != "ACTIVE":
        logger.warning(f"User {user_id} tried to save to closed tournament {t_id} (Status: {status_str})")
        raise HTTPException(status_code=403, detail="Tournament is closed")

    try:
        # 2. УДАЛЯЕМ ВСЕ старые прогнозы юзера на этот турнир
        # Это безопаснее, чем обновлять по одному
        db.query(models.UserPick).filter(
            models.UserPick.user_id == user_id,
            models.UserPick.tournament_id == t_id
        ).delete(synchronize_session=False) # synchronize_session=False быстрее

        # 3. Загружаем данные о матчах (чтобы заполнить player1/player2 в БД для истории)
        true_draws = db.query(models.TrueDraw).filter(models.TrueDraw.tournament_id == t_id).all()
        
        # Создаем карту: (round, match_number) -> (player1, player2)
        match_map = {}
        for m in true_draws:
            match_map[(m.round, m.match_number)] = (m.player1, m.player2)

        result_objs = []

        # 4. Вставляем новые прогнозы
        for pick in picks_data:
            # Если такого матча нет в true_draw (например, глюк синка), ставим TBD
            # Для раунда Champion match_map вернет имя победителя и None
            players = match_map.get((pick.round, pick.match_number), ("TBD", "TBD"))
            
            p1 = players[0] if players[0] else "TBD"
            p2 = players[1] if players[1] else "TBD"

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
            
            # Для ответа фронтенду
            result_objs.append({
                "id": 0, # Фейковый ID, так как реальный появится после commit
                "user_id": user_id,
                "tournament_id": pick.tournament_id,
                "round": pick.round,
                "match_number": pick.match_number,
                "player1": p1,
                "player2": p2,
                "predicted_winner": pick.predicted_winner,
                "created_at": None,
                "updated_at": None
            })

        # 5. Коммитим всё одной транзакцией
        db.commit()
        logger.info(f"User {user_id}: Successfully saved {len(result_objs)} picks.")
        return result_objs

    except Exception as e:
        db.rollback()
        logger.error(f"Bulk save transaction failed: {e}")
        raise e