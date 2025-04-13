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
        if not data or len(data[0]) < 13:
            return []
        
        # Определяем начальный раунд на основе типа турнира
        headers = data[0]
        round_columns = {
            "R128": headers.index("R128") if "R128" in headers else -1,
            "R64": headers.index("R64") if "R64" in headers else -1,
            "R32": headers.index("R32") if "R32" in headers else -1,
            "R16": headers.index("R16") if "R16" in headers else -1,
            "QF": headers.index("QF") if "QF" in headers else -1,
            "SF": headers.index("SF") if "SF" in headers else -1,
            "F": headers.index("F") if "F" in headers else -1
        }
        
        # Выбираем первый доступный раунд (для ATP-500 это R32)
        start_round = "R32"  # По умолчанию для BMW Open
        for rnd in ["R128", "R64", "R32", "R16", "QF", "SF", "F"]:
            if round_columns[rnd] != -1 and any(data[i][round_columns[rnd]] for i in range(2, len(data))):
                start_round = rnd
                break
        
        start_col = round_columns[start_round]
        matches = []
        match_number = 1
        
        for i in range(2, len(data), 2):
            player1 = data[i-1][start_col] if start_col < len(data[i-1]) else ""
            player2 = data[i][start_col] if start_col < len(data[i]) else ""
            if not player1 or not player2:
                continue
            score1 = " ".join(filter(None, data[i-1][start_col+1:start_col+6]))  # Следующие 5 колонок для счёта
            score2 = " ".join(filter(None, data[i][start_col+1:start_col+6]))
            score = f"{score1} vs {score2}" if score1 or score2 else None
            winner = None
            if score1 and score2:
                winner = player1 if len(score1.split()) > len(score2.split()) else player2
            matches.append({
                "round": start_round,
                "match_number": match_number,
                "player1": player1,
                "player2": player2,
                "score": score,
                "winner": winner
            })
            match_number += 1
        
        return matches
    except gspread.exceptions.WorksheetNotFound:
        return []
    
    