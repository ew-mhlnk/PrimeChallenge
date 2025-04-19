import gspread
from oauth2client.service_account import ServiceAccountCredentials
import json
import logging
from config import GOOGLE_SHEET_ID, GOOGLE_CREDENTIALS

logger = logging.getLogger(__name__)

scope = ['https://spreadsheets.google.com/feeds', 'https://www.googleapis.com/auth/drive']
google_credentials_dict = json.loads(GOOGLE_CREDENTIALS)
creds = ServiceAccountCredentials.from_json_keyfile_dict(google_credentials_dict, scope)
client = gspread.authorize(creds)

def get_tournaments():
    try:
        sheet = client.open_by_key(GOOGLE_SHEET_ID).worksheet("Tournaments")
        data = sheet.get_all_records()
        return data
    except gspread.exceptions.WorksheetNotFound as e:
        logger.error(f"Worksheet 'Tournaments' not found: {e}")
        return []
    except gspread.exceptions.SpreadsheetNotFound as e:
        logger.error(f"Spreadsheet with ID {GOOGLE_SHEET_ID} not found: {e}")
        return []

def get_tournament_matches(tournament_name: str):
    try:
        sheet = client.open_by_key(GOOGLE_SHEET_ID).worksheet(tournament_name)
        all_data = sheet.get_all_values()
        
        if not all_data or len(all_data) < 2:
            logger.warning(f"No data found in worksheet '{tournament_name}'")
            return []

        headers = all_data[0]
        rows = all_data[1:]

        matches = []
        match_id = 1
        round_columns = {}
        champion = None

        # Находим столбцы для каждого раунда и столбец "Champion"
        col_idx = 0
        while col_idx < len(headers):
            cell = headers[col_idx]
            if cell in ["R128", "R64", "R32", "R16", "QF", "SF", "F"]:
                round_columns[cell] = col_idx
            elif cell == "Champion":
                champion = rows[0][col_idx] if rows and col_idx < len(rows[0]) else None
            col_idx += 1

        # Проверяем, что столбец "Champion" находится в колонке AQ (индекс 42)
        champion_col_idx = headers.index("Champion") if "Champion" in headers else -1
        if champion_col_idx != 42:
            logger.warning(f"Column 'Champion' not found in expected position AQ for tournament '{tournament_name}'")
            champion = None

        # Обрабатываем матчи по раундам
        for round_name, start_col in round_columns.items():
            match_number = 1
            for row_idx in range(0, len(rows), 2):
                if row_idx + 1 >= len(rows):
                    break

                player1_row = rows[row_idx]
                player2_row = rows[row_idx + 1]

                player1 = player1_row[start_col] if start_col < len(player1_row) else ""
                player2 = player2_row[start_col] if start_col < len(player2_row) else ""

                if not player1 or not player2:
                    continue

                sets = []
                for i in range(5):
                    set_score = player1_row[start_col + 1 + i] if start_col + 1 + i < len(player1_row) else ""
                    sets.append(set_score)

                winner = None
                # Если это финал (F) и есть champion, используем его как победителя
                if round_name == "F" and champion:
                    winner = champion
                else:
                    # Иначе определяем победителя по следующему раунду
                    next_rounds = ["R64", "R32", "R16", "QF", "SF", "F"]
                    current_round_idx = next_rounds.index(round_name) if round_name in next_rounds else -1
                    if current_round_idx != -1 and current_round_idx + 1 < len(next_rounds):
                        next_round = next_rounds[current_round_idx + 1]
                        if next_round in round_columns:
                            next_col = round_columns[next_round]
                            next_match_number = (match_number + 1) // 2
                            next_player1_row = rows[(next_match_number - 1) * 2]
                            next_player2_row = rows[(next_match_number - 1) * 2 + 1] if (next_match_number - 1) * 2 + 1 < len(rows) else [""]
                            next_player1 = next_player1_row[next_col] if next_col < len(next_player1_row) else ""
                            next_player2 = next_player2_row[next_col] if next_col < len(next_player2_row) else ""
                            if next_player1 == player1 or next_player2 == player1:
                                winner = player1
                            elif next_player1 == player2 or next_player2 == player2:
                                winner = player2

                match = {
                    'ID': match_id,
                    'Tournament': tournament_name,
                    'Round': round_name,
                    'Match Number': match_number,
                    'Player1': player1,
                    'Player2': player2,
                    'set1': sets[0] if sets[0] else None,
                    'set2': sets[1] if sets[1] else None,
                    'set3': sets[2] if sets[2] else None,
                    'set4': sets[3] if sets[3] else None,
                    'set5': sets[4] if sets[4] else None,
                    'Winner': winner
                }
                matches.append(match)
                match_id += 1
                match_number += 1

        return matches

    except gspread.exceptions.WorksheetNotFound as e:
        logger.error(f"Worksheet '{tournament_name}' not found: {e}")
        return []
    except gspread.exceptions.SpreadsheetNotFound as e:
        logger.error(f"Spreadsheet with ID {GOOGLE_SHEET_ID} not found: {e}")
        return []
    except Exception as e:
        logger.error(f"Error while fetching matches for tournament '{tournament_name}': {e}")
        return []