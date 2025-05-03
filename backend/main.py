from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
import asyncio
from database.db import init_db, engine  # Импорт функций и движка для работы с базой данных
from routers import auth, tournaments, picks, results  # Импорт маршрутов API
from services.sync_service import sync_google_sheets_with_db  # Импорт сервиса синхронизации с Google Sheets
from apscheduler.schedulers.asyncio import AsyncIOScheduler  # Импорт планировщика задач

# Настройка логирования для записи событий и ошибок
logging.basicConfig(
    level=logging.INFO,  # Уровень логирования (INFO и выше)
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",  # Формат сообщений логов
)
logger = logging.getLogger(__name__)  # Создание логгера с именем текущего модуля

# Инициализация FastAPI приложения
app = FastAPI()

# Добавление middleware для обработки CORS (кросс-доменных запросов)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://prime-challenge.vercel.app",  # Разрешённый домен фронтенда (Vercel)
        "https://primechallenge.onrender.com",  # Разрешённый домен фронтенда (Render)
        "http://localhost:3000",  # Локальный домен для разработки
    ],
    allow_credentials=True,  # Разрешить отправку куки и заголовков авторизации
    allow_methods=["*"],  # Разрешить все HTTP-методы (GET, POST, и т.д.)
    allow_headers=["*"],  # Разрешить все заголовки
)

# Подключение маршрутов API
app.include_router(auth.router, prefix="/auth", tags=["auth"])  # Маршруты для авторизации (например, /auth/login)
app.include_router(tournaments.router, prefix="", tags=["tournaments"])  # Маршруты для работы с турнирами (например, /tournament/{id})
app.include_router(picks.router, prefix="/picks", tags=["picks"])  # Маршруты для управления пиками (например, /picks/)
app.include_router(results.router, prefix="/results", tags=["results"])  # Маршруты для результатов (например, /results/)

# Создание планировщика задач для автоматической синхронизации
scheduler = AsyncIOScheduler()

@app.on_event("startup")
async def startup_event():
    """
    Выполняется при запуске приложения.
    Инициализирует базу данных и запускает планировщик для синхронизации с Google Sheets.
    """
    logger.info("Application startup")  # Логирование старта приложения
    init_db()  # Инициализация базы данных (создание таблиц, если их нет)
    scheduler.add_job(sync_google_sheets_with_db, "interval", minutes=5, args=[engine])  # Добавление задачи синхронизации каждые 5 минут
    scheduler.start()  # Запуск планировщика
    await sync_google_sheets_with_db(engine)  # Выполнение начальной синхронизации при запуске
    logger.info("Initial sync completed on startup")  # Логирование завершения начальной синхронизации

@app.get("/sync")
@app.post("/sync")
async def manual_sync():
    """
    Эндпоинт для ручной синхронизации данных с Google Sheets.
    Доступен через GET и POST запросы на /sync.
    """
    await sync_google_sheets_with_db(engine)  # Выполнение синхронизации
    return {"message": "Sync completed successfully"}  # Ответ об успешном выполнении