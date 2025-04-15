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
        # Открываем вкладку с названием турнира (например, "BMW Open")
        sheet = client.open_by_key(GOOGLE_SHEET_ID).worksheet(tournament_name)
        # Получаем все данные как список списков (включая заголовки)
        all_data = sheet.get_all_values()
        
        if not all_data or len(all_data) < 2:
            logger.warning(f"No data found in worksheet '{tournament_name}'")
            return []

        # Первая строка — заголовки (R128, 1, 2, 3, 4, 5, R64, 1, 2, 3, 4, 5, ...)
        headers = all_data[0]
        # Остальные строки — матчи
        rows = all_data[1:]

        matches = []
        match_id = 1  # Простой счётчик для ID матчей

        # Обрабатываем данные по столбцам, группируя по раундам
        col_idx = 0
        while col_idx < len(headers):
            # Проверяем, является ли текущий столбец названием раунда (например, R128, R64, R32)
            round_name = headers[col_idx]
            if not round_name.startswith('R') and round_name not in ['SF', 'F']:
                col_idx += 1
                continue

            # Следующие 5 столбцов — это сеты (1, 2, 3, 4, 5)
            if col_idx + 5 >= len(headers):
                break  # Не хватает столбцов для сетов

            # Получаем данные для текущего раунда
            for row_idx in range(0, len(rows), 2):  # Обрабатываем парами строк (игрок 1 и игрок 2)
                if row_idx + 1 >= len(rows):
                    break  # Не хватает строк для пары игроков

                player1_row = rows[row_idx]
                player2_row = rows[row_idx + 1]

                # Игроки находятся в первом столбце раунда
                player1 = player1_row[col_idx] if col_idx < len(player1_row) else ""
                player2 = player2_row[col_idx] if col_idx < len(player2_row) else ""

                # Пропускаем, если нет игроков
                if not player1 or not player2:
                    continue

                # Получаем результаты сетов
                sets = []
                for i in range(5):
                    set_score = player1_row[col_idx + 1 + i] if col_idx + 1 + i < len(player1_row) else ""
                    sets.append(set_score)

                # Определяем победителя (простая логика: если есть сеты, победитель — тот, кто выиграл больше сетов)
                winner = None
                if any(sets):
                    player1_sets_won = 0
                    player2_sets_won = 0
                    for set_score in sets:
                        if set_score:
                            try:
                                score1, score2 = map(int, set_score.split('-'))
                                if score1 > score2:
                                    player1_sets_won += 1
                                elif score2 > score1:
                                    player2_sets_won += 1
                            except:
                                continue
                    if player1_sets_won > player2_sets_won:
                        winner = player1
                    elif player2_sets_won > player1_sets_won:
                        winner = player2

                match = {
                    'ID': match_id,
                    'Tournament': tournament_name,
                    'Round': round_name,
                    'Match Number': (row_idx // 2) + 1,  # Номер матча в раунде
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

            col_idx += 6  # Переходим к следующему раунду (R128 + 5 столбцов для сетов = 6 столбцов)

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