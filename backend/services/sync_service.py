import gspread
import os
from sqlalchemy.orm import Session
from database.db import get_db
from database.models import Tournament, Match, Pick
import logging

logger = logging.getLogger(__name__)

def sync_google_sheets_with_db():
    logger.info("Starting Google Sheets synchronization with DB")
    db = None
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
        
        # Сначала удаляем матчи, чтобы не нарушать foreign key constraint
        logger.info("Clearing existing matches")
        db.query(Match).delete()
        db.commit()
        
        # Теперь удаляем турниры
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
        tournaments = db.query(Tournament).all()
        for tournament in tournaments:
            try:
                worksheet = sheet.worksheet(tournament.name)
                match_data = worksheet.get_all_values()
                logger.info(f"Data from Google Sheets (worksheet '{tournament.name}'): {match_data}")
            except gspread.exceptions.WorksheetNotFound:
                logger.error(f"Worksheet '{tournament.name}' not found in Google Sheets")
                continue
            
            # Определяем стартовый раунд для турнира
            starting_round = tournament.starting_round
            logger.info(f"Starting round for tournament {tournament.name}: {starting_round}")
            
            # Находим индекс строки с заголовками (R128, R64, R32 и т.д.)
            header_row = match_data[0]
            round_columns = {}
            current_round = None
            for idx, cell in enumerate(header_row):
                if cell in ["R128", "R64", "R32", "R16", "QF", "SF", "F"]:
                    current_round = cell
                    round_columns[current_round] = idx
                elif cell.isdigit() and current_round:
                    continue
            
            # Находим индекс столбца для стартового раунда
            if starting_round not in round_columns:
                logger.error(f"Starting round {starting_round} not found in worksheet '{tournament.name}'")
                continue
            start_col = round_columns[starting_round]
            
            # Парсим данные матчей из столбца R32 (и следующих 5 столбцов для результатов)
            match_number = 1
            for row_idx in range(1, len(match_data), 2):
                player1_row = match_data[row_idx]
                player2_row = match_data[row_idx + 1] if row_idx + 1 < len(match_data) else [""] * len(player1_row)
                
                player1 = player1_row[start_col] if start_col < len(player1_row) else ""
                player2 = player2_row[start_col] if start_col < len(player2_row) else ""
                
                if not player1 or not player2:
                    continue
                
                # Получаем результаты
                set1 = player1_row[start_col + 1] if start_col + 1 < len(player1_row) else None
                set2 = player1_row[start_col + 2] if start_col + 2 < len(player1_row) else None
                set3 = player1_row[start_col + 3] if start_col + 3 < len(player1_row) else None
                set4 = player1_row[start_col + 4] if start_col + 4 < len(player1_row) else None
                set5 = player1_row[start_col + 5] if start_col + 5 < len(player1_row) else None
                
                winner = None
                
                match = Match(
                    tournament_id=tournament.id,
                    round=starting_round,
                    match_number=match_number,
                    player1=player1,
                    player2=player2,
                    set1=set1,
                    set2=set2,
                    set3=set3,
                    set4=set4,
                    set5=set5,
                    winner=winner
                )
                db.add(match)
                logger.info(f"Added match to DB: {match_number} - {player1} vs {player2}")
                match_number += 1
            db.commit()
        
        logger.info("Google Sheets synchronization completed successfully")
    except Exception as e:
        logger.error(f"Error during synchronization: {e}")
        if db:
            db.rollback()
    finally:
        if db:
            db.close()