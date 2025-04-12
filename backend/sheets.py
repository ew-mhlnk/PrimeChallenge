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
            "name": row["name"],
            "dates": row["dates"],
            "status": row["status"]
        }
        for row in data
    ]

def get_tournament_matches(tournament_name):
    client = get_sheets_client()
    try:
        sheet = client.open_by_key(os.getenv("GOOGLE_SHEET_ID")).worksheet(tournament_name)
        data = sheet.get_all_values()
        matches = []
        current_round = "R64"  # Турнир 500 начинается с R64
        match_number = 1
        for i in range(2, len(data), 2):  # Читаем пары строк
            player1 = data[i-1][6]  # Колонка G (R64)
            player2 = data[i][6]
            if not player1 or not player2:
                continue
            score1 = " ".join(filter(None, data[i-1][7:12]))  # Игнорируем пустые ячейки
            score2 = " ".join(filter(None, data[i][7:12]))
            score = f"{score1} vs {score2}" if score1 or score2 else None
            winner = None
            if score1 and score2:
                winner = player1 if len(score1.split()) > len(score2.split()) else player2
            matches.append({
                "round": current_round,
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