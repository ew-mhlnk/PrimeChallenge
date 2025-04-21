import gspread
import os
import json
import logging
from oauth2client.service_account import ServiceAccountCredentials
from sqlalchemy.orm import Session
from database.models import Tournament, TrueDraw

logger = logging.getLogger(__name__)

def get_google_sheets_client():
    scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
    credentials_json = os.getenv("GOOGLE_SHEETS_CREDENTIALS")
    if not credentials_json:
        raise ValueError("GOOGLE_SHEETS_CREDENTIALS environment variable is not set")
    
    credentials_dict = json.loads(credentials_json)
    creds = ServiceAccountCredentials.from_json_keyfile_dict(credentials_dict, scope)
    return gspread.authorize(creds)

def sync_google_sheets_with_db(engine):
    logger.info("Starting sync with Google Sheets")
    try:
        client = get_google_sheets_client()

        with Session(engine) as db:
            # Удаляем старые записи TrueDraw перед синхронизацией
            db.query(TrueDraw).delete()
            db.commit()
            logger.info("Cleared old TrueDraw records")

            tournaments = db.query(Tournament).all()
            for tournament in tournaments:
                if not tournament.google_sheet_id:
                    logger.warning(f"Tournament {tournament.name} has no Google Sheet ID, skipping")
                    continue

                try:
                    # Открываем Google Sheet по ID
                    sheet = client.open_by_key(tournament.google_sheet_id)
                    logger.info(f"Opened Google Sheet for tournament {tournament.name}")

                    # Синхронизируем турниры (лист "tournaments")
                    try:
                        tournaments_sheet = sheet.worksheet("tournaments")
                    except gspread.exceptions.WorksheetNotFound:
                        logger.error(f"Worksheet 'tournaments' not found in sheet for tournament {tournament.name}")
                        continue

                    tournaments_data = tournaments_sheet.get_all_records()
                    for row in tournaments_data:
                        if row.get("ID") == tournament.id:
                            tournament.name = row.get("Name", tournament.name)
                            tournament.dates = row.get("Date", tournament.dates)
                            tournament.status = row.get("Status", tournament.status)
                            tournament.starting_round = row.get("Starting Round", tournament.starting_round)
                            tournament.type = row.get("Type", tournament.type)
                            tournament.start = row.get("Start", tournament.start)
                            db.commit()
                            logger.info(f"Updated tournament {tournament.name}")

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

                    # Парсим матчи для каждого раунда
                    for round_name in rounds:
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
                                # Победитель — это игрок, который указан в следующем раунде
                                next_player = all_values[row_idx // 2 + 1][next_start_idx].strip() if row_idx // 2 + 1 < len(all_values) and next_start_idx < len(all_values[row_idx // 2 + 1]) else ""
                                if next_player:
                                    if next_player == player1:
                                        winner = player1
                                    elif next_player == player2:
                                        winner = player2

                            # Сохраняем матч в TrueDraw
                            existing_match = db.query(TrueDraw).filter(
                                TrueDraw.tournament_id == tournament.id,
                                TrueDraw.round == round_name,
                                TrueDraw.match_number == match_number
                            ).first()

                            if existing_match:
                                existing_match.player1 = player1
                                existing_match.player2 = player2
                                existing_match.set1 = set1
                                existing_match.set2 = set2
                                existing_match.set3 = set3
                                existing_match.set4 = set4
                                existing_match.set5 = set5
                                existing_match.winner = winner
                                logger.info(f"Updated match {match_number} in round {round_name} for tournament {tournament.id}")
                            else:
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