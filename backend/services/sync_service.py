import logging
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert
from database.db import engine
from database import models
from datetime import datetime
import pytz

logger = logging.getLogger(__name__)

# Функция для парсинга даты из строки
def parse_date(date_str: str) -> datetime:
    return datetime.strptime(date_str, '%d.%m.%Y %H:%M').replace(tzinfo=pytz.UTC)

# Основная функция синхронизации
async def sync_google_sheets_with_db(engine):
    logger.info("Starting sync with Google Sheets")
    
    # Заглушка: данные из Google Sheets (замените на реальный код для Google Sheets API)
    tournaments_data = [
        ["ID", "Name", "Date", "Status", "List", "Starting Round", "Type", "Start", "Close", "Tag"],
        [1, "BMW Open", "25.04.2025 18:00 - 01.05.2025 19:00", "ACTIVE", "BMW Open", "R32", "ATP 250", "25.04.2025 18:00", "01.05.2025 19:00", "ATP"],
    ]
    
    matches_data = {
        "BMW Open": [
            ["round", "match_number", "player1", "player2", "set1", "set2", "set3", "set4", "set5", "winner"],
            ["R32", 1, "А. Зверев (1)", "А. Мюллер", None, None, None, None, None, "А. Зверев (1)"],
        ]
    }

    # Текущая дата для проверки статуса
    current_date = datetime.now(pytz.UTC)

    # Шаг 1: Синхронизация турниров
    try:
        if not tournaments_data:
            logger.warning("No tournament data found in Google Sheets")
            return

        headers = tournaments_data[0]
        rows = tournaments_data[1:]

        with Session(engine) as db:
            for row in rows:
                tournament_data = dict(zip(headers, row))
                tournament_id = int(tournament_data["ID"])
                tournament = db.query(models.Tournament).filter(models.Tournament.id == tournament_id).first()

                # Парсим даты начала и закрытия
                start_date = parse_date(tournament_data["Start"])
                close_date = parse_date(tournament_data["Close"])

                # Автоматически обновляем статус на основе дат
                if current_date > close_date:
                    status = models.TournamentStatus.COMPLETED
                elif current_date > start_date:
                    status = models.TournamentStatus.CLOSED
                else:
                    status = models.TournamentStatus.ACTIVE

                if tournament:
                    # Обновляем существующий турнир
                    tournament.name = tournament_data["Name"]
                    tournament.dates = tournament_data["Date"]
                    tournament.status = status
                    tournament.sheet_name = tournament_data["List"]
                    tournament.starting_round = tournament_data["Starting Round"]
                    tournament.type = tournament_data["Type"]
                    tournament.start = tournament_data["Start"]
                    tournament.close = tournament_data["Close"]
                    tournament.tag = tournament_data["Tag"]
                    logger.info(f"Updated tournament {tournament_id}: {tournament_data['Name']}")
                else:
                    # Создаем новый турнир
                    new_tournament = models.Tournament(
                        id=tournament_id,
                        name=tournament_data["Name"],
                        dates=tournament_data["Date"],
                        status=status,
                        sheet_name=tournament_data["List"],
                        starting_round=tournament_data["Starting Round"],
                        type=tournament_data["Type"],
                        start=tournament_data["Start"],
                        close=tournament_data["Close"],
                        tag=tournament_data["Tag"],
                    )
                    db.add(new_tournament)
                    logger.info(f"Added new tournament {tournament_id}: {tournament_data['Name']}")

            db.commit()
    except Exception as e:
        logger.error(f"Error syncing tournaments: {str(e)}")
        raise

    # Шаг 2: Синхронизация матчей
    with Session(engine) as db:
        for tournament_row in rows:
            tournament_data = dict(zip(headers, tournament_row))
            tournament_id = int(tournament_data["ID"])
            sheet_name = tournament_data["List"]
            starting_round = tournament_data["Starting Round"]
            logger.info(f"Processing tournament {tournament_id} with sheet name {sheet_name}")

            try:
                match_rows = matches_data.get(sheet_name, [])
                if not match_rows:
                    logger.warning(f"No match data found for sheet {sheet_name}")
                    continue

                match_headers = match_rows[0]
                match_rows = match_rows[1:]

                all_rounds = ["R128", "R64", "R32", "R16", "QF", "SF", "F"]
                start_idx = all_rounds.index(starting_round)

                for idx, round_name in enumerate(all_rounds):
                    if idx < start_idx:
                        logger.info(f"Skipping round {round_name} for tournament {tournament_id} (before starting round {starting_round})")
                        continue

                    round_matches = [row for row in match_rows if row[0] == round_name]
                    for match_row in round_matches:
                        match_data = dict(zip(match_headers, match_row))
                        # Используем ON CONFLICT для обновления или вставки матча
                        stmt = insert(models.TrueDraw).values(
                            tournament_id=tournament_id,
                            round=match_data["round"],
                            match_number=int(match_data["match_number"]),
                            player1=match_data["player1"],
                            player2=match_data["player2"],
                            set1=match_data["set1"],
                            set2=match_data["set2"],
                            set3=match_data["set3"],
                            set4=match_data["set4"],
                            set5=match_data["set5"],
                            winner=match_data["winner"],
                        ).on_conflict_do_update(
                            index_elements=["tournament_id", "round", "match_number"],
                            set_={
                                "player1": match_data["player1"],
                                "player2": match_data["player2"],
                                "set1": match_data["set1"],
                                "set2": match_data["set2"],
                                "set3": match_data["set3"],
                                "set4": match_data["set4"],
                                "set5": match_data["set5"],
                                "winner": match_data["winner"],
                            },
                        )
                        db.execute(stmt)

                db.commit()
                logger.info(f"Synced matches for tournament {tournament_id}: {sheet_name}")

                # Пересчитываем очки для всех пользователей турнира
                users = db.query(models.UserPick.user_id).filter(
                    models.UserPick.tournament_id == tournament_id
                ).distinct().all()
                for (user_id,) in users:
                    from routers.picks import calculate_user_scores
                    calculate_user_scores(tournament_id, user_id, db)

                # Обновляем лидерборд
                update_leaderboard(tournament_id, db)

            except Exception as e:
                logger.error(f"Error syncing sheet {sheet_name} for tournament {tournament_id}: {str(e)}")
                db.rollback()
                continue

    logger.info("Finished sync with Google Sheets successfully")

# Функция для обновления лидерборда
def update_leaderboard(tournament_id: int, db: Session):
    logger.info(f"Updating leaderboard for tournament_id={tournament_id}")
    
    # Получаем все записи user_scores для турнира
    scores = (
        db.query(models.UserScore)
        .filter(models.UserScore.tournament_id == tournament_id)
        .order_by(models.UserScore.score.desc(), models.UserScore.correct_picks.desc())
        .all()
    )

    # Удаляем старые записи лидерборда
    db.query(models.Leaderboard).filter(models.Leaderboard.tournament_id == tournament_id).delete()

    # Создаем новые записи
    for rank, score in enumerate(scores, 1):
        leaderboard_entry = models.Leaderboard(
            tournament_id=tournament_id,
            user_id=score.user_id,
            rank=rank,
            score=score.score,
            correct_picks=score.correct_picks,
        )
        db.add(leaderboard_entry)

    db.commit()
    logger.info(f"Leaderboard updated for tournament_id={tournament_id}")