from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import logging
from database.db import init_db, engine
from routers import auth, tournaments, picks, users, leaderboard
# Импортируем ОБЕ функции синхронизации
from services.sync_service import sync_google_sheets_with_db, sync_daily_challenge
from apscheduler.schedulers.asyncio import AsyncIOScheduler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI()

# === CORS ===
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
    origin = request.headers.get("origin")
    # logger.info(f"Request from Origin: {origin} → {request.method} {request.url}")
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

# Обновленный ручной синк
@app.get("/sync")
@app.post("/sync")
async def manual_sync():
    # Запускаем синхронизацию турниров
    await sync_google_sheets_with_db(engine)
    # Запускаем синхронизацию дейли
    await sync_daily_challenge(engine)
    return {"message": "All Syncs completed successfully"}

# === ПОДКЛЮЧЕНИЕ РОУТЕРОВ ===
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(tournaments.router, prefix="", tags=["tournaments"])
app.include_router(picks.router, prefix="/picks", tags=["picks"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(leaderboard.router, prefix="/leaderboard", tags=["leaderboard"])
# NOTE: Роутер для Daily добавим в следующем шаге (Step 4), пока не подключаем

# === ПЛАНИРОВЩИК ===
scheduler = AsyncIOScheduler()

@app.on_event("startup")
async def startup_event():
    logger.info("Application startup")
    init_db()
    
    # Синхронизация турниров (каждые 5 минут)
    scheduler.add_job(sync_google_sheets_with_db, "interval", minutes=5, args=[engine])
    
    # Синхронизация Daily Challenge (каждую 1 минуту - для лайва)
    scheduler.add_job(sync_daily_challenge, "interval", minutes=1, args=[engine])
    
    scheduler.start()
    logger.info("Scheduler started with both jobs")