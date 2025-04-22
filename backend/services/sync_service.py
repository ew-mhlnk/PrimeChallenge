import logging
import json
import os
import gspread
from sqlalchemy import Engine, text
from oauth2client.service_account import ServiceAccountCredentials
from datetime import datetime

logger = logging.getLogger(__name__)

def get_google_sheets_client():
    scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
    credentials_json = os.getenv("GOOGLE_SHEETS_CREDENTIALS")
    if not credentials_json:
        raise ValueError("GOOGLE_SHEETS_CREDENTIALS environment variable is not set")
    
    try:
        credentials_dict = json.loads(credentials_json)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid GOOGLE_SHEETS_CREDENTIALS JSON format: {str(e)}")
    
    credentials = ServiceAccountCredentials.from_json_keyfile_dict(credentials_dict, scope)
    return gspread.authorize(credentials)

def parse_datetime(date_str: str) -> datetime:
    """
    Парсит дату и время в формате DD.MM.YYYY HH:MM.
    Например: '25.04.2025 18:00' -> datetime(2025, 4, 25, 18, 0)
    """
    try:
        return datetime.strptime(date_str, "%d.%m.%Y %H:%M")
    except ValueError as e:
        logger.error(f"Invalid datetime format for {date_str}: {str(e)}")
        raise

async def sync_google_sheets_with_db(engine: Engine) -> None:
    logger.info("Starting sync with Google Sheets")
    try:
        client = get_google_sheets_client()
    except Exception as e:
        logger.error(f"Fatal error during Google Sheets sync: {str(e)}")
        raise

    # Получаем ID таблицы из переменной окружения
    google_sheet_id = os.getenv("GOOGLE_SHEET_ID")
    if not google_sheet_id:
        logger.error("GOOGLE_SHEET_ID environment variable is not set")
        raise ValueError("GOOGLE_SHEET_ID environment variable is not set")

    try:
        sheet = client.open_by_key(google_sheet_id)
    except gspread.exceptions.SpreadsheetNotFound:
        logger.error(f"Spreadsheet with ID {google_sheet_id} not found")
        raise
    except Exception as e:
        logger.error(f"Error opening Google Sheet {google_sheet_id}: {str(e)}")
        raise

    with engine.connect() as conn:
        # Шаг 1: Парсим лист 'tournaments' для получения метаданных
        try:
            tournaments_worksheet = sheet.worksheet("tournaments")
        except gspread.exceptions.WorksheetNotFound:
            logger.error("Worksheet 'tournaments' not found")
            raise

        tournament_data = tournaments_worksheet.get_all_values()
        if not tournament_data or len(tournament_data) < 2:
            logger.info("No tournament data found in 'tournaments' worksheet")
            return

        # Проверяем заголовки (A1:H1)
        expected_headers = ["ID", "Name", "Date", "Status", "List", "Starting Round", "Type", "Start"]
        headers = tournament_data[0]
        if headers[:8] != expected_headers:
            logger.error(f"Unexpected headers in 'tournaments' worksheet: {headers}")
            raise ValueError(f"Expected headers {expected_headers}, but got {headers}")

        # Очищаем таблицу tournaments
        conn.execute(text("DELETE FROM tournaments"))

        # Парсим строки (начиная со второй, где данные)
        current_time = datetime.now()
        tournaments_to_sync = []
        for row in tournament_data[1:]:
            if len(row) < 8:  # Убедимся, что строка содержит все данные
                logger.warning(f"Skipping incomplete row in 'tournaments': {row}")
                continue

            try:
                tournament_id = int(row[0])  # A: ID
                name = row[1]  # B: Name
                dates = row[2]  # C: Date
                status = row[3]  # D: Status
                sheet_name = row[4]  # E: List
                starting_round = row[5]  # F: Starting Round
                tournament_type = row[6]  # G: Type
                start_time = row[7]  # H: Start

                # Проверяем и обновляем статус на основе даты
                try:
                    start_datetime = parse_datetime(start_time)
                    if current_time > start_datetime and status == "ACTIVE":
                        status = "CLOSED"
                        logger.info(f"Tournament {tournament_id} status updated to CLOSED based on start time {start_time}")
                except Exception as e:
                    logger.error(f"Error parsing start time for tournament {tournament_id}: {str(e)}")
                    continue

                if status not in ["ACTIVE", "CLOSED", "COMPLETED"]:
                    logger.warning(f"Invalid status for tournament {tournament_id}: {status}")
                    continue

                # Сохраняем турнир в базу
                conn.execute(
                    text("""
                        INSERT INTO tournaments (id, name, dates, status, sheet_name, starting_round, type, start)
                        VALUES (:id, :name, :dates, :status, :sheet_name, :starting_round, :type, :start)
                    """),
                    {
                        "id": tournament_id,
                        "name": name,
                        "dates": dates,
                        "status": status,
                        "sheet_name": sheet_name,
                        "starting_round": starting_round,
                        "type": tournament_type,
                        "start": start_time
                    }
                )

                # Если турнир не COMPLETED, добавляем его в список для синхронизации true_draw
                if status != "COMPLETED":
                    tournaments_to_sync.append((tournament_id, sheet_name, starting_round))
                else:
                    logger.info(f"Skipping sync for tournament {tournament_id} as it is COMPLETED")

                logger.info(f"Added tournament {tournament_id}: {name}")
            except Exception as e:
                logger.error(f"Error processing tournament row {row}: {str(e)}")
                continue

        # Шаг 2: Парсим турнирные сетки из листов, указанных в sheet_name
        for tournament_id, sheet_name, starting_round in tournaments_to_sync:
            try:
                logger.info(f"Processing tournament {tournament_id} with sheet name {sheet_name}")
                worksheet = sheet.worksheet(sheet_name)
                data = worksheet.get_all_values()
                
                if not data:
                    logger.warning(f"No data found in sheet {sheet_name} for tournament {tournament_id}")
                    continue

                # Проверяем, есть ли колонка AQ (Champion)
                champion = None
                if len(data[0]) >= 43:  # Колонка AQ — 43-я (A=1, AQ=43)
                    champion_cell = data[0][42]  # AQ1
                    if champion_cell == "Champion":
                        champion = data[1][42] if len(data) > 1 else None  # AQ2
                        if champion:
                            logger.info(f"Tournament {tournament_id} has a champion: {champion}")
                            # Обновляем статус на COMPLETED
                            conn.execute(
                                text("UPDATE tournaments SET status = 'COMPLETED' WHERE id = :tournament_id"),
                                {"tournament_id": tournament_id}
                            )
                            logger.info(f"Tournament {tournament_id} status updated to COMPLETED")

                # Очищаем существующие записи true_draw для этого турнира
                conn.execute(
                    text("DELETE FROM true_draw WHERE tournament_id = :tournament_id"),
                    {"tournament_id": tournament_id}
                )

                # Парсим строки
                round_order = {"R128": 1, "R64": 2, "R32": 3, "R16": 4, "QF": 5, "SF": 6, "F": 7}
                starting_round_order = round_order.get(starting_round, 1)

                for row in data:
                    if len(row) < 5:  # Убедимся, что строка содержит минимум данных
                        logger.warning(f"Skipping incomplete row in sheet {sheet_name}: {row}")
                        continue

                    try:
                        round_name = row[0]  # A: Round (например, R128)
                        if not round_name or round_name not in round_order:
                            logger.warning(f"Invalid round in sheet {sheet_name}: {row}")
                            continue

                        # Пропускаем раунды до starting_round
                        if round_order[round_name] < starting_round_order:
                            logger.info(f"Skipping round {round_name} for tournament {tournament_id} (before starting round {starting_round})")
                            continue

                        match_number = int(row[1])  # B: Match Number
                        player1 = row[2]  # C: Player 1
                        player2 = row[3]  # D: Player 2
                        set1 = row[4] if len(row) > 4 and row[4] else None  # E: Set 1
                        set2 = row[5] if len(row) > 5 and row[5] else None  # F: Set 2
                        set3 = row[6] if len(row) > 6 and row[6] else None
                        set4 = row[7] if len(row) > 7 and row[7] else None
                        set5 = row[8] if len(row) > 8 and row[8] else None
                        winner = row[9] if len(row) > 9 and row[9] else None

                        conn.execute(
                            text("""
                                INSERT INTO true_draw (tournament_id, round, match_number, player1, player2, set1, set2, set3, set4, set5, winner)
                                VALUES (:tournament_id, :round, :match_number, :player1, :player2, :set1, :set2, :set3, :set4, :set5, :winner)
                            """),
                            {
                                "tournament_id": tournament_id,
                                "round": round_name,
                                "match_number": match_number,
                                "player1": player1,
                                "player2": player2,
                                "set1": set1,
                                "set2": set2,
                                "set3": set3,
                                "set4": set4,
                                "set5": set5,
                                "winner": winner
                            }
                        )
                    except Exception as e:
                        logger.error(f"Error inserting row in sheet {sheet_name} for tournament {tournament_id}: {str(e)}")
                        continue
                
                logger.info(f"Successfully synced sheet {sheet_name} for tournament {tournament_id}")
            
            except gspread.exceptions.WorksheetNotFound:
                logger.error(f"Worksheet {sheet_name} not found for tournament {tournament_id}")
                continue
            except Exception as e:
                logger.error(f"Error syncing sheet {sheet_name} for tournament {tournament_id}: {str(e)}")
                continue
        
        conn.commit()
        logger.info("Finished sync with Google Sheets successfully")