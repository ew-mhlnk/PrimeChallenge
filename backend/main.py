# backend/main.py

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import logging
from database.db import init_db, engine
from routers import auth, tournaments, picks, users, leaderboard
from services.sync_service import sync_google_sheets_with_db
from apscheduler.schedulers.asyncio import AsyncIOScheduler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI()

# === CORS: Только доверенные источники ===
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

# Middleware для логирования всех запросов
@app.middleware("http")
async def log_requests(request: Request, call_next):
    origin = request.headers.get("origin")
    logger.info(f"Request from Origin: {origin} → {request.method} {request.url}")
    
    try:
        response = await call_next(request)
        return response
    except Exception as e:
        logger.error(f"Request failed: {e}")
        raise

# === ОСНОВНЫЕ РОУТЫ ===

@app.get("/")
async def root():
    return {"status": "ok", "service": "Prime Bracket Backend"}

@app.get("/ping")
async def ping():
    return {"message": "pong", "cors": "fixed"}

@app.get("/sync")
@app.post("/sync")
async def manual_sync():
    await sync_google_sheets_with_db(engine)
    return {"message": "Sync completed successfully"}

# === ПОДКЛЮЧЕНИЕ РОУТЕРОВ ===
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(tournaments.router, prefix="", tags=["tournaments"])
app.include_router(picks.router, prefix="/picks", tags=["picks"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(leaderboard.router, prefix="/leaderboard", tags=["leaderboard"])

# === ПЛАНИРОВЩИК ===
scheduler = AsyncIOScheduler()

@app.on_event("startup")
async def startup_event():
    logger.info("Application startup - CORS FIXED VERSION")
    init_db()
    scheduler.add_job(sync_google_sheets_with_db, "interval", minutes=5, args=[engine])
    scheduler.start()
    logger.info("Scheduler started")