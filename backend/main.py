from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from database.db import init_db, engine
from routers import auth, tournaments, picks, users, leaderboard, daily

# СИНХРОНИЗАЦИЯ:
# 1. Читает из Гугл Таблицы в БД (И Daily, и Bracket)
from services.sync_service import sync_google_sheets_with_db, sync_daily_challenge
# 2. Пишет В Гугл Таблицу из API
from services.tennis_service import update_google_sheet_from_api, load_dictionary_from_sheets

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI()

origins = [
    "http://localhost:3000",
    "https://prime-challenge.vercel.app",
    "https://prime-challenge.vercel.app/",
    "https://primechallenge.onrender.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    try:
        response = await call_next(request)
        return response
    except Exception as e:
        logger.error(f"Request failed: {e}")
        raise

@app.get("/")
async def root():
    return {"status": "ok", "service": "Prime Bracket Backend"}

@app.get("/ping")
async def ping():
    return {"message": "pong"}

@app.get("/sync")
async def manual_sync():
    load_dictionary_from_sheets()
    # 1. API -> GSheet
    update_google_sheet_from_api() 
    # 2. GSheet -> DB
    await sync_google_sheets_with_db(engine)
    await sync_daily_challenge(engine)
    return {"message": "Full Sync Cycle triggered"}

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(tournaments.router, prefix="", tags=["tournaments"])
app.include_router(picks.router, prefix="/picks", tags=["picks"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(leaderboard.router, prefix="/leaderboard", tags=["leaderboard"])
app.include_router(daily.router, prefix="/daily", tags=["daily"])

scheduler = AsyncIOScheduler()

@app.on_event("startup")
async def startup_event():
    logger.info("Application startup")
    init_db()
    load_dictionary_from_sheets()
    
    # --- РАСПИСАНИЕ ---
    
    # 1. API -> Google Sheet (раз в 1 мин) - Это наш "Внутренний Парсер"
    scheduler.add_job(update_google_sheet_from_api, "interval", minutes=1)
    
    # 2. Google Sheet -> DB (раз в 1 мин) - Это забирает данные в базу
    scheduler.add_job(sync_daily_challenge, "interval", minutes=1, args=[engine])
    
    # 3. Bracket (раз в 5 мин)
    scheduler.add_job(sync_google_sheets_with_db, "interval", minutes=5, args=[engine])
    
    # 4. Dictionary (раз в час)
    scheduler.add_job(load_dictionary_from_sheets, "interval", minutes=60)
    
    scheduler.start()
    logger.info("Scheduler started: Full Cycle (API->Sheet->DB)")