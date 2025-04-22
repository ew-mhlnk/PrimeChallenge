import gspread
import os
import json
import logging
from datetime import datetime
from oauth2client.service_account import ServiceAccountCredentials
from sqlalchemy.orm import Session
from database.models import Tournament, TrueDraw, TournamentStatus

logger = logging.getLogger(__name__)

def get_google_sheets_client():
    scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
    credentials_json = os.getenv("GOOGLE_SHEETS_CREDENTIALS")
    if not credentials_json:
        raise ValueError("GOOGLE_SHEETS_CREDENTIALS environment variable is not set")
    
    credentials_dict = json.loads(credentials_json)
    creds = ServiceAccountCredentials.from_json_keyfile_dict(credentials_dict, scope)
    return gspread.authorize(creds)

def parse_date(date_str):
    """Парсим дату в формате DD.MM.YYYY HH:MM"""
    try:
        return datetime.strptime(date_str, "%d.%m.%Y %H:%M")
    except ValueError as e:
        logger.error(f"Error parsing date {date_str}: {e}")
        return None

def normalize_status(status_str):
    """Приводим статус к верхнему регистру и проверяем его корректность"""
    if not status_str:
        return TournamentStatus.ACTIVE
    status_str = status_str.upper()
    if status_str in [s.value for s in TournamentStatus]:
        return TournamentStatus(status_str)
    logger.warning(f"Invalid status '{status_str}', defaulting to ACTIVE")
    return TournamentStatus.ACTIVE

def sync_google_sheets_with_db(engine):
    logger.info("Starting sync with Google Sheets")
    try:
        client = get_google_sheets_client()
        current_time = datetime.now()

        with Session(engine) as db:
            # Получаем существующие турниры из Google Sheets
            try:
                # Предполагаем, что все турниры находятся в одной Google Sheet
                # Берем google_sheet_id из первого турнира или задаём его вручную
                first_tournament = db.query(Tournament).first()
                sheet_id = first_tournament.google_sheet_id if first_tournament else os.getenv("GOOGLE_SHEET_ID")
                if not sheet_id:
                    logger.error("No Google Sheet ID provided")
                    return

                sheet = client.open_by_key(sheet_id)
                tournaments_sheet = sheet.worksheet("tournaments")
                tournaments_data = tournaments_sheet.get_all_records()
            except gspread.exceptions.WorksheetNotFound:
                logger.error("Worksheet 'tournaments' not found")
                return
            except gspread.exceptions.SpreadsheetNotFound:
                logger.error(f"Spreadsheet with ID {sheet_id} not found")
                return

            # Обновляем или создаём турниры
            for row in tournaments_data:
                tournament_id = row.get("ID")
                if not tournament_id:
                    logger.warning("Skipping row with missing ID")
                    continue

                # Проверяем, существует ли турнир
                tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
                if not tournament:
                    tournament = Tournament(id=tournament_id)
                    db.add(tournament)

                # Обновляем данные турнира
                tournament.name = row.get("Name", tournament.name)
                tournament.dates = row.get("Date", tournament.dates)
                tournament.status = normalize_status(row.get("Status", tournament.status))
                tournament.starting_round = row.get("Starting Round", tournament.starting_round)
                tournament.type = row.get("Type", tournament.type)
                tournament.start = row.get("Start", tournament.start)
                tournament.google_sheet_id = sheet_id  # Устанавливаем google_sheet_id

                db.commit()
                logger.info(f"Updated or created tournament {tournament.name} (ID: {tournament.id})")

            # Синхронизируем матчи для каждого турнира
            tournaments = db.query(Tournament).all()
            for tournament in tournaments:
                # Проверяем статус турнира на основе даты Start
                if tournament.start:
                    start_date = parse_date(tournament.start)
                    if start_date and current_time > start_date and tournament.status != TournamentStatus.CLOSED:
                        tournament.status = TournamentStatus.CLOSED
                        db.commit()
                        logger.info(f"Updated tournament {tournament.name} status to CLOSED based on start date")

                # Пропускаем синхронизацию для CLOSED турниров
                if tournament.status == TournamentStatus.CLOSED:
                    logger.info(f"Skipping sync for CLOSED tournament {tournament.name}")
                    continue

                if not tournament.google_sheet_id:
                    logger.warning(f"Tournament {tournament.name} has no Google Sheet ID, skipping")
                    continue

                try:
                    sheet = client.open_by_key(tournament.google_sheet_id)
                    logger.info(f"Opened Google Sheet for tournament {tournament.name}")

                    # Синхронизируем матчи (лист с названием турнира, например "BMW_OPEN")
                    sheet_name = tournament.name.replace(" ", "_").upper()  # Например, "BMW Open" → "BMW_OPEN"
                    try:
                        match_sheet = sheet.worksheet(sheet_name)
                    except gspread.exceptions.WorksheetNotFound:
                        logger.error(f"Worksheet '{sheet_name}' not found in sheet for tournament {tournament.name}")
                        continue

                    # Получаем все данные из листа как список строк
                    all_values = match_sheet.get_all_values()
                    if not all_values or len(all_values) < 2:
                        logger.warning(f"No data found in sheet '{sheet_name}' for tournament {tournament.name}")
                        continue

                    # Первая строка — заголовки (R128, R64, R32, ..., Champion)
                    headers = all_values[0]
                    # Определяем границы каждого раунда
                    rounds = ["R128", "R64", "R32", "R16", "QF", "SF", "F"]
                    round_indices = {}
                    current_round = None
                    for i, header in enumerate(headers):
                        if header in rounds:
                            current_round = header
                            round_indices[current_round] = {"start": i, "end": i + 5}  # 6 столбцов: игрок + 5 сетов
                        elif header == "Champion":
                            round_indices["Champion"] = {"start": i, "end": i}

                    # Определяем индекс начального раунда
                    start_round_idx = rounds.index(tournament.starting_round) if tournament.starting_round in rounds else 0

                    # Удаляем старые записи TrueDraw для этого турнира
                    db.query(TrueDraw).filter(TrueDraw.tournament_id == tournament.id).delete()
                    db.commit()
                    logger.info(f"Cleared old TrueDraw records for tournament {tournament.id}")

                    # Парсим матчи, начиная с starting_round
                    for round_name in rounds[start_round_idx:]:
                        if round_name not in round_indices:
                            logger.info(f"Round {round_name} not found in sheet for tournament {tournament.name}")
                            continue

                        start_idx = round_indices[round_name]["start"]
                        end_idx = round_indices[round_name]["end"]
                        match_number = 1
                        row_idx = 1  # Начинаем со второй строки (первая — заголовки)

                        while row_idx < len(all_values) - 1:  # Проверяем пары строк
                            player1_row = all_values[row_idx]
                            player2_row = all_values[row_idx + 1] if row_idx + 1 < len(all_values) else [""] * len(headers)

                            player1 = player1_row[start_idx].strip() if start_idx < len(player1_row) else ""
                            player2 = player2_row[start_idx].strip() if start_idx < len(player2_row) else ""

                            # Пропускаем, если нет игроков
                            if not player1 and not player2:
                                row_idx += 2
                                continue

                            # Извлекаем сеты
                            sets = []
                            for i in range(start_idx + 1, min(start_idx + 6, len(player1_row))):
                                set_score = player1_row[i].strip() if i < len(player1_row) else ""
                                sets.append(set_score if set_score else None)
                            set1, set2, set3, set4, set5 = (sets + [None] * 5)[:5]

                            # Определяем победителя, глядя на следующий раунд
                            winner = None
                            next_round = None
                            for r in rounds[rounds.index(round_name) + 1:]:
                                if r in round_indices:
                                    next_round = r
                                    break

                            if next_round:
                                next_start_idx = round_indices[next_round]["start"]
                                next_player = all_values[row_idx // 2 + 1][next_start_idx].strip() if row_idx // 2 + 1 < len(all_values) and next_start_idx < len(all_values[row_idx // 2 + 1]) else ""
                                if next_player:
                                    if next_player == player1:
                                        winner = player1
                                    elif next_player == player2:
                                        winner = player2

                            # Сохраняем матч в TrueDraw
                            new_match = TrueDraw(
                                tournament_id=tournament.id,
                                round=round_name,
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
                            db.add(new_match)
                            logger.info(f"Added new match {match_number} in round {round_name} for tournament {tournament.id}")

                            match_number += 1
                            row_idx += 2  # Переходим к следующей паре игроков

                    db.commit()

                except Exception as e:
                    logger.error(f"Error syncing tournament {tournament.name}: {str(e)}")
                    continue

            logger.info("Finished sync with Google Sheets successfully")

    except Exception as e:
        logger.error(f"Fatal error during Google Sheets sync: {str(e)}")
        raise