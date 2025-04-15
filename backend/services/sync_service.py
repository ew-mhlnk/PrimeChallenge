import gspread
import os
from sqlalchemy.orm import Session
from database.db import get_db
from database.models import Tournament
import logging

logger = logging.getLogger(__name__)

def sync_google_sheets_with_db():
    logger.info("Starting Google Sheets synchronization with DB")
    db = None  # Инициализируем db как None
    try:
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
        
        try:
            worksheet = sheet.worksheet("tournaments")
            data = worksheet.get_all_records()
            logger.info(f"Data from Google Sheets: {data}")
        except gspread.exceptions.WorksheetNotFound:
            logger.error("Worksheet 'tournaments' not found in Google Sheets")
            return  # Просто логируем и выходим, не ломая приложение
        
        db = next(get_db())  # Инициализируем db только если дошли до этого места
        
        # Очищаем таблицу Tournament
        db.query(Tournament).delete()
        db.commit()
        
        # Добавляем данные из Google Sheets
        for row in data:
            logger.info(f"Processing row: {row}")
            tournament = Tournament(
                id=row.get("ID"),
                name=row.get("Name"),
                dates=row.get("Date"),
                status=row.get("Status"),
                starting_round=row.get("Starting Round"),
                type=row.get("Type")
            )
            db.add(tournament)
        db.commit()
        
        logger.info("Google Sheets synchronization completed successfully")
    except Exception as e:
        logger.error(f"Error during synchronization: {e}")
        if db:
            db.rollback()
    finally:
        if db:  # Закрываем db только если она была создана
            db.close()