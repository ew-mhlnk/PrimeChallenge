from sqlalchemy.orm import Session
from database.models import DailyMatch, DailyPick, DailyLeaderboard
import logging

logger = logging.getLogger(__name__)

def process_match_results(match_id: str, db: Session):
    """
    1. Находит матч по ID.
    2. Проверяет, завершен ли он.
    3. Находит все прогнозы на этот матч, которые еще не посчитаны.
    4. Начисляет баллы и обновляет общий Лидерборд.
    """
    # 1. Получаем матч
    match = db.query(DailyMatch).filter(DailyMatch.id == match_id).first()
    
    if not match:
        logger.warning(f"Match {match_id} not found during calculation")
        return
    
    # Проверка: считаем только если матч реально завершен и есть победитель
    if match.status != "COMPLETED" or match.winner is None:
        return

    # 2. Ищем прогнозы, которые еще НЕ имеют статуса (is_correct is None)
    pending_picks = db.query(DailyPick).filter(
        DailyPick.match_id == match_id,
        DailyPick.is_correct.is_(None)
    ).all()

    if not pending_picks:
        return # Нечего считать

    logger.info(f"Calculating scores for Daily Match {match_id}. Picks: {len(pending_picks)}")

    # === ОПТИМИЗАЦИЯ И ЗАЩИТА ОТ ДУБЛЕЙ ===
    # Сначала загружаем существующие записи лидерборда для этих пользователей
    user_ids = [p.user_id for p in pending_picks]
    existing_lbs = db.query(DailyLeaderboard).filter(DailyLeaderboard.user_id.in_(user_ids)).all()
    
    # Создаем словарь для быстрого поиска: {user_id: объект_лидерборда}
    lb_map = {lb.user_id: lb for lb in existing_lbs}

    count_correct = 0

    for pick in pending_picks:
        # 3. Сравнение
        is_win = (pick.predicted_winner == match.winner)
        
        # Обновляем сам пик
        pick.is_correct = is_win
        pick.points = 1 if is_win else 0
        
        if is_win:
            count_correct += 1

        # 4. Обновляем Лидерборд
        # Проверяем, есть ли юзер в нашей "карте" (в БД или только что создан)
        if pick.user_id in lb_map:
            lb_entry = lb_map[pick.user_id]
        else:
            # Если нет - создаем нового
            lb_entry = DailyLeaderboard(
                user_id=pick.user_id,
                total_points=0,
                correct_picks=0,
                total_picks=0
            )
            db.add(lb_entry)
            # ВАЖНО: Добавляем в карту, чтобы если этот юзер встретится снова в этом цикле,
            # мы не пытались создать его второй раз (это и вызывало ошибку!)
            lb_map[pick.user_id] = lb_entry
        
        # Накидываем статистику
        lb_entry.total_picks += 1
        if is_win:
            lb_entry.total_points += 1
            lb_entry.correct_picks += 1
            
    try:
        db.commit()
        logger.info(f"Finished calculation for {match_id}. Correct: {count_correct}/{len(pending_picks)}")
    except Exception as e:
        logger.error(f"Error committing match results: {e}")
        db.rollback()
