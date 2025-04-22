import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database.db import engine, Base
from routers import tournaments, auth, picks, results
from services.sync_service import sync_google_sheets_with_db
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import asyncio

app = FastAPI()

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://prime-challenge.vercel.app"],  # Разрешаем запросы с фронтенда
    allow_credentials=True,
    allow_methods=["*"],  # Разрешаем все методы (GET, POST, OPTIONS и т.д.)
    allow_headers=["*"],  # Разрешаем все заголовки
)

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Подключаем маршруты
app.include_router(tournaments, prefix="/tournaments", tags=["tournaments"])  # Убрали .router
app.include_router(auth, prefix="/auth", tags=["auth"])  # Убрали .router
app.include_router(picks, prefix="/picks", tags=["picks"])  # Убрали .router
app.include_router(results, prefix="/results", tags=["results"])  # Убрали .router

# Инициализация базы данных
def init_db():
    Base.metadata.create_all(bind=engine)

# Планировщик для синхронизации
scheduler = AsyncIOScheduler()

@app.on_event("startup")
async def startup_event():
    logger.info("Application startup")
    init_db()
    scheduler.add_job(sync_google_sheets_with_db, "interval", minutes=5, args=[engine])
    scheduler.start()
    # Выполняем начальную синхронизацию
    await sync_google_sheets_with_db(engine)
    logger.info("Initial sync completed on startup")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down the application and scheduler")
    scheduler.shutdown()
    logger.info("Application shutdown complete")

@app.get("/sync")  # Добавили GET для удобства
@app.post("/sync")
async def manual_sync():
    await sync_google_sheets_with_db(engine)
    return {"message": "Sync completed successfully"}

@app.get("/")
async def root():
    return {"message": "Welcome to Prime Challenge API"}