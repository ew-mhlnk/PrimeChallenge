from database.db import SessionLocal
from database.models import Tournament, Match, Pick, SyncLog
from sqlalchemy import func
import logging
from .sheets_service import get_tournaments, get_tournament_matches

logger = logging.getLogger(__name__)

def calculate_points(match: Match, picks: list[Pick], tournament: Tournament):
    points_per_pick = 10
    if tournament.type == "Grand Slam":
        points_per_pick *= 2
    if match.round in ["SF", "F"]:
        points_per_pick *= 1.5
    
    for pick in picks:
        if pick.predicted_winner == match.winner:
            pick.points = points_per_pick
        else:
            pick.points = 0

def sync_google_sheets_with_db():
    logger.info("Starting Google Sheets synchronization with DB")
    db = SessionLocal()
    try:
        sheet_tournaments = get_tournaments()
        if not sheet_tournaments:
            logger.warning("No tournaments found in Google Sheets, skipping synchronization")
            return

        for tournament_data in sheet_tournaments:
            tournament_id = tournament_data.get('ID')
            if not tournament_id:
                continue

            db_tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
            if not db_tournament:
                db_tournament = Tournament(
                    id=tournament_id,
                    name=tournament_data.get('Name'),
                    dates=tournament_data.get('Dates'),
                    status=tournament_data.get('Status'),
                    starting_round=tournament_data.get('Starting Round'),
                    type=tournament_data.get('Type')
                )
                db.add(db_tournament)
            else:
                db_tournament.name = tournament_data.get('Name')
                db_tournament.dates = tournament_data.get('Dates')
                db_tournament.status = tournament_data.get('Status')
                db_tournament.starting_round = tournament_data.get('Starting Round')
                db_tournament.type = tournament_data.get('Type')

            matches = get_tournament_matches(db_tournament.name)
            if not matches:
                logger.warning(f"No matches found for tournament {db_tournament.name}")
                continue

            for match_data in matches:
                match_id = match_data.get('ID')
                if not match_id:
                    continue

                db_match = db.query(Match).filter(Match.id == match_id).first()
                if not db_match:
                    db_match = Match(
                        id=match_id,
                        tournament_id=tournament_id,
                        round=match_data.get('Round'),
                        match_number=match_data.get('Match Number'),
                        player1=match_data.get('Player1'),
                        player2=match_data.get('Player2'),
                        set1=match_data.get('set1'),
                        set2=match_data.get('set2'),
                        set3=match_data.get('set3'),
                        set4=match_data.get('set4'),
                        set5=match_data.get('set5'),
                        winner=match_data.get('Winner')
                    )
                    db.add(db_match)
                else:
                    db_match.round = match_data.get('Round')
                    db_match.match_number = match_data.get('Match Number')
                    db_match.player1 = match_data.get('Player1')
                    db_match.player2 = match_data.get('Player2')
                    db_match.set1 = match_data.get('set1')
                    db_match.set2 = match_data.get('set2')
                    db_match.set3 = match_data.get('set3')
                    db_match.set4 = match_data.get('set4')
                    db_match.set5 = match_data.get('set5')
                    db_match.winner = match_data.get('Winner')

                if db_match.winner:
                    picks = db.query(Pick).filter(Pick.match_id == db_match.id).all()
                    calculate_points(db_match, picks, db_tournament)

        db.commit()

        sync_log = SyncLog(last_sync=func.now())
        db.add(sync_log)
        db.commit()

        logger.info("Google Sheets synchronization and points calculation completed successfully")

    except Exception as e:
        logger.error(f"Error during Google Sheets synchronization: {str(e)}")
        db.rollback()
    finally:
        db.close()