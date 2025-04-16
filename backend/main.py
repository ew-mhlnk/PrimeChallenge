from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, tournaments  # Используем относительный импорт
from services.sync_service import sync_google_sheets_with_db
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler

app = FastAPI()

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://prime-challenge.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Подключаем роутеры
app.include_router(auth.router, prefix="/auth")
app.include_router(tournaments.router, prefix="/tournaments")

@app.on_event("startup")
async def startup_event():
    logger.info("Starting up the application and scheduler")
    scheduler = AsyncIOScheduler()
    scheduler.add_job(sync_google_sheets_with_db, "interval", minutes=5)
    scheduler.start()

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down the application and scheduler")

@app.get("/")
async def root():
    logger.info("Root endpoint accessed")
    return {"message": "Welcome to Prime Bracket Challenge API"}

@app.get("/sync")
async def manual_sync():
    logger.info("Manual sync triggered")
    sync_google_sheets_with_db()
    return {"message": "Sync completed"}