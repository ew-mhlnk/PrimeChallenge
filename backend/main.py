from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
import asyncio
from database.db import init_db, engine
from routers import auth, tournaments, picks, results
from services.sync_service import sync_google_sheets_with_db
from apscheduler.schedulers.asyncio import AsyncIOScheduler

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI()

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://prime-challenge.vercel.app",
        "https://primechallenge.onrender.com",
        "http://localhost:3000",  # Для локальной разработки
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключение маршрутов
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(tournaments.router, prefix="/tournaments", tags=["tournaments"])
app.include_router(picks.router, prefix="/picks", tags=["picks"])
app.include_router(results.router, prefix="/results", tags=["results"])

# Инициализация планировщика задач
scheduler = AsyncIOScheduler()

# Функция, выполняемая при запуске приложения
@app.on_event("startup")
async def startup_event():
    logger.info("Application startup")
    init_db()  # Инициализация базы данных
    # Добавляем задачу синхронизации каждые 5 минут
    scheduler.add_job(sync_google_sheets_with_db, "interval", minutes=5, args=[engine])
    scheduler.start()
    # Выполняем первоначальную синхронизацию
    await sync_google_sheets_with_db(engine)
    logger.info("Initial sync completed on startup")

# Эндпоинт для ручной синхронизации
@app.get("/sync")
@app.post("/sync")
async def manual_sync():
    await sync_google_sheets_with_db(engine)
    return {"message": "Sync completed successfully"}