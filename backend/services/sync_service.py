import logging
from sqlalchemy.orm import Session
from database.models import Tournament, TrueDraw
from services.sheets_service import get_tournaments, sync_tournament_matches

logger = logging.getLogger(__name__)

def sync_google_sheets_with_db(db: Session):
    logger.info("Starting Google Sheets synchronization with DB")

    # Синхронизация турниров
    tournaments_data = get_tournaments()
    if not tournaments_data:
        logger.error("No tournament data retrieved from Google Sheets")
        return

    for t_data in tournaments_data:
        tournament = db.query(Tournament).filter(Tournament.name == t_data['Tournament']).first()
        if not tournament:
            tournament = Tournament(
                name=t_data['Tournament'],
                dates=t_data.get('Dates'),
                status=t_data.get('Status'),
                starting_round=t_data.get('Starting Round'),
                type=t_data.get('Type'),
                start=t_data.get('Start'),
                google_sheet_id=t_data.get('List')
            )
            db.add(tournament)
            db.commit()
            db.refresh(tournament)
            logger.info(f"Added new tournament: {tournament.name}")
        else:
            tournament.dates = t_data.get('Dates')
            tournament.status = t_data.get('Status')
            tournament.starting_round = t_data.get('Starting Round')
            tournament.type = t_data.get('Type')
            tournament.start = t_data.get('Start')
            tournament.google_sheet_id = t_data.get('List')
            db.commit()
            logger.info(f"Updated tournament: {tournament.name}")

        # Синхронизация матчей для турнира
        if tournament.status != "CLOSED":
            matches = sync_tournament_matches(tournament.name)
            if matches:
                # Удаляем старые записи true_draw для этого турнира
                db.query(TrueDraw).filter(TrueDraw.tournament_id == tournament.id).delete()
                for match in matches:
                    true_draw = TrueDraw(
                        tournament_id=tournament.id,
                        round=match['Round'],
                        match_number=match['Match Number'],
                        player1=match['Player1'],
                        player2=match['Player2'],
                        winner=match['Winner'],
                        set1=match['set1'],
                        set2=match['set2'],
                        set3=match['set3'],
                        set4=match['set4'],
                        set5=match['set5']
                    )
                    db.add(true_draw)
                db.commit()
                logger.info(f"Synchronized {len(matches)} matches for tournament: {tournament.name}")
            else:
                logger.warning(f"No matches found for tournament: {tournament.name}")