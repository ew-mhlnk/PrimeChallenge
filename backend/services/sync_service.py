import logging
import json
import os
import gspread
from sqlalchemy import Engine, text
from oauth2client.service_account import ServiceAccountCredentials
from datetime import datetime
import pytz

# Настройка логгера
logger = logging.getLogger(__name__)

def get_google_sheets_client():
    """
    Создаёт клиент для работы с Google Sheets API.
    """
    scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
    credentials_json = os.getenv("GOOGLE_SHEETS_CREDENTIALS")
    if not credentials_json:
        logger.error("GOOGLE_SHEETS_CREDENTIALS environment variable is not set")
        raise ValueError("GOOGLE_SHEETS_CREDENTIALS environment variable is not set")
    
    try:
        credentials_dict = json.loads(credentials_json)
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON: {str(e)}")
        raise ValueError(f"Invalid JSON: {str(e)}")
    
    credentials = ServiceAccountCredentials.from_json_keyfile_dict(credentials_dict, scope)
    return gspread.authorize(credentials)

def parse_datetime(date_str: str) -> datetime:
    """
    Парсит дату. Поддерживает форматы с секундами и без.
    """
    if not date_str:
        return None
    try:
        # Пробуем с секундами
        return datetime.strptime(date_str, "%d.%m.%Y %H:%M:%S").replace(tzinfo=pytz.UTC)
    except ValueError:
        try:
            # Пробуем без секунд
            return datetime.strptime(date_str, "%d.%m.%Y %H:%M").replace(tzinfo=pytz.UTC)
        except ValueError:
            logger.error(f"Date parse error: {date_str}")
            raise

async def sync_google_sheets_with_db(engine: Engine) -> None:
    logger.info("Starting sync with Google Sheets")
    try:
        client = get_google_sheets_client()
        google_sheet_id = os.getenv("GOOGLE_SHEET_ID")
        sheet = client.open_by_key(google_sheet_id)
    except Exception as e:
        logger.error(f"Fatal error connecting to Google Sheets: {str(e)}")
        return

    with engine.connect() as conn:
        # 1. СИНХРОНИЗАЦИЯ СПИСКА ТУРНИРОВ
        try:
            tournaments_worksheet = sheet.worksheet("tournaments")
            tournament_data = tournaments_worksheet.get_all_values()
        except Exception as e:
            logger.error(f"Error reading 'tournaments' sheet: {e}")
            return

        if not tournament_data or len(tournament_data) < 2:
            return

        tournaments_to_sync = []
        current_time = datetime.now(pytz.UTC)

        # Пропускаем заголовок (row[0])
        for row in tournament_data[1:]:
            if len(row) < 10: continue

            with conn.begin_nested():
                try:
                    t_id = int(row[0])
                    name = row[1]
                    dates = row[2]
                    status = row[3].upper().strip()
                    sheet_name = row[4]
                    starting_round = row[5]
                    t_type = row[6]
                    start_str = row[7]
                    close_str = row[8]
                    tag = row[9]

                    # Проверка времени для авто-закрытия
                    if start_str:
                        try:
                            start_dt = parse_datetime(start_str)
                            if status == "ACTIVE" and current_time > start_dt:
                                status = "CLOSED"
                                logger.info(f"Tournament {t_id} auto-closed by time")
                        except Exception:
                            pass # Если дата кривая, оставляем статус как есть

                    conn.execute(
                        text("""
                            INSERT INTO tournaments (id, name, dates, status, sheet_name, starting_round, type, start, close, tag)
                            VALUES (:id, :name, :dates, :status, :sheet_name, :starting_round, :type, :start, :close, :tag)
                            ON CONFLICT (id) DO UPDATE
                            SET name = EXCLUDED.name, dates = EXCLUDED.dates, status = EXCLUDED.status,
                                sheet_name = EXCLUDED.sheet_name, starting_round = EXCLUDED.starting_round,
                                type = EXCLUDED.type, start = EXCLUDED.start, close = EXCLUDED.close, tag = EXCLUDED.tag
                        """),
                        {
                            "id": t_id, "name": name, "dates": dates, "status": status,
                            "sheet_name": sheet_name, "starting_round": starting_round,
                            "type": t_type, "start": start_str, "close": close_str, "tag": tag
                        }
                    )
                    
                    # Добавляем в очередь на синк матчей (ACTIVE, CLOSED и COMPLETED тоже, чтобы обновить чемпиона)
                    tournaments_to_sync.append((t_id, sheet_name, starting_round))

                except Exception as e:
                    logger.error(f"Error processing tournament row {row}: {e}")
                    continue
        
        conn.commit()

        # 2. СИНХРОНИЗАЦИЯ МАТЧЕЙ
        for t_id, sheet_name, starting_round in tournaments_to_sync:
            try:
                with conn.begin_nested():
                    try:
                        worksheet = sheet.worksheet(sheet_name)
                        data = worksheet.get_all_values()
                    except Exception:
                        logger.warning(f"Sheet '{sheet_name}' not found for tournament {t_id}")
                        continue

                    if len(data) < 2: continue

                    headers = data[0]
                    # Карта колонок: 'R32': 5 (индекс колонки)
                    round_cols = {i: h for i, h in enumerate(headers) if h in ["R128","R64","R32","R16","QF","SF","F"]}
                    
                    # === ПОИСК ЧЕМПИОНА ===
                    champion_name = None
                    # Обычно чемпион в колонке 42 ("Champion")
                    if len(headers) >= 43 and headers[42] == "Champion" and len(data) > 1:
                        val = data[1][42].strip()
                        if val: champion_name = val

                    # --- Парсинг матчей (старая логика) ---
                    row_idx = 1
                    while row_idx < len(data) - 1:
                        p1_row = data[row_idx]
                        p2_row = data[row_idx + 1]
                        
                        for col_idx, r_name in round_cols.items():
                            # Читаем имена
                            p1 = p1_row[col_idx].strip() if col_idx < len(p1_row) else ""
                            p2 = p2_row[col_idx].strip() if col_idx < len(p2_row) else ""
                            
                            if not p1 or not p2: continue

                            # Вычисляем номер матча
                            # (Логика: считаем заполненные пары выше текущей строки в этой колонке)
                            match_num = 1
                            for r in range(1, row_idx, 2):
                                if col_idx < len(data[r]) and data[r][col_idx].strip():
                                    match_num += 1
                            
                            # Определяем победителя
                            winner = None
                            # Смотрим следующий раунд
                            next_round_map = {"R128":"R64", "R64":"R32", "R32":"R16", "R16":"QF", "QF":"SF", "SF":"F"}
                            if r_name in next_round_map:
                                next_r = next_round_map[r_name]
                                # Ищем колонку следующего раунда
                                next_col = None
                                for nc, nr in round_cols.items():
                                    if nr == next_r: 
                                        next_col = nc; break
                                
                                if next_col:
                                    # В следующем раунде победитель будет в строке p1 или p2 (объединенная ячейка или одна из них)
                                    # Упрощенно: проверяем, есть ли имя победителя в след. колонке в этих же строках
                                    next_val1 = p1_row[next_col].strip() if next_col < len(p1_row) else ""
                                    next_val2 = p2_row[next_col].strip() if next_col < len(p2_row) else ""
                                    
                                    if next_val1 in [p1, p2]: winner = next_val1
                                    elif next_val2 in [p1, p2]: winner = next_val2
                            
                            # Для Финала победитель - это Чемпион
                            if r_name == "F" and champion_name and champion_name in [p1, p2]:
                                winner = champion_name

                            # Сохраняем матч
                            conn.execute(
                                text("""
                                    INSERT INTO true_draw (tournament_id, round, match_number, player1, player2, winner)
                                    VALUES (:tid, :rnd, :mn, :p1, :p2, :win)
                                    ON CONFLICT (tournament_id, round, match_number) DO UPDATE
                                    SET player1=EXCLUDED.player1, player2=EXCLUDED.player2, winner=EXCLUDED.winner
                                """),
                                {"tid": t_id, "rnd": r_name, "mn": match_num, "p1": p1, "p2": p2, "win": winner}
                            )

                        row_idx += 2

                    # === СОХРАНЕНИЕ РАУНДА CHAMPION ===
                    if champion_name:
                        conn.execute(
                            text("""
                                INSERT INTO true_draw (tournament_id, round, match_number, player1, player2, winner)
                                VALUES (:tid, 'Champion', 1, :name, NULL, :name)
                                ON CONFLICT (tournament_id, round, match_number) DO UPDATE
                                SET winner = EXCLUDED.winner, player1 = EXCLUDED.player1
                            """),
                            {"tid": t_id, "name": champion_name}
                        )
                        # Закрываем турнир, если есть чемпион
                        conn.execute(text("UPDATE tournaments SET status='COMPLETED' WHERE id=:id"), {"id": t_id})
                        logger.info(f"Tournament {t_id}: Champion set to {champion_name}")

            except Exception as e:
                logger.error(f"Sync error for tournament {t_id}: {e}")
                continue
        
        conn.commit()
        logger.info("Sync finished")