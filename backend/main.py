from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import logging
from database.db import init_db, engine
from routers import auth, tournaments, picks
from services.sync_service import sync_google_sheets_with_db
from apscheduler.schedulers.asyncio import AsyncIOScheduler

# Настройка логгера
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI()

# === ИСПРАВЛЕННЫЙ CORS ===
# Браузеры блокируют запросы с cookies/auth, если стоит "*".
# Нужно указывать конкретные домены.
origins = [
    "http://localhost:3000",                # Локальная разработка
    "https://prime-challenge.vercel.app",   # Твой продакшн (Vercel)
    "https://primechallenge.onrender.com"   # На всякий случай (сам бэкенд)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, 
    allow_credentials=True, # Это разрешает передачу заголовков авторизации
    allow_methods=["*"],
    allow_headers=["*"],
)

# Логирование запросов
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"Received request: {request.method} {request.url}")
    try:
        response = await call_next(request)
        # logger.info(f"Response status: {response.status_code}")
        return response
    except Exception as e:
        logger.error(f"Request failed: {e}")
        raise e

# Подключение роутеров
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(tournaments.router, prefix="", tags=["tournaments"])
app.include_router(picks.router, prefix="/picks", tags=["picks"])

# Планировщик задач (синхронизация с Google Sheets)
scheduler = AsyncIOScheduler()

@app.on_event("startup")
async def startup_event():
    logger.info("Application startup")
    init_db()
    
    # Запускаем синхронизацию каждые 5 минут
    scheduler.add_job(sync_google_sheets_with_db, "interval", minutes=5, args=[engine])
    scheduler.start()
    
    logger.info("Scheduler started")

@app.get("/sync")
@app.post("/sync")
async def manual_sync():
    """Ручной запуск синхронизации для тестов"""
    await sync_google_sheets_with_db(engine)
    return {"message": "Sync completed successfully"}