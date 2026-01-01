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
    
    if match.status != "COMPLETED" or match.winner is None:
        # Нельзя считать, если матч не закончен
        return

    # 2. Ищем прогнозы, которые еще НЕ имеют статуса (is_correct is None)
    # Это защита от двойного начисления очков за один и тот же матч
    pending_picks = db.query(DailyPick).filter(
        DailyPick.match_id == match_id,
        DailyPick.is_correct.is_(None)
    ).all()

    if not pending_picks:
        return # Нечего считать

    logger.info(f"Calculating scores for Daily Match {match_id}. Picks: {len(pending_picks)}")

    count_correct = 0

    for pick in pending_picks:
        # 3. Сравнение
        is_win = (pick.predicted_winner == match.winner)
        
        # Обновляем сам пик
        pick.is_correct = is_win
        pick.points = 1 if is_win else 0
        
        if is_win:
            count_correct += 1

        # 4. Обновляем Лидерборд (Накопительный итог)
        lb_entry = db.query(DailyLeaderboard).filter(DailyLeaderboard.user_id == pick.user_id).first()
        
        if not lb_entry:
            # Если юзера нет в лидерборде - создаем
            lb_entry = DailyLeaderboard(
                user_id=pick.user_id,
                total_points=0,
                correct_picks=0,
                total_picks=0
            )
            db.add(lb_entry)
        
        # Накидываем статистику
        lb_entry.total_picks += 1
        if is_win:
            lb_entry.total_points += 1 # Сейчас 1 очко за победу
            lb_entry.correct_picks += 1
            
    db.commit()
    logger.info(f"Finished calculation for {match_id}. Correct: {count_correct}/{len(pending_picks)}")