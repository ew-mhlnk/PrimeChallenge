import logging
from sqlalchemy.orm import Session
from database.db import SessionLocal
from database.models import Tournament, Match, Status, Pick, SyncLog
from datetime import datetime
from .sheets_service import get_tournaments, get_tournament_matches

logger = logging.getLogger(__name__)

def sync_google_sheets_with_db():
    logger.info("Starting Google Sheets synchronization with DB")
    db = SessionLocal()
    sync_status = "success"
    sync_message = None

    try:
        # 1. Синхронизация турниров
        sheet_tournaments = get_tournaments()
        db_tournaments = db.query(Tournament).all()
        db_tournament_names = {t.name for t in db_tournaments}

        status_map = {
            "ACTIVE": Status.ACTIVE,
            "CLOSED": Status.CLOSED,
            "COMPLETED": Status.COMPLETED
        }

        for t in sheet_tournaments:
            status = status_map.get(t["status"], Status.ACTIVE)
            existing = next((db_t for db_t in db_tournaments if db_t.name == t["name"]), None)

            if not existing:
                logger.info(f"Adding new tournament: {t['name']}")
                db_tournament = Tournament(
                    name=t["name"],
                    dates=t["dates"],
                    status=status,
                    starting_round=t["starting_round"],
                    type=t["type"]
                )
                db.add(db_tournament)
            else:
                if (existing.dates != t["dates"] or
                    existing.status != status or
                    existing.starting_round != t["starting_round"] or
                    existing.type != t["type"]):
                    logger.info(f"Updating tournament: {t['name']}")
                    existing.dates = t["dates"]
                    existing.status = status
                    existing.starting_round = t["starting_round"]
                    existing.type = t["type"]

        # Удаляем турниры, которых больше нет в Google Sheets
        for db_t in db_tournaments:
            if db_t.name not in {t["name"] for t in sheet_tournaments}:
                logger.info(f"Deleting tournament from DB: {db_t.name}")
                db.delete(db_t)

        db.commit()

        # 2. Синхронизация матчей для каждого турнира
        db_tournaments = db.query(Tournament).all()
        for tournament in db_tournaments:
            sheet_matches = get_tournament_matches(tournament.name)
            db_matches = db.query(Match).filter(Match.tournament_id == tournament.id).all()
            db_match_keys = {(m.round, m.match_number) for m in db_matches}

            for m in sheet_matches:
                match_key = (m["round"], m["match_number"])
                existing = next((db_m for db_m in db_matches if (db_m.round, db_m.match_number) == match_key), None)

                if not existing:
                    logger.info(f"Adding new match for tournament {tournament.name}: {m['round']} #{m['match_number']}")
                    db_match = Match(
                        tournament_id=tournament.id,
                        round=m["round"],
                        match_number=m["match_number"],
                        player1=m["player1"],
                        player2=m["player2"],
                        set1=m["sets"][0] if len(m["sets"]) > 0 else None,
                        set2=m["sets"][1] if len(m["sets"]) > 1 else None,
                        set3=m["sets"][2] if len(m["sets"]) > 2 else None,
                        set4=m["sets"][3] if len(m["sets"]) > 3 else None,
                        set5=m["sets"][4] if len(m["sets"]) > 4 else None,
                        winner=m.get("winner")
                    )
                    db.add(db_match)
                else:
                    # Проверяем, есть ли изменения
                    new_sets = m["sets"]
                    if (existing.player1 != m["player1"] or
                        existing.player2 != m["player2"] or
                        existing.set1 != (new_sets[0] if len(new_sets) > 0 else None) or
                        existing.set2 != (new_sets[1] if len(new_sets) > 1 else None) or
                        existing.set3 != (new_sets[2] if len(new_sets) > 2 else None) or
                        existing.set4 != (new_sets[3] if len(new_sets) > 3 else None) or
                        existing.set5 != (new_sets[4] if len(new_sets) > 4 else None) or
                        existing.winner != m.get("winner")):
                        logger.info(f"Updating match for tournament {tournament.name}: {m['round']} #{m['match_number']}")
                        existing.player1 = m["player1"]
                        existing.player2 = m["player2"]
                        existing.set1 = new_sets[0] if len(new_sets) > 0 else None
                        existing.set2 = new_sets[1] if len(new_sets) > 1 else None
                        existing.set3 = new_sets[2] if len(new_sets) > 2 else None
                        existing.set4 = new_sets[3] if len(new_sets) > 3 else None
                        existing.set5 = new_sets[4] if len(new_sets) > 4 else None
                        existing.winner = m.get("winner")

            # Удаляем матчи, которых больше нет в Google Sheets
            sheet_match_keys = {(m["round"], m["match_number"]) for m in sheet_matches}
            for db_m in db_matches:
                if (db_m.round, db_m.match_number) not in sheet_match_keys:
                    logger.info(f"Deleting match from DB for tournament {tournament.name}: {db_m.round} #{db_m.match_number}")
                    db.delete(db_m)

        db.commit()

        # 3. Подсчёт очков для пиков
        logger.info("Calculating points for user picks")
        matches_with_winner = db.query(Match).filter(Match.winner != None).all()
        for match in matches_with_winner:
            picks = db.query(Pick).filter(Pick.match_id == match.id).all()
            for pick in picks:
                if pick.predicted_winner == match.winner:
                    pick.points = 1
                    logger.info(f"User {pick.user_id} earned 1 point for match {match.id}")
                else:
                    pick.points = 0
                    logger.info(f"User {pick.user_id} earned 0 points for match {match.id}")

        db.commit()
        logger.info("Google Sheets synchronization and points calculation completed successfully")
    except Exception as e:
        logger.error(f"Error during Google Sheets synchronization: {e}")
        sync_status = "error"
        sync_message = str(e)
        db.rollback()
        raise
    finally:
        sync_log = SyncLog(
            timestamp=datetime.utcnow(),
            status=sync_status,
            message=sync_message
        )
        db.add(sync_log)
        db.commit()
        db.close()