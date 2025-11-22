from sqlalchemy.orm import Session
from database import models
from fastapi import HTTPException
import logging

logger = logging.getLogger(__name__)

# Старая функция для одиночного сохранения (оставляем для совместимости, если где-то используется)
def save_pick(pick: dict, db: Session, user_id: int):
    try:
        tournament = db.query(models.Tournament).filter(models.Tournament.id == pick['tournament_id']).first()
        if not tournament:
            raise HTTPException(status_code=404, detail="Tournament not found")

        # Статус может быть Enum или строкой
        status_str = str(tournament.status.value if hasattr(tournament.status, 'value') else tournament.status)
        if status_str != "ACTIVE":
             raise HTTPException(status_code=403, detail=f"Tournament is not active (Status: {status_str})")

        # Логика одиночного сохранения (с каскадным удалением)
        match_db = db.query(models.TrueDraw).filter(
            models.TrueDraw.tournament_id == pick['tournament_id'],
            models.TrueDraw.round == pick['round'],
            models.TrueDraw.match_number == pick['match_number']
        ).first()
        
        p1 = match_db.player1 if match_db else "TBD"
        p2 = match_db.player2 if match_db else "TBD"

        existing = db.query(models.UserPick).filter(
            models.UserPick.user_id == user_id,
            models.UserPick.tournament_id == pick['tournament_id'],
            models.UserPick.round == pick['round'],
            models.UserPick.match_number == pick['match_number']
        ).first()

        if existing:
            existing.predicted_winner = pick['predicted_winner']
            existing.player1 = p1
            existing.player2 = p2
        else:
            db.add(models.UserPick(
                user_id=user_id,
                tournament_id=pick['tournament_id'],
                round=pick['round'],
                match_number=pick['match_number'],
                player1=p1,
                player2=p2,
                predicted_winner=pick['predicted_winner']
            ))
        
        # Каскадное удаление (только для одиночного режима!)
        all_rounds = ['R128', 'R64', 'R32', 'R16', 'QF', 'SF', 'F', 'Champion']
        if pick['round'] in all_rounds:
            idx = all_rounds.index(pick['round'])
            future_rounds = all_rounds[idx+1:]
            if future_rounds:
                db.query(models.UserPick).filter(
                    models.UserPick.user_id == user_id,
                    models.UserPick.tournament_id == pick['tournament_id'],
                    models.UserPick.round.in_(future_rounds)
                ).delete(synchronize_session=False)
        
        db.commit()
        return pick
    except Exception as e:
        db.rollback()
        raise e

# НОВАЯ ФУНКЦИЯ ДЛЯ МАССОВОГО СОХРАНЕНИЯ
def save_picks_bulk_transaction(picks_data: list, db: Session, user_id: int):
    if not picks_data:
        return []

    # 1. Проверка турнира (берем ID из первого пика)
    t_id = picks_data[0].tournament_id
    tournament = db.query(models.Tournament).filter(models.Tournament.id == t_id).first()
    
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
        
    status_str = str(tournament.status.value if hasattr(tournament.status, 'value') else tournament.status)
    if status_str != "ACTIVE":
        raise HTTPException(status_code=403, detail="Tournament closed")

    try:
        # 2. УДАЛЯЕМ ВСЕ старые прогнозы юзера на этот турнир
        # Это ключевой момент: мы стираем старое и пишем новое состояние целиком.
        db.query(models.UserPick).filter(
            models.UserPick.user_id == user_id,
            models.UserPick.tournament_id == t_id
        ).delete()

        # 3. Загружаем данные о матчах (чтобы заполнить имена игроков)
        true_draws = db.query(models.TrueDraw).filter(models.TrueDraw.tournament_id == t_id).all()
        # Словарь для быстрого поиска: (round, match_num) -> {p1, p2}
        match_map = {(m.round, m.match_number): (m.player1, m.player2) for m in true_draws}

        result_objs = []

        # 4. Вставляем новые прогнозы
        for pick in picks_data:
            players = match_map.get((pick.round, pick.match_number), ("TBD", "TBD"))
            
            new_pick = models.UserPick(
                user_id=user_id,
                tournament_id=pick.tournament_id,
                round=pick.round,
                match_number=pick.match_number,
                player1=players[0],
                player2=players[1],
                predicted_winner=pick.predicted_winner
            )
            db.add(new_pick)
            
            # Формируем ответ (mock object для Pydantic)
            result_objs.append({
                "id": 0,
                "user_id": user_id,
                "tournament_id": pick.tournament_id,
                "round": pick.round,
                "match_number": pick.match_number,
                "player1": players[0],
                "player2": players[1],
                "predicted_winner": pick.predicted_winner,
                "created_at": None,
                "updated_at": None
            })

        # 5. Коммитим всё разом
        db.commit()
        logger.info(f"User {user_id}: Saved {len(result_objs)} picks bulk.")
        return result_objs

    except Exception as e:
        db.rollback()
        logger.error(f"Bulk save failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))