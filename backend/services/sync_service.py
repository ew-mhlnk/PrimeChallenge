import logging
from sqlalchemy.orm import Session
from database.db import engine
from database import models

logger = logging.getLogger(__name__)

async def sync_google_sheets_with_db(engine):
    logger.info("Starting sync with Google Sheets")
    
    # Заглушка: замените на реальные данные из Google Sheets
    # В реальном проекте здесь будет вызов Google Sheets API
    tournaments_data = [
        ["id", "name", "dates", "status", "starting_round", "type", "active"],
        [1, "BMW Open", "25.04.2025 18:00 - 01.05.2025 19:00", "ACTIVE", "R32", "ATP", "true"]
    ]
    
    matches_data = {
        "BMW Open": [
            ["round", "match_number", "player1", "player2", "set1", "set2", "set3", "set4", "set5", "winner"],
            ["R32", 1, "А. Зверев (1)", "А. Мюллер", None, None, None, None, None, None]
        ]
    }

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
                tournament_id = int(tournament_data['id'])
                tournament = db.query(models.Tournament).filter(models.Tournament.id == tournament_id).first()

                if tournament:
                    tournament.name = tournament_data['name']
                    tournament.dates = tournament_data['dates']
                    tournament.status = tournament_data['status']
                    tournament.starting_round = tournament_data['starting_round']
                    tournament.type = tournament_data['type']
                    tournament.active = tournament_data['active'].lower() == 'true'
                    logger.info(f"Updated tournament {tournament_id}: {tournament_data['name']}")
                else:
                    new_tournament = models.Tournament(
                        id=tournament_id,
                        name=tournament_data['name'],
                        dates=tournament_data['dates'],
                        status=tournament_data['status'],
                        starting_round=tournament_data['starting_round'],
                        type=tournament_data['type'],
                        active=tournament_data['active'].lower() == 'true'
                    )
                    db.add(new_tournament)
                    logger.info(f"Added new tournament {tournament_id}: {tournament_data['name']}")

            db.commit()
    except Exception as e:
        logger.error(f"Error syncing tournaments: {str(e)}")
        raise

    # Шаг 2: Синхронизация матчей
    with Session(engine) as db:
        for tournament_row in rows:
            tournament_data = dict(zip(headers, tournament_row))
            tournament_id = int(tournament_data['id'])
            sheet_name = tournament_data['name']
            starting_round = tournament_data['starting_round']
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
                        match = db.query(models.TrueDraw).filter(
                            models.TrueDraw.tournament_id == tournament_id,
                            models.TrueDraw.round == match_data['round'],
                            models.TrueDraw.match_number == int(match_data['match_number'])
                        ).first()

                        if match:
                            match.player1 = match_data['player1']
                            match.player2 = match_data['player2']
                            match.set1 = match_data['set1']
                            match.set2 = match_data['set2']
                            match.set3 = match_data['set3']
                            match.set4 = match_data['set4']
                            match.set5 = match_data['set5']
                            match.winner = match_data['winner']
                        else:
                            new_match = models.TrueDraw(
                                tournament_id=tournament_id,
                                round=match_data['round'],
                                match_number=int(match_data['match_number']),
                                player1=match_data['player1'],
                                player2=match_data['player2'],
                                set1=match_data['set1'],
                                set2=match_data['set2'],
                                set3=match_data['set3'],
                                set4=match_data['set4'],
                                set5=match_data['set5'],
                                winner=match_data['winner']
                            )
                            db.add(new_match)

                db.commit()
                logger.info(f"Synced matches for tournament {tournament_id}: {sheet_name}")
            except Exception as e:
                logger.error(f"Error syncing sheet {sheet_name} for tournament {tournament_id}: {str(e)}")
                db.rollback()
                continue

    logger.info("Finished sync with Google Sheets successfully")