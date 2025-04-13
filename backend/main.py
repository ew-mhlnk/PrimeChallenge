from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import os
import logging
from init_data_py import InitData
from database.db import SessionLocal, engine
from database.models import Base, User, Tournament, Match, Pick, Status
from sheets import get_tournaments, get_tournament_matches
from pydantic import BaseModel
from typing import List

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://prime-challenge.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
if not BOT_TOKEN:
    logger.error("TELEGRAM_BOT_TOKEN not set")
    raise RuntimeError("TELEGRAM_BOT_TOKEN is required")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic модели
class TournamentResponse(BaseModel):
    id: int
    name: str
    dates: str
    status: str

class MatchResponse(BaseModel):
    id: int
    round: str
    match_number: int
    player1: str
    player2: str
    score: str | None
    winner: str | None

class PickRequest(BaseModel):
    match_id: int
    predicted_winner: str

@app.get("/")
def read_root():
    logger.info("Root endpoint accessed")
    return {"message": "Backend работает!"}

@app.post("/auth")
async def auth(request: Request, db: Session = Depends(get_db)):
    logger.info("Auth endpoint accessed")
    try:
        body = await request.json()
        logger.debug(f"Request body: {body}")
        init_data_raw = body.get("initData")
        if not init_data_raw:
            logger.error("No initData provided")
            raise HTTPException(status_code=400, detail="No initData provided")

        logger.info("Validating initData...")
        try:
            init_data = InitData.parse(init_data_raw)
            init_data.validate(BOT_TOKEN, lifetime=3600)
            logger.info("Init data validated successfully")
        except Exception as e:
            logger.error(f"Init data validation failed: {e}")
            raise HTTPException(status_code=403, detail="Invalid Telegram auth")

        user_data = init_data.user
        if not user_data:
            logger.error("User not found in initData")
            raise HTTPException(status_code=400, detail="User not found")

        user_id = user_data.id
        first_name = user_data.first_name
        logger.info(f"Authenticated user: {user_id}, {first_name}")

        existing = db.query(User).filter(User.user_id == user_id).first()
        if not existing:
            logger.info(f"Creating new user: {user_id}, {first_name}")
            db_user = User(user_id=user_id, first_name=first_name)
            db.add(db_user)
            db.commit()
            db.refresh(db_user)
        else:
            logger.info(f"User already exists: {user_id}")

        return {"status": "ok", "user_id": user_id}
    except Exception as e:
        logger.error(f"Unexpected error in auth endpoint: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/tournaments", response_model=List[TournamentResponse])
def get_all_tournaments(db: Session = Depends(get_db)):
    logger.info("Fetching tournaments")
    sheet_tournaments = get_tournaments()
    db_tournaments = []
    for t in sheet_tournaments:
        # Фильтр: только активные турниры
        if t["status"] != "Активен":
            logger.info(f"Skipping tournament {t['name']} with status {t['status']}")
            continue
        existing = db.query(Tournament).filter(Tournament.name == t["name"]).first()
        status_map = {
            "Активен": Status.ACTIVE,
            "Закрыт": Status.CLOSED,
            "Завершён": Status.COMPLETED
        }
        status = status_map.get(t["status"], Status.ACTIVE)
        if not existing:
            db_tournament = Tournament(
                name=t["name"],
                dates=t["dates"],
                status=status
            )
            db.add(db_tournament)
            db.commit()
            db.refresh(db_tournament)
        else:
            existing.dates = t["dates"]
            existing.status = status
            db.commit()
            db.refresh(existing)
            db_tournament = existing
        db_tournaments.append(db_tournament)
    return db_tournaments

@app.get("/tournaments/{tournament_id}/matches", response_model=List[MatchResponse])
def get_tournament_matches(tournament_id: int, db: Session = Depends(get_db)):
    logger.info(f"Fetching matches for tournament {tournament_id}")
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    sheet_matches = get_tournament_matches(tournament.name)
    db_matches = []
    for m in sheet_matches:
        existing = db.query(Match).filter(
            Match.tournament_id == tournament_id,
            Match.round == m["round"],
            Match.match_number == m["match_number"]
        ).first()
        if not existing:
            db_match = Match(
                tournament_id=tournament_id,
                round=m["round"],
                match_number=m["match_number"],
                player1=m["player1"],
                player2=m["player2"],
                score=m["score"],
                winner=m["winner"]
            )
            db.add(db_match)
            db.commit()
            db.refresh(db_match)
        else:
            existing.player1 = m["player1"]
            existing.player2 = m["player2"]
            existing.score = m["score"]
            existing.winner = m["winner"]
            db.commit()
            db.refresh(existing)
            db_match = existing
        db_matches.append(db_match)
    return db_matches

@app.post("/picks")
async def submit_pick(request: Request, db: Session = Depends(get_db)):
    logger.info("Submitting picks")
    body = await request.json()
    init_data_raw = body.get("initData")
    picks = body.get("picks", [])
    if not init_data_raw:
        raise HTTPException(status_code=400, detail="No initData provided")
    if not picks:
        raise HTTPException(status_code=400, detail="No picks provided")
    
    try:
        init_data = InitData.parse(init_data_raw)
        init_data.validate(BOT_TOKEN, lifetime=3600)
    except Exception as e:
        logger.error(f"Init data validation failed: {e}")
        raise HTTPException(status_code=403, detail="Invalid Telegram auth")
    
    user_data = init_data.user
    if not user_data:
        raise HTTPException(status_code=400, detail="User not found")
    
    user = db.query(User).filter(User.user_id == user_data.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    for pick in picks:
        match_id = pick.get("match_id")
        predicted_winner = pick.get("predicted_winner")
        match = db.query(Match).filter(Match.id == match_id).first()
        if not match:
            raise HTTPException(status_code=404, detail=f"Match {match_id} not found")
        
        existing_pick = db.query(Pick).filter(
            Pick.user_id == user.user_id,
            Pick.match_id == match_id
        ).first()
        if existing_pick:
            existing_pick.predicted_winner = predicted_winner
            db.commit()
            db.refresh(existing_pick)
        else:
            db_pick = Pick(
                user_id=user.user_id,
                match_id=match_id,
                predicted_winner=predicted_winner
            )
            db.add(db_pick)
            db.commit()
            db.refresh(db_pick)
    
    return {"status": "ok"}