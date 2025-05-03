import logging
import json
import os
import gspread
from sqlalchemy import Engine, text
from oauth2client.service_account import ServiceAccountCredentials
from datetime import datetime
import pytz

# Настройка логгера для записи событий и ошибок
logger = logging.getLogger(__name__)

def get_google_sheets_client():
    """
    Создаёт клиент для работы с Google Sheets API.
    Использует учетные данные из переменной окружения GOOGLE_SHEETS_CREDENTIALS.
    Возвращает авторизованный объект gspread.client.Client.
    """
    scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]  # Область доступа для работы с таблицами и Google Drive
    credentials_json = os.getenv("GOOGLE_SHEETS_CREDENTIALS")  # Получение JSON-строки с учетными данными из окружения
    if not credentials_json:
        logger.error("GOOGLE_SHEETS_CREDENTIALS environment variable is not set")  # Логирование ошибки, если переменная отсутствует
        raise ValueError("GOOGLE_SHEETS_CREDENTIALS environment variable is not set")  # Выбрасывание исключения
    
    try:
        credentials_dict = json.loads(credentials_json)  # Парсинг JSON-строки в словарь
    except json.JSONDecodeError as e:
        logger.error(f"Invalid GOOGLE_SHEETS_CREDENTIALS JSON format: {str(e)}")  # Логирование ошибки парсинга
        raise ValueError(f"Invalid GOOGLE_SHEETS_CREDENTIALS JSON format: {str(e)}")  # Выбрасывание исключения
    
    credentials = ServiceAccountCredentials.from_json_keyfile_dict(credentials_dict, scope)  # Создание учетных данных
    return gspread.authorize(credentials)  # Авторизация и возврат клиента

def parse_datetime(date_str: str) -> datetime:
    """
    Парсит строку даты и времени в формат datetime.
    Ожидаемый формат: 'DD.MM.YYYY HH:MM' (например, '25.04.2025 18:00').
    Возвращает объект datetime с UTC-временной зоной.
    """
    if not date_str:
        logger.error("Date string is empty")  # Логирование ошибки, если строка пуста
        raise ValueError("Date string is empty")  # Выбрасывание исключения
    try:
        return datetime.strptime(date_str, "%d.%m.%Y %H:%M").replace(tzinfo=pytz.UTC)  # Парсинг и установка UTC
    except ValueError as e:
        logger.error(f"Invalid datetime format for {date_str}: time data '{date_str}' does not match format '%d.%m.%Y %H:%M'")  # Логирование ошибки формата
        raise  # Повторное выбрасывание исключения

async def sync_google_sheets_with_db(engine: Engine) -> None:
    """
    Синхронизирует данные из Google Sheets с базой данных.
    Использует движок SQLAlchemy для работы с БД и gspread для доступа к Google Sheets.
    Синхронизирует турниры из листа 'tournaments' и матчи из листов, указанных в поле 'List'.
    """
    logger.info("Starting sync with Google Sheets")  # Логирование начала синхронизации
    try:
        client = get_google_sheets_client()  # Получение клиента Google Sheets
    except Exception as e:
        logger.error(f"Fatal error during Google Sheets sync: {str(e)}")  # Логирование фатальной ошибки
        raise  # Повторное выбрасывание исключения

    google_sheet_id = os.getenv("GOOGLE_SHEET_ID")  # Получение ID таблицы из окружения
    if not google_sheet_id:
        logger.error("GOOGLE_SHEET_ID environment variable is not set")  # Логирование ошибки
        raise ValueError("GOOGLE_SHEET_ID environment variable is not set")  # Выбрасывание исключения

    try:
        sheet = client.open_by_key(google_sheet_id)  # Открытие таблицы по ID
    except gspread.exceptions.SpreadsheetNotFound:
        logger.error(f"Spreadsheet with ID {google_sheet_id} not found")  # Логирование ошибки, если таблица не найдена
        raise
    except Exception as e:
        logger.error(f"Error opening Google Sheet {google_sheet_id}: {str(e)}")  # Логирование других ошибок
        raise

    with engine.connect() as conn:  # Установка соединения с БД
        try:
            tournaments_worksheet = sheet.worksheet("tournaments")  # Получение листа 'tournaments'
        except gspread.exceptions.WorksheetNotFound:
            logger.error("Worksheet 'tournaments' not found")  # Логирование ошибки, если лист не найден
            raise

        tournament_data = tournaments_worksheet.get_all_values()  # Получение всех данных из листа
        if not tournament_data or len(tournament_data) < 2:  # Проверка наличия данных (заголовок + хотя бы одна строка)
            logger.info("No tournament data found in 'tournaments' worksheet")  # Логирование, если данных нет
            return

        expected_headers = ["ID", "Name", "Date", "Status", "List", "Starting Round", "Type", "Start", "Close", "Tag"]  # Ожидаемые заголовки
        headers = tournament_data[0]  # Заголовки из первой строки
        if headers != expected_headers:  # Проверка соответствия заголовков
            logger.error(f"Unexpected headers in 'tournaments' worksheet: {headers}")  # Логирование несоответствия
            raise ValueError(f"Expected headers {expected_headers}, but got {headers}")  # Выбрасывание исключения

        logger.info(f"Found {len(tournament_data) - 1} tournament rows in Google Sheets")  # Логирование количества строк

        existing_tournaments = conn.execute(text("SELECT id, status FROM tournaments")).fetchall()  # Получение существующих турниров
        existing_tournament_ids = {row[0] for row in existing_tournaments}  # Множество ID турниров
        existing_tournament_status = {row[0]: row[1] for row in existing_tournaments}  # Словарь ID -> статус
        logger.info(f"Existing tournaments in DB: {existing_tournament_ids}")  # Логирование существующих турниров

        current_time = datetime.now(pytz.UTC)  # Текущее время в UTC
        tournaments_to_sync = []  # Список турниров для синхронизации матчей
        new_tournament_ids = set()  # Множество новых ID турниров

        # Обработка каждой строки данных о турнирах
        for row in tournament_data[1:]:  # Пропускаем заголовки
            if len(row) < 10:  # Проверка на минимальное количество колонок
                logger.warning(f"Skipping incomplete row in 'tournaments': {row}")  # Логирование неполной строки
                continue

            with conn.begin_nested():  # Начинаем вложенную транзакцию
                try:
                    tournament_id = int(row[0])  # ID турнира
                    name = row[1]  # Название
                    dates = row[2]  # Даты
                    status = row[3].upper()  # Статус (в верхнем регистре)
                    sheet_name = row[4]  # Имя листа с матчами
                    starting_round = row[5]  # Начальный раунд
                    tournament_type = row[6]  # Тип турнира
                    start_time = row[7]  # Время начала
                    close_time = row[8]  # Время закрытия
                    tag = row[9]  # Тег

                    logger.info(f"Processing tournament {tournament_id}: {name}, status={status}, sheet_name={sheet_name}")  # Логирование обработки

                    new_tournament_ids.add(tournament_id)  # Добавление нового ID

                    if not start_time or not close_time:  # Проверка на пустые времена
                        logger.warning(f"Skipping tournament {tournament_id}: Start or Close time is empty (Start: '{start_time}', Close: '{close_time}')")  # Логирование предупреждения
                        continue

                    start_datetime = parse_datetime(start_time)  # Парсинг времени начала
                    close_datetime = parse_datetime(close_time)  # Парсинг времени закрытия

                    valid_statuses = {"ACTIVE", "CLOSED", "COMPLETED"}  # Допустимые статусы
                    if status not in valid_statuses:  # Проверка валидности статуса
                        logger.error(f"Invalid status for tournament {tournament_id}: {status}. Expected one of {valid_statuses}")  # Логирование ошибки
                        raise ValueError(f"Invalid status: {status}")  # Выбрасывание исключения
                    if current_time > close_datetime and status != "COMPLETED":  # Обновление статуса на основе времени
                        status = "COMPLETED"
                        logger.info(f"Tournament {tournament_id} status updated to COMPLETED based on close time {close_time}")
                    elif status == "ACTIVE" and current_time > start_datetime:
                        status = "CLOSED"
                        logger.info(f"Tournament {tournament_id} status updated to CLOSED based on start time {start_time}")

                    # Вставка или обновление записи о турнире в БД
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

                    # Добавление турнира в список для синхронизации матчей
                    if status in ["ACTIVE", "CLOSED"]:
                        tournaments_to_sync.append((tournament_id, sheet_name, starting_round))
                        logger.info(f"Added tournament {tournament_id} to sync list (status: {status})")
                    else:
                        logger.info(f"Skipping sync for tournament {tournament_id} as it is {status}")

                    logger.info(f"Synced tournament {tournament_id}: {name} in DB")  # Логирование успешной синхронизации
                except Exception as e:
                    logger.error(f"Error processing tournament row {row}: {str(e)}")  # Логирование ошибки
                    continue

        logger.info(f"Tournaments to sync true_draw: {tournaments_to_sync}")  # Логирование списка турниров для синхронизации

        # Синхронизация матчей из соответствующих листов
        for tournament_id, sheet_name, starting_round in tournaments_to_sync:
            try:
                with conn.begin_nested():  # Начинаем вложенную транзакцию
                    logger.info(f"Processing tournament {tournament_id} with sheet name {sheet_name}")  # Логирование обработки
                    worksheet = sheet.worksheet(sheet_name)  # Получение листа с матчами
                    data = worksheet.get_all_values()  # Получение всех данных листа
                    logger.info(f"Raw data from sheet {sheet_name}: {data}")  # Логирование сырых данных

                    if not data or len(data) < 2:  # Проверка наличия данных
                        logger.warning(f"No data found in sheet {sheet_name} for tournament {tournament_id}")  # Логирование предупреждения
                        continue

                    current_status = conn.execute(
                        text("SELECT status FROM tournaments WHERE id = :tournament_id"),
                        {"tournament_id": tournament_id}
                    ).scalar()  # Получение текущего статуса
                    if current_status == "COMPLETED":  # Пропуск, если турнир завершен
                        logger.info(f"Skipping sync of true_draw for tournament {tournament_id} as it is COMPLETED")
                        continue

                    # Получение существующих матчей
                    existing_matches = conn.execute(
                        text("""
                            SELECT round, match_number, player1, player2, winner
                            FROM true_draw
                            WHERE tournament_id = :tournament_id
                        """),
                        {"tournament_id": tournament_id}
                    ).fetchall()
                    existing_match_keys = {(row[0], row[1]) for row in existing_matches}  # Множество ключей существующих матчей
                    new_match_keys = set()  # Множество новых ключей

                    headers = data[0]  # Заголовки из первой строки
                    logger.info(f"Headers in sheet {sheet_name}: {headers}")  # Логирование заголовков
                    round_columns = {col_idx: header for col_idx, header in enumerate(headers) if header in ["R128", "R64", "R32", "R16", "QF", "SF", "F"]}  # Определение колонок раундов
                    if not round_columns:  # Проверка наличия раундов
                        logger.error(f"No valid round columns found in sheet {sheet_name}")  # Логирование ошибки
                        continue

                    champion = None  # Инициализация чемпиона
                    if len(headers) >= 43 and headers[42] == "Champion" and len(data) > 1:  # Проверка наличия колонки "Champion"
                        champion = data[1][42].strip() if data[1][42] else None  # Получение чемпиона
                        if champion:
                            logger.info(f"Tournament {tournament_id} has a champion: {champion}")  # Логирование чемпиона
                            conn.execute(
                                text("UPDATE tournaments SET status = 'COMPLETED' WHERE id = :tournament_id"),
                                {"tournament_id": tournament_id}
                            )  # Обновление статуса на COMPLETED
                            logger.info(f"Tournament {tournament_id} status updated to COMPLETED")  # Логирование обновления
                            continue

                    round_order = {"R128": 1, "R64": 2, "R32": 3, "R16": 4, "QF": 5, "SF": 6, "F": 7}  # Порядок раундов
                    starting_round_order = round_order.get(starting_round, 3)  # Порядок начального раунда (R32 по умолчанию)
                    logger.info(f"Starting round for tournament {tournament_id}: {starting_round}, order: {starting_round_order}")  # Логирование

                    matches_by_round = {"R128": [], "R64": [], "R32": [], "R16": [], "QF": [], "SF": [], "F": []}  # Словарь для матчей по раундам
                    row_idx = 1  # Индекс строки для обработки пар игроков
                    while row_idx < len(data) - 1:  # Обход пар строк (игрок 1 и игрок 2)
                        player1_row = data[row_idx]  # Строка первого игрока
                        player2_row = data[row_idx + 1]  # Строка второго игрока
                        logger.info(f"Processing row {row_idx}: {player1_row}, {player2_row}")  # Логирование обработки

                        for col_idx, round_name in round_columns.items():  # Обход колонок раундов
                            if round_order[round_name] < starting_round_order:  # Пропуск раундов до starting_round
                                logger.info(f"Skipping round {round_name} for tournament {tournament_id} (before starting round {starting_round})")
                                continue

                            player1 = player1_row[col_idx].strip() if col_idx < len(player1_row) else ""  # Имя первого игрока
                            player2 = player2_row[col_idx].strip() if col_idx < len(player2_row) else ""  # Имя второго игрока
                            logger.info(f"Checking match in {round_name}: player1='{player1}', player2='{player2}'")  # Логирование проверки
                            if not player1 or not player2:  # Пропуск, если игроки пустые
                                logger.warning(f"Skipping match in {round_name} #{match_number} due to empty player1 or player2")
                                continue

                            match_number = sum(1 for r in range(1, row_idx, 2) if col_idx < len(data[r]) and col_idx < len(data[r + 1]) and data[r][col_idx].strip() and data[r + 1][col_idx].strip()) + 1  # Номер матча
                            matches_by_round[round_name].append({
                                "match_number": match_number,
                                "player1": player1,
                                "player2": player2
                            })  # Добавление матча в словарь
                            logger.info(f"Added match {round_name} #{match_number}: {player1} vs {player2}")  # Логирование добавления

                            # Запись матча в true_draw
                            col_idx_sets = list(round_columns.keys())[list(round_columns.values()).index(round_name)]
                            player1_row_sets = data[row_idx] if row_idx < len(data) else [""]
                            player2_row_sets = data[row_idx + 1] if row_idx + 1 < len(data) else [""]
                            set1 = player1_row_sets[col_idx_sets + 1] if col_idx_sets + 1 < len(player1_row_sets) and player1_row_sets[col_idx_sets + 1] else None
                            set2 = player1_row_sets[col_idx_sets + 2] if col_idx_sets + 2 < len(player1_row_sets) and player1_row_sets[col_idx_sets + 2] else None
                            set3 = player1_row_sets[col_idx_sets + 3] if col_idx_sets + 3 < len(player1_row_sets) and player1_row_sets[col_idx_sets + 3] else None
                            set4 = player1_row_sets[col_idx_sets + 4] if col_idx_sets + 4 < len(player1_row_sets) and player1_row_sets[col_idx_sets + 4] else None
                            set5 = player1_row_sets[col_idx_sets + 5] if col_idx_sets + 5 < len(player1_row_sets) and player1_row_sets[col_idx_sets + 5] else None
                            winner = None  # Победитель пока не определен

                            new_match_keys.add((round_name, match_number))  # Добавление ключа нового матча
                            try:
                                result = conn.execute(
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
                                        RETURNING id
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
                                match_id = result.scalar_one()  # Получение ID добавленного/обновленного матча
                                logger.info(f"Synced match: {round_name} #{match_number} - {player1} vs {player2}, winner: {winner}, match_id: {match_id}")  # Логирование
                            except Exception as e:
                                logger.error(f"Error syncing match {round_name} #{match_number} into true_draw: {str(e)}")  # Логирование ошибки
                                continue

                            # Инициализация записей user_picks для активных пользователей
                            active_users = conn.execute(text("SELECT id FROM users WHERE status = 'ACTIVE'")).fetchall()  # Получение активных пользователей
                            if match_id:
                                for user in active_users:
                                    user_id = user[0]
                                    try:
                                        conn.execute(
                                            text("""
                                                INSERT INTO user_picks (user_id, tournament_id, match_id, predicted_winner)
                                                VALUES (:user_id, :tournament_id, :match_id, NULL)
                                                ON CONFLICT (user_id, tournament_id, match_id) DO NOTHING
                                            """),
                                            {
                                                "user_id": user_id,
                                                "tournament_id": tournament_id,
                                                "match_id": match_id
                                            }
                                        )
                                        logger.info(f"Initialized user_picks for user {user_id}, tournament {tournament_id}, match {match_id}")  # Логирование
                                    except Exception as e:
                                        logger.error(f"Error initializing user_picks for user {user_id}, tournament {tournament_id}, match {match_id}: {str(e)}")  # Логирование ошибки
                            else:
                                logger.error(f"Match not found in true_draw for tournament {tournament_id}, round {round_name}, match_number {match_number}")  # Логирование ошибки

                        row_idx += 2  # Переход к следующей паре строк

                    # Обновление победителей на основе следующего раунда
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
                            try:
                                result = conn.execute(
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
                                        RETURNING id
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
                                match_id = result.scalar_one()
                                logger.info(f"Synced match: {round_name} #{match_number} - {player1} vs {player2}, winner: {winner}, match_id: {match_id}")
                            except Exception as e:
                                logger.error(f"Error syncing match {round_name} #{match_number} into true_draw: {str(e)}")
                                continue

                    # Обработка финала
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

                        winner = champion if champion in [player1, player2] else None  # Определение победителя финала

                        new_match_keys.add(("F", match_number))
                        try:
                            result = conn.execute(
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
                                    RETURNING id
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
                            match_id = result.scalar_one()
                            logger.info(f"Synced match: F #{match_number} - {player1} vs {player2}, winner: {winner}, match_id: {match_id}")
                        except Exception as e:
                            logger.error(f"Error syncing match F #{match_number} into true_draw: {str(e)}")
                            continue

                    # Удаление устаревших матчей
                    matches_to_delete = existing_match_keys - new_match_keys  # Определение матчей для удаления
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
                        logger.info(f"Deleted match: {round} #{match_number} for tournament {tournament_id}")  # Логирование удаления

                    logger.info(f"Successfully synced sheet {sheet_name} for tournament {tournament_id}")  # Логирование успеха
            except Exception as e:
                logger.error(f"Error syncing sheet {sheet_name} for tournament {tournament_id}: {str(e)}")  # Логирование ошибки
                continue
        
        conn.commit()  # Подтверждение всех изменений в БД
        logger.info("Finished sync with Google Sheets successfully")  # Логирование завершения