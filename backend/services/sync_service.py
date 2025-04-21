import gspread
from oauth2client.service_account import ServiceAccountCredentials
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from database.models import Tournament, TrueDraw
import logging
import os

logger = logging.getLogger(__name__)

def get_google_sheets_client():
    scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
    creds = ServiceAccountCredentials.from_json_keyfile_name(
        "path/to/credentials.json", scope  # Замени на путь к твоему credentials.json
    )
    return gspread.authorize(creds)

def sync_google_sheets_with_db(engine):
    logger.info("Starting sync with Google Sheets")
    client = get_google_sheets_client()

    with Session(engine) as db:
        tournaments = db.query(Tournament).all()
        for tournament in tournaments:
            if not tournament.google_sheet_id:
                logger.warning(f"Tournament {tournament.name} has no Google Sheet ID, skipping")
                continue

            try:
                sheet = client.open_by_key(tournament.google_sheet_id)
                logger.info(f"Opened Google Sheet for tournament {tournament.name}")

                # Синхронизируем турниры (лист "tournaments")
                tournaments_sheet = sheet.worksheet("tournaments")
                tournaments_data = tournaments_sheet.get_all_records()
                for row in tournaments_data:
                    if row["ID"] == tournament.id:
                        tournament.name = row["Name"]
                        tournament.dates = row["Date"]
                        tournament.status = row["Status"]
                        tournament.starting_round = row["Starting Round"]
                        tournament.type = row["Type"]
                        tournament.start = row["Start"]
                        db.commit()
                        logger.info(f"Updated tournament {tournament.name}")

                # Синхронизируем матчи (листы с названием турнира, например "BMW_OPEN")
                match_sheet = sheet.worksheet(tournament.name)
                match_data = match_sheet.get_all_records()
                for row in match_data:
                    round_name = row.get("Round", "")
                    match_number = row.get("Match Number", 0)
                    if not round_name or not match_number:
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
                db.rollback()

    logger.info("Finished sync with Google Sheets")