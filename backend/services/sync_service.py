import logging
import json
import os
import gspread
from sqlalchemy import Engine, text
from oauth2client.service_account import ServiceAccountCredentials
from datetime import datetime
import pytz

logger = logging.getLogger(__name__)

def get_google_sheets_client():
    scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
    credentials_json = os.getenv("GOOGLE_SHEETS_CREDENTIALS")
    if not credentials_json:
        logger.error("GOOGLE_SHEETS_CREDENTIALS environment variable is not set")
        raise ValueError("GOOGLE_SHEETS_CREDENTIALS environment variable is not set")
    
    try:
        credentials_dict = json.loads(credentials_json)
    except json.JSONDecodeError as e:
        logger.error(f"Invalid GOOGLE_SHEETS_CREDENTIALS JSON format: {str(e)}")
        raise ValueError(f"Invalid GOOGLE_SHEETS_CREDENTIALS JSON format: {str(e)}")
    
    credentials = ServiceAccountCredentials.from_json_keyfile_dict(credentials_dict, scope)
    return gspread.authorize(credentials)

def parse_datetime(date_str: str) -> datetime:
    """
    Парсит дату и время в формате DD.MM.YYYY HH:MM.
    Например: '25.04.2025 18:00' -> datetime(2025, 4, 25, 18, 0)
    """
    if not date_str:
        logger.error("Date string is empty")
        raise ValueError("Date string is empty")
    try:
        return datetime.strptime(date_str, "%d.%m.%Y %H:%M").replace(tzinfo=pytz.UTC)
    except ValueError as e:
        logger.error(f"Invalid datetime format for {date_str}: time data '{date_str}' does not match format '%d.%m.%Y %H:%M'")
        raise

async def sync_google_sheets_with_db(engine: Engine) -> None:
    logger.info("Starting sync with Google Sheets")
    try:
        client = get_google_sheets_client()
    except Exception as e:
        logger.error(f"Fatal error during Google Sheets sync: {str(e)}")
        raise

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
        try:
            tournaments_worksheet = sheet.worksheet("tournaments")
        except gspread.exceptions.WorksheetNotFound:
            logger.error("Worksheet 'tournaments' not found")
            raise

        tournament_data = tournaments_worksheet.get_all_values()
        if not tournament_data or len(tournament_data) < 2:
            logger.info("No tournament data found in 'tournaments' worksheet")
            return

        expected_headers = ["ID", "Name", "Date", "Status", "List", "Starting Round", "Type", "Start", "Close", "Tag"]
        headers = tournament_data[0]
        if headers != expected_headers:
            logger.error(f"Unexpected headers in 'tournaments' worksheet: {headers}")
            raise ValueError(f"Expected headers {expected_headers}, but got {headers}")

        logger.info(f"Found {len(tournament_data) - 1} tournament rows in Google Sheets")

        existing_tournaments = conn.execute(text("SELECT id, status FROM tournaments")).fetchall()
        existing_tournament_ids = {row[0] for row in existing_tournaments}
        existing_tournament_status = {row[0]: row[1] for row in existing_tournaments}
        logger.info(f"Existing tournaments in DB: {existing_tournament_ids}")

        current_time = datetime.now(pytz.UTC)
        tournaments_to_sync = []
        new_tournament_ids = set()

        for row in tournament_data[1:]:
            if len(row) < 10:
                logger.warning(f"Skipping incomplete row in 'tournaments': {row}")
                continue

            with conn.begin_nested():
                try:
                    tournament_id = int(row[0])
                    name = row[1]
                    dates = row[2]
                    status = row[3].upper()
                    sheet_name = row[4]
                    starting_round = row[5]
                    tournament_type = row[6]
                    start_time = row[7]
                    close_time = row[8]
                    tag = row[9]

                    logger.info(f"Processing tournament {tournament_id}: {name}, status={status}, sheet_name={sheet_name}")

                    new_tournament_ids.add(tournament_id)

                    if not start_time or not close_time:
                        logger.warning(f"Skipping tournament {tournament_id}: Start or Close time is empty (Start: '{start_time}', Close: '{close_time}')")
                        continue

                    start_datetime = parse_datetime(start_time)
                    close_datetime = parse_datetime(close_time)

                    valid_statuses = {"ACTIVE", "CLOSED", "COMPLETED"}
                    if status not in valid_statuses:
                        logger.error(f"Invalid status for tournament {tournament_id}: {status}. Expected one of {valid_statuses}")
                        raise ValueError(f"Invalid status: {status}")
                    if current_time > close_datetime and status != "COMPLETED":
                        status = "COMPLETED"
                        logger.info(f"Tournament {tournament_id} status updated to COMPLETED based on close time {close_time}")
                    elif status == "ACTIVE" and current_time > start_datetime:
                        status = "CLOSED"
                        logger.info(f"Tournament {tournament_id} status updated to CLOSED based on start time {start_time}")

                    conn.execute(
                        text("""
                            INSERT INTO tournaments (id, name, dates, status, sheet_name, starting_round, type, start, close, tag)
                            VALUES (:id, :name, :dates, :status, :sheet_name, :starting_round, :type, :start, :close, :tag)
                            ON CONFLICT (id) DO UPDATE
                            SET name = EXCLUDED.name,
                                dates = EXCLUDED.dates,
                                status = EXCLUDED.status,
                                sheet_name = EXCLUDED.sheet_name,
                                starting_round = EXCLUDED.starting_round,
                                type = EXCLUDED.type,
                                start = EXCLUDED.start,
                                close = EXCLUDED.close,
                                tag = EXCLUDED.tag
                        """),
                        {
                            "id": tournament_id,
                            "name": name,
                            "dates": dates,
                            "status": status,
                            "sheet_name": sheet_name,
                            "starting_round": starting_round,
                            "type": tournament_type,
                            "start": start_time,
                            "close": close_time,
                            "tag": tag
                        }
                    )

                    if status in ["ACTIVE", "CLOSED"]:
                        tournaments_to_sync.append((tournament_id, sheet_name, starting_round))
                        logger.info(f"Added tournament {tournament_id} to sync list (status: {status})")
                    else:
                        logger.info(f"Skipping sync for tournament {tournament_id} as it is {status}")

                    logger.info(f"Synced tournament {tournament_id}: {name} in DB")
                except Exception as e:
                    logger.error(f"Error processing tournament row {row}: {str(e)}")
                    continue

        logger.info(f"Tournaments to sync true_draw: {tournaments_to_sync}")

        for tournament_id, sheet_name, starting_round in tournaments_to_sync:
            with conn.begin_nested():
                try:
                    logger.info(f"Processing tournament {tournament_id} with sheet name {sheet_name}")
                    worksheet = sheet.worksheet(sheet_name)
                    data = worksheet.get_all_values()
                    logger.info(f"Raw data from sheet {sheet_name}: {data}")
                    
                    if not data or len(data) < 2:
                        logger.warning(f"No data found in sheet {sheet_name} for tournament {tournament_id}")
                        continue

                    current_status = conn.execute(
                        text("SELECT status FROM tournaments WHERE id = :tournament_id"),
                        {"tournament_id": tournament_id}
                    ).scalar()
                    if current_status == "COMPLETED":
                        logger.info(f"Skipping sync of true_draw for tournament {tournament_id} as it is COMPLETED")
                        continue

                    existing_matches = conn.execute(
                        text("""
                            SELECT round, match_number, player1, player2, winner
                            FROM true_draw
                            WHERE tournament_id = :tournament_id
                        """),
                        {"tournament_id": tournament_id}
                    ).fetchall()
                    existing_match_keys = {(row[0], row[1]) for row in existing_matches}
                    new_match_keys = set()

                    headers = data[0]
                    logger.info(f"Headers in sheet {sheet_name}: {headers}")
                    round_columns = {col_idx: header for col_idx, header in enumerate(headers) if header in ["R128", "R64", "R32", "R16", "QF", "SF", "F"]}
                    if not round_columns:
                        logger.error(f"No valid round columns found in sheet {sheet_name}")
                        continue

                    champion = None
                    if len(headers) >= 43 and headers[42] == "Champion" and len(data) > 1:
                        champion = data[1][42].strip() if data[1][42] else None
                        if champion:
                            logger.info(f"Tournament {tournament_id} has a champion: {champion}")
                            conn.execute(
                                text("UPDATE tournaments SET status = 'COMPLETED' WHERE id = :tournament_id"),
                                {"tournament_id": tournament_id}
                            )
                            logger.info(f"Tournament {tournament_id} status updated to COMPLETED")
                            continue

                    round_order = {"R128": 1, "R64": 2, "R32": 3, "R16": 4, "QF": 5, "SF": 6, "F": 7}
                    starting_round_order = round_order.get(starting_round, 3)  # R32 по умолчанию имеет порядок 3
                    logger.info(f"Starting round for tournament {tournament_id}: {starting_round}, order: {starting_round_order}")

                    matches_by_round = {"R128": [], "R64": [], "R32": [], "R16": [], "QF": [], "SF": [], "F": []}
                    row_idx = 1
                    while row_idx < len(data) - 1:
                        player1_row = data[row_idx]
                        player2_row = data[row_idx + 1]
                        logger.info(f"Processing row {row_idx}: {player1_row}, {player2_row}")

                        for col_idx, round_name in round_columns.items():
                            if round_order[round_name] < starting_round_order:
                                logger.info(f"Skipping round {round_name} for tournament {tournament_id} (before starting round {starting_round})")
                                continue

                            player1 = player1_row[col_idx].strip() if col_idx < len(player1_row) else ""
                            player2 = player2_row[col_idx].strip() if col_idx < len(player2_row) else ""
                            logger.info(f"Checking match in {round_name}: player1='{player1}', player2='{player2}'")
                            if not player1 or not player2:
                                logger.warning(f"Skipping match in {round_name} #{match_number} due to empty player1 or player2")
                                continue

                            match_number = sum(1 for r in range(1, row_idx, 2) if col_idx < len(data[r]) and col_idx < len(data[r + 1]) and data[r][col_idx].strip() and data[r + 1][col_idx].strip()) + 1
                            matches_by_round[round_name].append({
                                "match_number": match_number,
                                "player1": player1,
                                "player2": player2
                            })
                            logger.info(f"Added match {round_name} #{match_number}: {player1} vs {player2}")

                        row_idx += 2

                    for round_name in ["R128", "R64", "R32", "R16", "QF", "SF"]:
                        current_matches = matches_by_round[round_name]
                        if not current_matches:
                            continue

                        next_round_name = next((r for r, order in round_order.items() if order == round_order[round_name] + 1), None)
                        if not next_round_name or not matches_by_round[next_round_name]:
                            continue

                        for match in current_matches:
                            match_number = match["match_number"]
                            player1 = match["player1"]
                            player2 = match["player2"]

                            col_idx = list(round_columns.keys())[list(round_columns.values()).index(round_name)]
                            player1_row = data[row_idx - 1] if row_idx - 1 < len(data) else [""]
                            player2_row = data[row_idx] if row_idx < len(data) else [""]
                            set1 = player1_row[col_idx + 1] if col_idx + 1 < len(player1_row) and player1_row[col_idx + 1] else None
                            set2 = player1_row[col_idx + 2] if col_idx + 2 < len(player1_row) and player1_row[col_idx + 2] else None
                            set3 = player1_row[col_idx + 3] if col_idx + 3 < len(player1_row) and player1_row[col_idx + 3] else None
                            set4 = player1_row[col_idx + 4] if col_idx + 4 < len(player1_row) and player1_row[col_idx + 4] else None
                            set5 = player1_row[col_idx + 5] if col_idx + 5 < len(player1_row) and player1_row[col_idx + 5] else None

                            winner = None
                            next_match_idx = (match_number - 1) // 2
                            if next_match_idx < len(matches_by_round[next_round_name]):
                                next_match = matches_by_round[next_round_name][next_match_idx]
                                next_player1 = next_match["player1"]
                                next_player2 = next_match["player2"]
                                if next_player1 in [player1, player2]:
                                    winner = next_player1
                                elif next_player2 in [player1, player2]:
                                    winner = next_player2

                            new_match_keys.add((round_name, match_number))
                            conn.execute(
                                text("""
                                    INSERT INTO true_draw (tournament_id, round, match_number, player1, player2, set1, set2, set3, set4, set5, winner)
                                    VALUES (:tournament_id, :round, :match_number, :player1, :player2, :set1, :set2, :set3, :set4, :set5, :winner)
                                    ON CONFLICT (tournament_id, round, match_number) DO UPDATE
                                    SET player1 = EXCLUDED.player1,
                                        player2 = EXCLUDED.player2,
                                        set1 = EXCLUDED.set1,
                                        set2 = EXCLUDED.set2,
                                        set3 = EXCLUDED.set3,
                                        set4 = EXCLUDED.set4,
                                        set5 = EXCLUDED.set5,
                                        winner = EXCLUDED.winner
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
                            logger.info(f"Synced match: {round_name} #{match_number} - {player1} vs {player2}, winner: {winner}")

                    for match in matches_by_round["F"]:
                        match_number = match["match_number"]
                        player1 = match["player1"]
                        player2 = match["player2"]

                        col_idx = list(round_columns.keys())[list(round_columns.values()).index("F")]
                        player1_row = data[row_idx - 1] if row_idx - 1 < len(data) else [""]
                        player2_row = data[row_idx] if row_idx < len(data) else [""]
                        set1 = player1_row[col_idx + 1] if col_idx + 1 < len(player1_row) and player1_row[col_idx + 1] else None
                        set2 = player1_row[col_idx + 2] if col_idx + 2 < len(player1_row) and player1_row[col_idx + 2] else None
                        set3 = player1_row[col_idx + 3] if col_idx + 3 < len(player1_row) and player1_row[col_idx + 3] else None
                        set4 = player1_row[col_idx + 4] if col_idx + 4 < len(player1_row) and player1_row[col_idx + 4] else None
                        set5 = player1_row[col_idx + 5] if col_idx + 5 < len(player1_row) and player1_row[col_idx + 5] else None

                        winner = champion if champion in [player1, player2] else None

                        new_match_keys.add(("F", match_number))
                        conn.execute(
                            text("""
                                INSERT INTO true_draw (tournament_id, round, match_number, player1, player2, set1, set2, set3, set4, set5, winner)
                                VALUES (:tournament_id, :round, :match_number, :player1, :player2, :set1, :set2, :set3, :set4, :set5, :winner)
                                ON CONFLICT (tournament_id, round, match_number) DO UPDATE
                                SET player1 = EXCLUDED.player1,
                                    player2 = EXCLUDED.player2,
                                    set1 = EXCLUDED.set1,
                                    set2 = EXCLUDED.set2,
                                    set3 = EXCLUDED.set3,
                                    set4 = EXCLUDED.set4,
                                    set5 = EXCLUDED.set5,
                                    winner = EXCLUDED.winner
                            """),
                            {
                                "tournament_id": tournament_id,
                                "round": "F",
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
                        logger.info(f"Synced match: F #{match_number} - {player1} vs {player2}, winner: {winner}")

                    matches_to_delete = existing_match_keys - new_match_keys
                    for round, match_number in matches_to_delete:
                        conn.execute(
                            text("""
                                DELETE FROM true_draw
                                WHERE tournament_id = :tournament_id
                                AND round = :round
                                AND match_number = :match_number
                            """),
                            {
                                "tournament_id": tournament_id,
                                "round": round,
                                "match_number": match_number
                            }
                        )
                        logger.info(f"Deleted match: {round} #{match_number} for tournament {tournament_id}")

                    logger.info(f"Successfully synced sheet {sheet_name} for tournament {tournament_id}")
                except Exception as e:
                    logger.error(f"Error syncing sheet {sheet_name} for tournament {tournament_id}: {str(e)}")
                    continue
        
        conn.commit()
        logger.info("Finished sync with Google Sheets successfully")