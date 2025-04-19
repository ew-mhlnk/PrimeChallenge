import gspread
import os
from sqlalchemy.orm import Session
from database.db import get_db
from database.models import Tournament, UserPick, TrueDraw
import logging
from datetime import datetime
from .sheets_service import get_tournament_matches

logger = logging.getLogger(__name__)

def sync_google_sheets_with_db():
    logger.info("Starting Google Sheets synchronization with DB")
    db = None
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
        
        # Синхронизация турниров
        try:
            worksheet = sheet.worksheet("tournaments")
            data = worksheet.get_all_records()
            logger.info(f"Data from Google Sheets (tournaments): {data}")
        except gspread.exceptions.WorksheetNotFound:
            logger.error("Worksheet 'tournaments' not found in Google Sheets")
            return
        
        db = next(get_db())
        
        # Очистка таблиц (убрали удаление matches)
        db.query(TrueDraw).delete()
        db.query(UserPick).delete()
        db.query(Tournament).delete()
        db.commit()
        
        for row in data:
            logger.info(f"Processing tournament row: {row}")
            start_date_str = row.get("Start")
            status = row.get("Status", "ACTIVE")
            
            if start_date_str:
                try:
                    start_date = datetime.strptime(start_date_str, "%d.%m.%Y %H:%M")
                    current_time = datetime.now()
                    if current_time >= start_date:
                        status = "CLOSED"
                except ValueError as e:
                    logger.warning(f"Invalid start date format for tournament {row.get('Name')}: {start_date_str}, error: {e}")
            
            tournament = Tournament(
                id=row.get("ID"),
                name=row.get("Name"),
                dates=row.get("Date"),
                status=status,
                starting_round=row.get("Starting Round"),
                type=row.get("Type"),
                start=row.get("Start"),
                google_sheet_id=sheet_id
            )
            db.add(tournament)
            logger.info(f"Added tournament to DB: {tournament.name}")
        db.commit()
        
        # Синхронизация true_draw
        tournaments = db.query(Tournament).all()
        for tournament in tournaments:
            matches = get_tournament_matches(tournament.name)
            
            for match in matches:
                true_draw_entry = TrueDraw(
                    tournament_id=tournament.id,
                    round=match["Round"],
                    match_number=match["Match Number"],
                    player1=match["Player1"],
                    player2=match["Player2"],
                    winner=match["Winner"],
                    set1=match["set1"],
                    set2=match["set2"],
                    set3=match["set3"],
                    set4=match["set4"],
                    set5=match["set5"]
                )
                db.add(true_draw_entry)
            db.commit()
        
        logger.info("Google Sheets synchronization completed successfully")
    except Exception as e:
        logger.error(f"Error during synchronization: {e}")
        if db:
            db.rollback()
    finally:
        if db:
            db.close()