import logging

# Настраиваем логгер
logger = logging.getLogger("Audit")

# ID юзера, за которым следим (можешь менять его здесь)
TARGET_USER_ID = 5198867011

def audit_pick(user_id, round_name, match_num, pick, real_winner, points, is_hit):
    """
    Записывает в лог результат конкретного прогноза, 
    но ТОЛЬКО если это целевой юзер.
    """
    if user_id != TARGET_USER_ID:
        return

    if is_hit:
        logger.info(f"✅ User {user_id} | {round_name} #{match_num} | Выбрал: {pick} | +{points} очков")
    else:
        logger.info(f"❌ User {user_id} | {round_name} #{match_num} | Выбрал: {pick} (Победил: {real_winner}) | 0 очков")

def audit_summary(user_id, total_score, total_correct):
    """
    Финальный отчет по юзеру.
    """
    if user_id == TARGET_USER_ID:
        logger.info(f"🏁 ИТОГ для {user_id}: {total_score} очков, {total_correct} верных исходов.")
        logger.info("---------------------------------------------------")