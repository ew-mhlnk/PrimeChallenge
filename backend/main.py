from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler

# Импорты базы данных
from database.db import init_db, engine

# Импорты Роутеров
from routers import auth, tournaments, picks, users, leaderboard, daily

# Импорты Сервисов Синхронизации
# 1. Bracket: Читаем из Гугл Таблицы (как и раньше)
from services.sync_service import sync_google_sheets_with_db
# 2. Daily: Внутренний парсер (API Tennis) + Загрузка словаря
from services.tennis_service import update_daily_matches_direct, load_dictionary_from_sheets

# Настройка логирования
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

# === MIDDLEWARE (Логирование запросов) ===
@app.middleware("http")
async def log_requests(request: Request, call_next):
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
    return {"message": "pong"}

# Ручной запуск синхронизации (на всякий случай)
@app.get("/sync")
async def manual_sync():
    # 1. Обновляем словарь имен
    load_dictionary_from_sheets()
    # 2. Запускаем турниры
    await sync_google_sheets_with_db(engine)
    # 3. Запускаем дейли (прямой API)
    update_daily_matches_direct() 
    return {"message": "All Syncs triggered"}

# === ПОДКЛЮЧЕНИЕ РОУТЕРОВ ===
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(tournaments.router, prefix="", tags=["tournaments"])
app.include_router(picks.router, prefix="/picks", tags=["picks"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(leaderboard.router, prefix="/leaderboard", tags=["leaderboard"])
app.include_router(daily.router, prefix="/daily", tags=["daily"])

# === ПЛАНИРОВЩИК (SCHEDULER) ===
scheduler = AsyncIOScheduler()

@app.on_event("startup")
async def startup_event():
    logger.info("Application startup")
    
    # 1. Инициализация таблиц БД
    init_db()
    
    # 2. Загружаем словарь имен из Гугл Таблицы при старте
    load_dictionary_from_sheets()
    
    # 3. Задача: Синхронизация Турниров (Bracket) из Google Sheets (раз в 5 минут)
    scheduler.add_job(sync_google_sheets_with_db, "interval", minutes=5, args=[engine])
    
    # 4. Задача: Обновление Daily Challenge напрямую из API Tennis (раз в 1 минуту)
    scheduler.add_job(update_daily_matches_direct, "interval", minutes=1)
    
    # 5. Задача: Обновление словаря имен (раз в 1 час)
    scheduler.add_job(load_dictionary_from_sheets, "interval", minutes=60)
    
    scheduler.start()
    logger.info("Scheduler started: Bracket + Daily API + Dictionary")