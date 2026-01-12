import time
import schedule
import logging
import sys

# Импортируем нашу функцию обновления
from tennis_service import update_google_sheet_from_api, load_dictionary_from_sheets

# Настройка логов
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - [PARSER] - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

def job():
    logger.info("⏳ Starting scheduled update...")
    try:
        update_google_sheet_from_api()
        logger.info("✅ Update finished successfully.")
    except Exception as e:
        logger.error(f"❌ Error during update: {e}")

if __name__ == "__main__":
    logger.info("🚀 Starting Tennis Parser Service...")
    
    # 1. Загружаем словарь имен при старте
    try:
        load_dictionary_from_sheets()
    except Exception as e:
        logger.error(f"Initial dictionary load failed: {e}")

    # 2. Делаем первый прогон сразу при запуске
    job()

    # 3. Настраиваем расписание
    # Обновлять матчи каждые 2 минуты
    schedule.every(2).minutes.do(job)
    
    # Обновлять словарь имен раз в час
    schedule.every(1).hours.do(load_dictionary_from_sheets)

    # 4. Вечный цикл
    while True:
        schedule.run_pending()
        time.sleep(1)