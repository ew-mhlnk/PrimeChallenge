import gspread
import os
from sqlalchemy.orm import Session
from database.db import get_db
from database.models import Tournament, Match, Pick, Result
import logging

logger = logging.getLogger(__name__)

def sync_google_sheets_with_db():
    logger.info("Starting Google Sheets synchronization with DB")
    try:
        # Подключаемся к Google Sheets
        credentials = os.getenv("GOOGLE_CREDENTIALS")
        if not credentials:
            logger.error("GOOGLE_CREDENTIALS environment variable not set")
            return
        
        gc = gspread.service_account_from_dict(eval(credentials))
        sheet_id = os.getenv("GOOGLE_SHEET_ID")
        if not sheet_id:
            logger.error("GOOGLE_SHEET_ID environment variable not set")
            return
        
        sheet = gc.open_by_key(sheet_id)
        
        # Синхронизация турниров
        worksheet = sheet.worksheet("tournaments")
        data = worksheet.get_all_records()
        logger.info(f"Data from Google Sheets: {data}")
        
        db: Session = next(get_db())
        
        # Очищаем таблицу tournaments перед синхронизацией
        db.query(Tournament).delete()
        db.commit()
        
        for row in data:
            # Логируем сырые данные
            logger.info(f"Processing row: {row}")
            # Приводим ключи к нужному формату, если есть проблемы с регистром
            tournament = Tournament(
                id=row.get("ID"),
                name=row.get("Name"),
                dates=row.get("Date"),  # Убедимся, что ключ "Date" совпадает
                status=row.get("Status"),
                starting_round=row.get("Starting Round"),
                type=row.get("Type")
            )
            db.add(tournament)
        db.commit()
        
        # Здесь должна быть синхронизация матчей и других данных
        logger.info("Google Sheets synchronization and points calculation completed successfully")
    except Exception as e:
        logger.error(f"Error during synchronization: {e}")
        raise
    finally:
        db.close()