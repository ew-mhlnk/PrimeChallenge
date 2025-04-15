import gspread
from oauth2client.service_account import ServiceAccountCredentials
from config import GOOGLE_SHEET_ID, GOOGLE_CREDENTIALS

scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
creds = ServiceAccountCredentials.from_json_keyfile_dict(GOOGLE_CREDENTIALS, scope)
client = gspread.authorize(creds)

def get_tournaments():
    sheet = client.open_by_key(GOOGLE_SHEET_ID).worksheet("tournaments")
    data = sheet.get_all_records()
    return [
        {
            "id": row["ID"],
            "name": row["Name"],
            "dates": row["Date"],
            "status": row["Status"],
            "starting_round": row["Starting Round"],
            "type": row["Type"]
        }
        for row in data
    ]

def get_tournament_matches(tournament_name: str):
    try:
        sheet = client.open_by_key(GOOGLE_SHEET_ID).worksheet(tournament_name)
        data = sheet.get_all_values()
        if not data:
            return []

        # Определяем границы раундов
        rounds = []
        current_round = None
        for col in range(len(data[0])):
            cell = data[0][col]
            if cell.startswith("R") or cell in ["QF", "SF", "F"]:
                if current_round:
                    rounds.append((current_round, start_col, col))
                current_round = cell
                start_col = col
        if current_round:
            rounds.append((current_round, start_col, len(data[0])))

        matches = []
        for round_name, start_col, end_col in rounds:
            match_number = 1
            row = 1
            while row < len(data):
                player1 = data[row][start_col] if row < len(data) else ""
                row += 1
                player2 = data[row][start_col] if row < len(data) else ""
                if not player1 or not player2:
                    break

                # Собираем счёт по сетам
                sets = []
                for col in range(start_col + 1, min(start_col + 6, end_col)):
                    score1 = data[row-1][col] if col < len(data[row-1]) else ""
                    score2 = data[row][col] if col < len(data[row]) else ""
                    if score1 and score2:
                        sets.append(f"{score1}:{score2}")

                # Определяем победителя
                winner = None
                if sets:
                    player1_wins = 0
                    player2_wins = 0
                    for s in sets:
                        s1, s2 = map(str.strip, s.split(":"))
                        s1_num = int(s1.split("(")[0]) if "(" in s1 else int(s1)
                        s2_num = int(s2.split("(")[0]) if "(" in s2 else int(s2)
                        if s1_num > s2_num:
                            player1_wins += 1
                        elif s2_num > s1_num:
                            player2_wins += 1
                    if player1_wins > player2_wins:
                        winner = player1
                    elif player2_wins > player1_wins:
                        winner = player2

                matches.append({
                    "round": round_name,
                    "match_number": match_number,
                    "player1": player1,
                    "player2": player2,
                    "sets": sets,  # Возвращаем счёт как список сетов
                    "winner": winner
                })
                match_number += 1
                row += 1

        return matches
    except gspread.WorksheetNotFound:
        return []