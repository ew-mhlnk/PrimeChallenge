import gspread
import os
import json
import logging
from oauth2client.service_account import ServiceAccountCredentials
from sqlalchemy.orm import Session
from database.models import Tournament, TrueDraw

logger = logging.getLogger(__name__)

def get_google_sheets_client():
    scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
    # Получаем JSON-ключи из переменной окружения
    credentials_json = os.getenv("GOOGLE_SHEETS_CREDENTIALS")
    if not credentials_json:
        raise ValueError("GOOGLE_SHEETS_CREDENTIALS environment variable is not set")
    
    # Парсим JSON-строку в словарь
    credentials_dict = json.loads(credentials_json)
    creds = ServiceAccountCredentials.from_json_keyfile_dict(credentials_dict, scope)
    return gspread.authorize(creds)

def sync_google_sheets_with_db(engine):
    logger.info("Starting sync with Google Sheets")
    try:
        client = get_google_sheets_client()

        with Session(engine) as db:
            # Удаляем старые записи TrueDraw перед синхронизацией
            db.query(TrueDraw).delete()
            db.commit()
            logger.info("Cleared old TrueDraw records")

            tournaments = db.query(Tournament).all()
            for tournament in tournaments:
                if not tournament.google_sheet_id:
                    logger.warning(f"Tournament {tournament.name} has no Google Sheet ID, skipping")
                    continue

                try:
                    # Открываем Google Sheet по ID
                    sheet = client.open_by_key(tournament.google_sheet_id)
                    logger.info(f"Opened Google Sheet for tournament {tournament.name}")

                    # Синхронизируем турниры (лист "tournaments")
                    try:
                        tournaments_sheet = sheet.worksheet("tournaments")
                    except gspread.exceptions.WorksheetNotFound:
                        logger.error(f"Worksheet 'tournaments' not found in sheet for tournament {tournament.name}")
                        continue

                    tournaments_data = tournaments_sheet.get_all_records()
                    for row in tournaments_data:
                        if row.get("ID") == tournament.id:
                            tournament.name = row.get("Name", tournament.name)
                            tournament.dates = row.get("Date", tournament.dates)
                            tournament.status = row.get("Status", tournament.status)
                            tournament.starting_round = row.get("Starting Round", tournament.starting_round)
                            tournament.type = row.get("Type", tournament.type)
                            tournament.start = row.get("Start", tournament.start)
                            db.commit()
                            logger.info(f"Updated tournament {tournament.name}")

                    # Синхронизируем матчи (листы с названием турнира, например "BMW_OPEN")
                    # Приводим название к формату, ожидаемому в Google Sheets (без пробелов, верхний регистр)
                    sheet_name = tournament.name.replace(" ", "_").upper()  # Например, "BMW Open" → "BMW_OPEN"
                    try:
                        match_sheet = sheet.worksheet(sheet_name)
                    except gspread.exceptions.WorksheetNotFound:
                        logger.error(f"Worksheet '{sheet_name}' not found in sheet for tournament {tournament.name}")
                        continue

                    match_data = match_sheet.get_all_records()
                    for row in match_data:
                        round_name = row.get("Round", "")
                        match_number_str = row.get("Match Number", "0")
                        try:
                            match_number = int(match_number_str)
                        except (ValueError, TypeError):
                            logger.warning(f"Invalid Match Number '{match_number_str}' for tournament {tournament.name}, skipping")
                            continue

                        if not round_name or not match_number:
                            logger.warning(f"Missing Round or Match Number in row {row}, skipping")
                            continue

                        # Проверяем, существует ли матч
                        existing_match = db.query(TrueDraw).filter(
                            TrueDraw.tournament_id == tournament.id,
                            TrueDraw.round == round_name,
                            TrueDraw.match_number == match_number
                        ).first()

                        if existing_match:
                            # Обновляем существующий матч
                            existing_match.player1 = row.get("Player1", "")
                            existing_match.player2 = row.get("Player2", "")
                            existing_match.winner = row.get("Winner", "")
                            existing_match.set1 = row.get("Set1", "")
                            existing_match.set2 = row.get("Set2", "")
                            existing_match.set3 = row.get("Set3", "")
                            existing_match.set4 = row.get("Set4", "")
                            existing_match.set5 = row.get("Set5", "")
                            logger.info(f"Updated match {match_number} in round {round_name} for tournament {tournament.id}")
                        else:
                            # Создаём новый матч
                            new_match = TrueDraw(
                                tournament_id=tournament.id,
                                round=round_name,
                                match_number=match_number,
                                player1=row.get("Player1", ""),
                                player2=row.get("Player2", ""),
                                winner=row.get("Winner", ""),
                                set1=row.get("Set1", ""),
                                set2=row.get("Set2", ""),
                                set3=row.get("Set3", ""),
                                set4=row.get("Set4", ""),
                                set5=row.get("Set5", "")
                            )
                            db.add(new_match)
                            logger.info(f"Added new match {match_number} in round {round_name} for tournament {tournament.id}")

                    db.commit()

                except Exception as e:
                    logger.error(f"Error syncing tournament {tournament.name}: {str(e)}")
                    continue  # Продолжаем с другими турнирами, не прерывая процесс

            logger.info("Finished sync with Google Sheets successfully")

    except Exception as e:
        logger.error(f"Fatal error during Google Sheets sync: {str(e)}")
        raise