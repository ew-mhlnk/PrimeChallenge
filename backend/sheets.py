import gspread
from google.oauth2.service_account import Credentials
import os
import json

def get_sheets_client():
    scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
    creds_json = os.getenv("GOOGLE_CREDENTIALS")
    if not creds_json:
        raise ValueError("GOOGLE_CREDENTIALS not set in environment variables")
    creds_dict = json.loads(creds_json)
    creds = Credentials.from_service_account_info(creds_dict, scopes=scope)
    return gspread.authorize(creds)

def get_tournaments():
    client = get_sheets_client()
    sheet = client.open_by_key(os.getenv("GOOGLE_SHEET_ID")).worksheet("tournaments")
    data = sheet.get_all_records()
    return [
        {
            "name": row["Name"],
            "dates": row["Date"],
            "status": row["Status"],
            "type": row.get("Type", "Unknown")  # Для будущей гибкости
        }
        for row in data
    ]

def get_tournament_matches(tournament_name):
    client = get_sheets_client()
    try:
        sheet = client.open_by_key(os.getenv("GOOGLE_SHEET_ID")).worksheet(tournament_name)
        data = sheet.get_all_values()
        if not data:
            return []
        
        headers = data[0]
        # Определяем столбцы для каждого раунда
        round_columns = {
            "R32": headers.index("R32") if "R32" in headers else -1,
            "R16": headers.index("R16") if "R16" in headers else -1,
            "QF": headers.index("QF") if "QF" in headers else -1,
            "SF": headers.index("SF") if "SF" in headers else -1,
            "F": headers.index("F") if "F" in headers else -1
        }
        
        matches = []
        # Обрабатываем каждый раунд
        for round_name, start_col in round_columns.items():
            if start_col == -1:
                continue  # Пропускаем, если раунд отсутствует в заголовках
            
            # Читаем пары игроков (каждые две строки)
            for i in range(1, len(data), 2):  # Начинаем с 1, пропуская заголовки
                player1 = data[i][start_col] if start_col < len(data[i]) else ""
                player2 = data[i + 1][start_col] if i + 1 < len(data) and start_col < len(data[i + 1]) else ""
                if not player1 or not player2:
                    continue  # Пропускаем, если пара неполная
                
                # Извлекаем счёты из следующих 5 столбцов
                score1 = " ".join(filter(None, data[i][start_col + 1:start_col + 6]))
                score2 = " ".join(filter(None, data[i + 1][start_col + 1:start_col + 6]))
                score = f"{score1} vs {score2}" if score1 or score2 else None
                
                # Определяем победителя (если счёт есть)
                winner = None
                if score1 and score2:
                    winner = player1 if len(score1.split()) > len(score2.split()) else player2
                
                matches.append({
                    "round": round_name,
                    "match_number": (i // 2) + 1,  # Номер матча в рамках раунда
                    "player1": player1,
                    "player2": player2,
                    "score": score,
                    "winner": winner
                })
        
        return matches
    except gspread.exceptions.WorksheetNotFound:
        return []