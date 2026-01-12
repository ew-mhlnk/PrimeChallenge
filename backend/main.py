from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler

# Импорты базы данных
from database.db import init_db, engine

# Импорты Роутеров
from routers import auth, tournaments, picks, users, leaderboard, daily

# Импорты Сервисов Синхронизации
# 1. Читают из Гугл Таблицы в БД (Bracket + Daily)
from services.sync_service import sync_google_sheets_with_db, sync_daily_challenge

# 2. Пишут В Гугл Таблицу из API (Парсер + Словарь)
from services.tennis_service import update_google_sheet_from_api, load_dictionary_from_sheets

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

# Ручной запуск синхронизации (Аварийная кнопка)
# Если внешний парсер упал, можно дернуть этот ручку, 
# и бэкенд сам обновит таблицу через update_google_sheet_from_api
@app.get("/sync")
async def manual_sync():
    logger.info("Manual Sync Triggered")
    # 1. API -> Sheet (Синхронно, может заблокировать на пару сек, но для ручного теста ок)
    update_google_sheet_from_api() 
    # 2. Sheet -> DB (Daily) - теперь асинхронно
    await sync_daily_challenge(engine)
    # 3. Sheet -> DB (Bracket) - теперь асинхронно
    await sync_google_sheets_with_db(engine)
    return {"message": "Sync started (Check Google Sheet & DB Logs)"}

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
    
    # 2. Загружаем словарь имен при старте (для корректной работы ручного синка)
    try:
        load_dictionary_from_sheets()
    except Exception as e:
        logger.error(f"Failed to load dictionary: {e}")
    
    # --- РАСПИСАНИЕ ЗАДАЧ ---
    
    # [ОТКЛЮЧЕНО] 3. Daily Parser (API -> Google Sheet)
    # Теперь это делает отдельный сервис parser_service.
    # scheduler.add_job(update_google_sheet_from_api, "interval", minutes=2)
    
    # 4. Daily Sync (Google Sheet -> DB)
    # Забираем данные из таблицы в базу раз в 2 минуты
    scheduler.add_job(sync_daily_challenge, "interval", minutes=2, args=[engine])
    
    # 5. Bracket Sync (Турниры)
    # Забираем данные турниров раз в 10 минут
    scheduler.add_job(sync_google_sheets_with_db, "interval", minutes=10, args=[engine])
    
    # [ОТКЛЮЧЕНО] 6. Dictionary Update
    # Внешний сервис теперь обновляет это для себя, а здесь обновлять не обязательно так часто
    # scheduler.add_job(load_dictionary_from_sheets, "interval", minutes=60)
    
    scheduler.start()
    logger.info("Scheduler started: Daily Sync(2min) + Bracket(10min). Parser disabled (external).")