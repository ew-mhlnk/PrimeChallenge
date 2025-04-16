import gspread
import os
from sqlalchemy.orm import Session
from database.db import get_db
from database.models import Tournament, Match, Pick
import logging

logger = logging.getLogger(__name__)

def sync_google_sheets_with_db():
    logger.info("Starting Google Sheets synchronization with DB")
    db = None  # Инициализируем db как None, чтобы избежать UnboundLocalError
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
        try:
            worksheet = sheet.worksheet("tournaments")
            data = worksheet.get_all_records()
            logger.info(f"Data from Google Sheets (tournaments): {data}")
        except gspread.exceptions.WorksheetNotFound:
            logger.error("Worksheet 'tournaments' not found in Google Sheets")
            return
        
        db = next(get_db())
        
        # Очищаем таблицу tournaments перед синхронизацией
        logger.info("Clearing existing tournaments")
        db.query(Tournament).delete()
        db.commit()
        
        for row in data:
            logger.info(f"Processing tournament row: {row}")
            tournament = Tournament(
                id=row.get("ID"),
                name=row.get("Name"),
                dates=row.get("Date"),
                status=row.get("Status"),
                starting_round=row.get("Starting Round"),
                type=row.get("Type")
            )
            db.add(tournament)
            logger.info(f"Added tournament to DB: {tournament.name}")
        db.commit()
        
        # Синхронизация матчей
        try:
            worksheet = sheet.worksheet("matches")
            match_data = worksheet.get_all_records()
            logger.info(f"Data from Google Sheets (matches): {match_data}")
        except gspread.exceptions.WorksheetNotFound:
            logger.error("Worksheet 'matches' not found in Google Sheets")
            return
        
        # Очищаем таблицу matches перед синхронизацией
        logger.info("Clearing existing matches")
        db.query(Match).delete()
        db.commit()
        
        for row in match_data:
            logger.info(f"Processing match row: {row}")
            match = Match(
                id=row.get("ID"),
                tournament_id=row.get("Tournament ID"),
                round=row.get("Round"),
                match_number=row.get("Match Number"),
                player1=row.get("Player 1"),
                player2=row.get("Player 2"),
                set1=row.get("Set 1", None),
                set2=row.get("Set 2", None),
                set3=row.get("Set 3", None),
                set4=row.get("Set 4", None),
                set5=row.get("Set 5", None),
                winner=row.get("Winner", None)
            )
            db.add(match)
            logger.info(f"Added match to DB: {match.id}")
        db.commit()
        
        logger.info("Google Sheets synchronization completed successfully")
    except Exception as e:
        logger.error(f"Error during synchronization: {e}")
        if db:
            db.rollback()
    finally:
        if db:
            db.close()